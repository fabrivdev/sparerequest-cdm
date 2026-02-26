import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // ---- uploadStock ----
    if (action === 'uploadStock') {
      const { stockData, uploadedBy, fileName } = body;
      if (!stockData || !Array.isArray(stockData)) {
        return new Response(JSON.stringify({ error: 'Datos de stock inválidos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert stock data
      const { error } = await supabase
        .from('branch_stock')
        .upsert(stockData, { onConflict: 'brand,product_code,branch' });

      if (error) {
        console.error('Error upserting stock:', error);
        return new Response(JSON.stringify({ error: 'Error al cargar stock' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the upload
      await supabase.from('stock_upload_log').insert({
        uploaded_by: uploadedBy,
        file_name: fileName,
        upload_type: 'stock',
        records_count: stockData.length,
      });

      return new Response(JSON.stringify({ success: true, count: stockData.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- uploadSales ----
    if (action === 'uploadSales') {
      const { salesData, uploadedBy, fileName } = body;
      if (!salesData || !Array.isArray(salesData)) {
        return new Response(JSON.stringify({ error: 'Datos de ventas inválidos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('branch_sales')
        .upsert(salesData, { onConflict: 'brand,product_code,branch,year_month' });

      if (error) {
        console.error('Error upserting sales:', error);
        return new Response(JSON.stringify({ error: 'Error al cargar ventas' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('stock_upload_log').insert({
        uploaded_by: uploadedBy,
        file_name: fileName,
        upload_type: 'sales',
        records_count: salesData.length,
      });

      return new Response(JSON.stringify({ success: true, count: salesData.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- createTransfer ----
    if (action === 'createTransfer') {
      const { transfer, userName } = body;
      if (!transfer) {
        return new Response(JSON.stringify({ error: 'Datos de transferencia inválidos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newTransfer, error } = await supabase
        .from('transfers')
        .insert(transfer)
        .select()
        .single();

      if (error) {
        console.error('Error creating transfer:', error);
        return new Response(JSON.stringify({ error: 'Error al crear transferencia' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log initial status
      await supabase.from('transfer_status_log').insert({
        transfer_id: newTransfer.id,
        from_status: null,
        to_status: 'Pendiente',
        changed_by: transfer.requester_user_id,
        changed_by_name: userName || 'Usuario',
        observation: transfer.observation || null,
      });

      // Notify users in source branch about new transfer request
      try {
        const { data: sourceBranchUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('branch', transfer.source_branch);

        if (sourceBranchUsers && sourceBranchUsers.length > 0) {
          const notifs = sourceBranchUsers.map(u => ({
            user_id: u.user_id,
            type: 'transfer_request',
            title: 'Nueva solicitud de transferencia',
            message: `${transfer.requester_branch} solicita ${transfer.brand} ${transfer.product_code} desde tu sucursal.`,
            metadata: { transfer_id: newTransfer.id },
          }));
          await supabase.from('user_notifications').insert(notifs);
        }
      } catch (notifErr) {
        console.error('Error creating transfer notification:', notifErr);
      }

      return new Response(JSON.stringify({ success: true, transfer: newTransfer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- updateTransferStatus ----
    if (action === 'updateTransferStatus') {
      const { transferId, newStatus, userId, userName, observation, quantity, invoiceNumber, isInvoiced, notInvoicedReason } = body;

      if (!transferId || !newStatus || !userId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current transfer
      const { data: current, error: fetchErr } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchErr || !current) {
        return new Response(JSON.stringify({ error: 'Transferencia no encontrada' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build update
      const updateData: Record<string, any> = { status: newStatus };

      if (newStatus === 'Aceptada') {
        // Accept = Dispatch in one step
        updateData.status = 'Despachada';
        const qty = quantity || current.requested_quantity;
        updateData.approved_quantity = qty;
        updateData.dispatched_quantity = qty;
      } else if (newStatus === 'Despachada') {
        updateData.dispatched_quantity = quantity || current.approved_quantity || current.requested_quantity;
      } else if (newStatus === 'Recibida') {
        updateData.received_quantity = quantity;
        // Auto-close or incidence
        const dispatched = current.dispatched_quantity || current.approved_quantity || current.requested_quantity;
        if (quantity === dispatched) {
          updateData.status = 'Cerrada';
        } else {
          updateData.status = 'Incidencia';
        }
        // Save invoice data if provided
        if (isInvoiced !== undefined) updateData.is_invoiced = isInvoiced;
        if (invoiceNumber) updateData.invoice_number = invoiceNumber;
        if (notInvoicedReason) updateData.not_invoiced_reason = notInvoicedReason;
      }

      const { error: updateErr } = await supabase
        .from('transfers')
        .update(updateData)
        .eq('id', transferId);

      if (updateErr) {
        console.error('Error updating transfer:', updateErr);
        return new Response(JSON.stringify({ error: 'Error al actualizar transferencia' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log status change
      await supabase.from('transfer_status_log').insert({
        transfer_id: transferId,
        from_status: current.status,
        to_status: updateData.status,
        changed_by: userId,
        changed_by_name: userName || 'Usuario',
        observation: observation || null,
      });

      // Notify requester about dispatch
      try {
        const finalStatus = updateData.status;
        if (finalStatus === 'Despachada') {
          // Notify the requester that their transfer was dispatched
          await supabase.from('user_notifications').insert({
            user_id: current.requester_user_id,
            type: 'transfer_dispatched',
            title: 'Transferencia despachada',
            message: `El repuesto ${current.brand} ${current.product_code} fue despachado desde ${current.source_branch}.`,
            metadata: { transfer_id: transferId },
          });
        } else if (finalStatus === 'Rechazada') {
          await supabase.from('user_notifications').insert({
            user_id: current.requester_user_id,
            type: 'order_status_change',
            title: 'Transferencia rechazada',
            message: `Tu solicitud de ${current.brand} ${current.product_code} desde ${current.source_branch} fue rechazada.`,
            metadata: { transfer_id: transferId },
          });
        }
      } catch (notifErr) {
        console.error('Error creating transfer status notification:', notifErr);
      }

      return new Response(JSON.stringify({ success: true, newStatus: updateData.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- getTransfers ----
    if (action === 'getTransfers') {
      const { branch, status, userId, type } = body;

      let query = supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (type === 'sent' && userId) query = query.eq('requester_user_id', userId);
      if (type === 'received' && branch) query = query.eq('source_branch', branch);
      if (type === 'in_transit') query = query.in('status', ['Despachada']);
      if (type === 'closed') query = query.in('status', ['Cerrada', 'Rechazada', 'Cancelada', 'Incidencia']);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transfers:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener transferencias' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ transfers: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- getTransferDetail ----
    if (action === 'getTransferDetail') {
      const { transferId } = body;

      const [transferRes, logsRes] = await Promise.all([
        supabase.from('transfers').select('*').eq('id', transferId).single(),
        supabase.from('transfer_status_log').select('*').eq('transfer_id', transferId).order('created_at', { ascending: true }),
      ]);

      if (transferRes.error) {
        return new Response(JSON.stringify({ error: 'Transferencia no encontrada' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ transfer: transferRes.data, statusLog: logsRes.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- deleteTransfer ----
    if (action === 'deleteTransfer') {
      const { transferId, userId } = body;
      if (!transferId || !userId) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current transfer
      const { data: current, error: fetchErr } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchErr || !current) {
        return new Response(JSON.stringify({ error: 'Transferencia no encontrada' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only creator can delete, and only if still Pendiente
      if (current.requester_user_id !== userId) {
        return new Response(JSON.stringify({ error: 'Solo el creador puede eliminar la transferencia' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (current.status !== 'Pendiente') {
        return new Response(JSON.stringify({ error: 'Solo se pueden eliminar transferencias en estado Pendiente' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete status logs first
      await supabase.from('transfer_status_log').delete().eq('transfer_id', transferId);
      // Delete alerts
      await supabase.from('transfer_alerts').delete().eq('transfer_id', transferId);
      // Delete the transfer
      const { error: delErr } = await supabase.from('transfers').delete().eq('id', transferId);

      if (delErr) {
        console.error('Error deleting transfer:', delErr);
        return new Response(JSON.stringify({ error: 'Error al eliminar transferencia' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- getStock ----
    if (action === 'getStock') {
      const { brand, productCode, branch, offset: reqOffset, limit: reqLimit } = body;

      const internalBatch = 1000;
      const maxRecords = reqLimit || Infinity;
      const startOffset = reqOffset || 0;
      const allData: any[] = [];
      let offset = startOffset;

      while (true) {
        let query = supabase.from('branch_stock').select('*');
        if (brand) query = query.eq('brand', brand);
        if (productCode) query = query.ilike('product_code', `%${productCode}%`);
        if (branch) query = query.eq('branch', branch);

        const { data, error } = await query
          .order('brand')
          .order('product_code')
          .range(offset, offset + internalBatch - 1);

        if (error) {
          console.error('Error fetching stock batch:', error);
          return new Response(JSON.stringify({ error: 'Error al obtener stock' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (data && data.length > 0) {
          allData.push(...data);
          if (data.length < internalBatch) break;
          if (allData.length >= maxRecords) break;
          offset += internalBatch;
        } else {
          break;
        }
      }

      // Get last update directly from branch_stock
      const { data: lastRecord } = await supabase
        .from('branch_stock')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ stock: allData, lastUpdate: lastRecord?.updated_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- getSales ----
    if (action === 'getSales') {
      const { brand, productCode, branch, months } = body;
      const monthsBack = months || 12;

      // Calculate start year_month
      const now = new Date();
      now.setMonth(now.getMonth() - monthsBack);
      const startYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let query = supabase.from('branch_sales').select('*').gte('year_month', startYearMonth);
      if (brand) query = query.eq('brand', brand);
      if (productCode) query = query.ilike('product_code', `%${productCode}%`);
      if (branch) query = query.eq('branch', branch);

      const { data, error } = await query.order('year_month', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'Error al obtener ventas' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get last upload date
      const { data: lastUpload } = await supabase
        .from('stock_upload_log')
        .select('created_at')
        .eq('upload_type', 'sales')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ sales: data, lastUpdate: lastUpload?.created_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- checkDelayedTransfers ----
    if (action === 'checkDelayedTransfers') {
      const thresholds: Record<string, number> = {
        'Pendiente': 24,
        'Aceptada': 48,
        'Despachada': 72,
      };

      const alerts: any[] = [];
      for (const [status, hours] of Object.entries(thresholds)) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data: delayed } = await supabase
          .from('transfers')
          .select('id, brand, product_code, requester_branch, source_branch')
          .eq('status', status)
          .lt('updated_at', cutoff);

        if (delayed && delayed.length > 0) {
          for (const t of delayed) {
            alerts.push({
              transfer_id: t.id,
              alert_type: 'delayed',
              message: `Transferencia ${t.brand} ${t.product_code} (${t.requester_branch} → ${t.source_branch}) lleva más de ${hours}h en estado ${status}`,
            });
          }
        }
      }

      if (alerts.length > 0) {
        await supabase.from('transfer_alerts').upsert(alerts, { onConflict: 'transfer_id,alert_type' }).select();
      }

      return new Response(JSON.stringify({ success: true, alertsGenerated: alerts.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- adminDeleteTransfer ----
    if (action === 'adminDeleteTransfer') {
      const { transferId, password, reason } = body;
      if (!transferId || !password) {
        return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const adminPassword = Deno.env.get('ADMIN_PASSWORD');
      if (password !== adminPassword) {
        return new Response(JSON.stringify({ error: 'Contraseña de administrador incorrecta' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get transfer info before deleting
      const { data: current, error: fetchErr } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchErr || !current) {
        return new Response(JSON.stringify({ error: 'Transferencia no encontrada' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete related records
      await supabase.from('transfer_status_log').delete().eq('transfer_id', transferId);
      await supabase.from('transfer_alerts').delete().eq('transfer_id', transferId);

      // Delete the transfer
      const { error: delErr } = await supabase.from('transfers').delete().eq('id', transferId);

      if (delErr) {
        console.error('Error admin deleting transfer:', delErr);
        return new Response(JSON.stringify({ error: 'Error al eliminar transferencia' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Notify the requester
      try {
        const reasonText = reason ? ` Motivo: ${reason}` : '';
        await supabase.from('user_notifications').insert({
          user_id: current.requester_user_id,
          type: 'transfer_deleted',
          title: 'Transferencia eliminada por administrador',
          message: `Tu transferencia ${current.brand} ${current.product_code} (${current.source_branch} → ${current.requester_branch}) fue eliminada por el administrador.${reasonText}`,
          metadata: {},
        });
      } catch (notifErr) {
        console.error('Error creating admin delete notification:', notifErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Transfer operations error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
