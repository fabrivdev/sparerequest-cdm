import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/slack/api';
const SLACK_CHANNEL = '#nuevo-canal';

const sendSlackNotification = async (text: string) => {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('Slack notification skipped: LOVABLE_API_KEY is not configured');
      return;
    }

    if (!SLACK_API_KEY) {
      console.error('Slack notification skipped: SLACK_API_KEY is not configured');
      return;
    }

    const res = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': SLACK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text, username: 'CDM Desarmes', icon_emoji: ':wrench:' }),
    });

    const rawBody = await res.text();
    let parsedBody: any = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      parsedBody = { raw: rawBody };
    }

    if (!res.ok || parsedBody?.ok === false) {
      console.error(`Slack notification failed [${res.status}]: ${JSON.stringify(parsedBody)}`);
      return;
    }
  } catch (e) {
    console.error('Slack notification error:', e);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const checkPerm = async (perm: string): Promise<boolean> => {
      const { data } = await supabase.from('user_permissions').select('id').eq('user_id', userId).eq('permission', perm).maybeSingle();
      return !!data;
    };

    const getUserName = async (uid: string): Promise<string> => {
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', uid).maybeSingle();
      return data?.full_name || 'Usuario';
    };

    const logStatus = async (desarmeId: string, fromStatus: string | null, toStatus: string, changedBy: string, observation?: string) => {
      const name = await getUserName(changedBy);
      await supabase.from('desarme_status_log').insert({
        desarme_id: desarmeId, from_status: fromStatus, to_status: toStatus,
        changed_by: changedBy, changed_by_name: name, observation: observation || null,
      });
    };

    const body = await req.json();
    const { action } = body;

    // ===== CREATE DESARME =====
    if (action === 'createDesarme') {
      if (!(await checkPerm('crear_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para crear desarmes' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { brand, model, serial_number, client_name, branch, product_code, product_name, quantity, reason, is_urgent, salesperson } = body;
      if (!brand || !model || !serial_number || !client_name || !branch || !product_code || !quantity || !reason) {
        return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await supabase.from('desarmes').insert({
        created_by: userId, brand, model, serial_number, client_name, branch,
        product_code, product_name: product_name || null,
        quantity: parseInt(quantity), reason, is_urgent: !!is_urgent,
        salesperson: salesperson || null,
      }).select().single();
      if (error) {
        console.error('Error creating desarme:', error);
        return new Response(JSON.stringify({ error: 'Error al crear desarme' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await logStatus(data.id, null, 'pendiente_cotizacion', userId, 'Desarme creado');
      const creatorName = await getUserName(userId);
      sendSlackNotification(`:new: *Nuevo desarme ${data.desarme_number}* creado por ${creatorName}\n• ${brand} ${model} – Cliente: ${client_name}\n• Sucursal: ${branch} | Código: ${product_code}`);
      return new Response(JSON.stringify({ desarme: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== GET DESARMES =====
    if (action === 'getDesarmes') {
      if (!(await checkPerm('ver_desarmes'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { statusFilter, view } = body;
      let query = supabase.from('desarmes').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      if (view === 'cotizar') {
        query = supabase.from('desarmes').select('*').eq('status', 'pendiente_cotizacion').order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      } else if (view === 'autorizar') {
        query = supabase.from('desarmes').select('*').eq('status', 'pendiente_autorizacion').order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      } else if (view === 'tracking') {
        query = supabase.from('desarmes').select('*')
          .order('is_urgent', { ascending: false })
          .order('created_at', { ascending: true });
      }
      const { data, error } = await query;
      if (error) {
        return new Response(JSON.stringify({ error: 'Error al obtener desarmes' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userIds = [...new Set([
        ...data.map((d: any) => d.created_by),
        ...data.filter((d: any) => d.quoted_by).map((d: any) => d.quoted_by),
        ...data.filter((d: any) => d.authorized_by).map((d: any) => d.authorized_by),
      ])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name || 'Usuario'; });
      const enriched = data.map((d: any) => ({
        ...d,
        created_by_name: nameMap[d.created_by] || 'Usuario',
        quoted_by_name: d.quoted_by ? (nameMap[d.quoted_by] || 'Usuario') : null,
        authorized_by_name: d.authorized_by ? (nameMap[d.authorized_by] || 'Usuario') : null,
      }));
      return new Response(JSON.stringify({ desarmes: enriched }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== GET DESARME DETAIL =====
    if (action === 'getDesarmeDetail') {
      if (!(await checkPerm('ver_desarmes'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { desarmeId } = body;
      if (!desarmeId) return new Response(JSON.stringify({ error: 'Falta desarmeId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: desarme, error } = await supabase.from('desarmes').select('*').eq('id', desarmeId).single();
      if (error || !desarme) return new Response(JSON.stringify({ error: 'Desarme no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: logs } = await supabase.from('desarme_status_log').select('*').eq('desarme_id', desarmeId).order('created_at', { ascending: true });
      return new Response(JSON.stringify({ desarme, logs: logs || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== QUOTE DESARME =====
    if (action === 'quoteDesarme') {
      if (!(await checkPerm('cotizar_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para cotizar' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { desarmeId, quoted_value, quoted_deadline, quoted_shipping_method, quote_observations } = body;
      if (!desarmeId || quoted_value === undefined) return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: current } = await supabase.from('desarmes').select('status, desarme_number').eq('id', desarmeId).single();
      if (!current || current.status !== 'pendiente_cotizacion') return new Response(JSON.stringify({ error: 'El desarme no está pendiente de cotización' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error } = await supabase.from('desarmes').update({
        status: 'pendiente_autorizacion', quoted_value: parseFloat(quoted_value),
        quoted_deadline: quoted_deadline || null, quoted_shipping_method: quoted_shipping_method || null,
        quote_observations: quote_observations || null, quoted_by: userId, quoted_at: new Date().toISOString(),
      }).eq('id', desarmeId);
      if (error) return new Response(JSON.stringify({ error: 'Error al cotizar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await logStatus(desarmeId, 'pendiente_cotizacion', 'pendiente_autorizacion', userId, `Cotizado: $${quoted_value}`);
      const quoterName = await getUserName(userId);
      sendSlackNotification(`:moneybag: *${current.desarme_number} cotizado* por ${quoterName}\n• Valor: $${quoted_value}${quoted_deadline ? ` | Plazo: ${quoted_deadline}` : ''}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== AUTHORIZE DESARME =====
    if (action === 'authorizeDesarme') {
      if (!(await checkPerm('autorizar_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para autorizar' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { desarmeId } = body;
      if (!desarmeId) return new Response(JSON.stringify({ error: 'Falta desarmeId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: current } = await supabase.from('desarmes').select('status, quoted_by, desarme_number, created_by').eq('id', desarmeId).single();
      if (!current || current.status !== 'pendiente_autorizacion') return new Response(JSON.stringify({ error: 'El desarme no está pendiente de autorización' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error } = await supabase.from('desarmes').update({ status: 'aprobado', authorized_by: userId, authorized_at: new Date().toISOString() }).eq('id', desarmeId);
      if (error) return new Response(JSON.stringify({ error: 'Error al autorizar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await logStatus(desarmeId, 'pendiente_autorizacion', 'aprobado', userId, 'Aprobado');

      // Notify quoter
      if (current.quoted_by) {
        await supabase.from('user_notifications').insert({
          user_id: current.quoted_by,
          type: 'desarme_approved',
          title: 'Desarme aprobado',
          message: `Tu cotización ${current.desarme_number} fue aprobada`,
          metadata: { desarme_id: desarmeId },
        });
      }

      // Notify creator that they can generate the order
      if (current.created_by) {
        await supabase.from('user_notifications').insert({
          user_id: current.created_by,
          type: 'desarme_ready_for_order',
          title: 'Generar pedido',
          message: `El desarme ${current.desarme_number} fue aprobado. Ya puedes generar el pedido.`,
          metadata: { desarme_id: desarmeId },
        });
      }

      const authorizerName = await getUserName(userId);
      sendSlackNotification(`:white_check_mark: *${current.desarme_number} aprobado* por ${authorizerName}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== REJECT DESARME =====
    if (action === 'rejectDesarme') {
      if (!(await checkPerm('autorizar_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para rechazar' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { desarmeId, rejection_reason } = body;
      if (!desarmeId || !rejection_reason) return new Response(JSON.stringify({ error: 'El motivo de rechazo es obligatorio' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: current } = await supabase.from('desarmes').select('status, quoted_by, desarme_number').eq('id', desarmeId).single();
      if (!current || !['pendiente_cotizacion', 'pendiente_autorizacion'].includes(current.status)) return new Response(JSON.stringify({ error: 'El desarme no puede ser rechazado en su estado actual' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error } = await supabase.from('desarmes').update({ status: 'rechazado', rejection_reason, authorized_by: userId, authorized_at: new Date().toISOString() }).eq('id', desarmeId);
      if (error) return new Response(JSON.stringify({ error: 'Error al rechazar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await logStatus(desarmeId, current.status, 'rechazado', userId, `Rechazado: ${rejection_reason}`);

      // Notify quoter
      if (current.quoted_by) {
        await supabase.from('user_notifications').insert({
          user_id: current.quoted_by,
          type: 'desarme_rejected',
          title: 'Desarme rechazado',
          message: `Tu cotización ${current.desarme_number} fue rechazada: ${rejection_reason}`,
          metadata: { desarme_id: desarmeId },
        });
      }

      const rejecterName = await getUserName(userId);
      sendSlackNotification(`:x: *${current.desarme_number} rechazado* por ${rejecterName}\n• Motivo: ${rejection_reason}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== GENERATE ORDER =====
    if (action === 'generateOrder') {
      const { desarmeId } = body;
      if (!desarmeId) return new Response(JSON.stringify({ error: 'Falta desarmeId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: desarme } = await supabase.from('desarmes').select('*').eq('id', desarmeId).single();
      if (!desarme || desarme.status !== 'aprobado') return new Response(JSON.stringify({ error: 'El desarme debe estar aprobado para generar pedido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const observation = `Generado desde Desarme Nº ${desarme.desarme_number} – Serie ${desarme.serial_number} – Cliente ${desarme.client_name}`;
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: desarme.created_by, brand: desarme.brand, product_code: desarme.product_code,
        quantity: desarme.quantity, branch_destination: desarme.branch,
        shipping_method: desarme.quoted_shipping_method || 'aereo', observation, status: 'pending', order_destination: 'cliente',
      }).select().single();
      if (orderError) return new Response(JSON.stringify({ error: 'Error al generar pedido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await supabase.from('desarmes').update({ status: 'pedido_generado', linked_order_id: order.id }).eq('id', desarmeId);
      await logStatus(desarmeId, 'aprobado', 'pedido_generado', userId, `Pedido generado: ${order.id}`);
      const orderCreatorName = await getUserName(userId);
      sendSlackNotification(`:package: *Pedido generado* para ${desarme.desarme_number} por ${orderCreatorName}\n• ${desarme.brand} ${desarme.product_code} – Cliente: ${desarme.client_name}`);
      return new Response(JSON.stringify({ success: true, order }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== UPDATE DESARME STATUS =====
    if (action === 'updateDesarmeStatus') {
      if (!(await checkPerm('seguimiento_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para seguimiento' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { desarmeId, newStatus, observation, service_order_number } = body;
      if (!desarmeId || !newStatus) return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const validStatuses = ['recibido', 'maquina_rearmada', 'cerrado'];
      if (!validStatuses.includes(newStatus)) return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Require service_order_number when closing
      if (newStatus === 'cerrado' && !service_order_number) {
        return new Response(JSON.stringify({ error: 'El Nro. de Orden de Servicio es obligatorio para cerrar el desarme' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: current } = await supabase.from('desarmes').select('status, desarme_number').eq('id', desarmeId).single();
      if (!current) return new Response(JSON.stringify({ error: 'Desarme no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'maquina_rearmada') updateData.reassembled_at = new Date().toISOString();
      if (newStatus === 'cerrado') {
        updateData.closed_at = new Date().toISOString();
        updateData.service_order_number = service_order_number;
      }
      const { error } = await supabase.from('desarmes').update(updateData).eq('id', desarmeId);
      if (error) return new Response(JSON.stringify({ error: 'Error al actualizar estado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await logStatus(desarmeId, current.status, newStatus, userId, observation || null);

      // Notify creator when desarme reaches 'recibido'
      if (newStatus === 'recibido') {
        const { data: desarmeData } = await supabase.from('desarmes').select('created_by, desarme_number').eq('id', desarmeId).single();
        if (desarmeData) {
          await supabase.from('user_notifications').insert({
            user_id: desarmeData.created_by,
            type: 'desarme_recibido',
            title: 'Repuesto recibido',
            message: `El repuesto del desarme ${desarmeData.desarme_number} fue recibido. Procede con el rearmado.`,
            metadata: { desarme_id: desarmeId },
          });
        }
      }

      const statusLabels: Record<string, string> = { recibido: 'Recibido', maquina_rearmada: 'Máquina Rearmada', cerrado: 'Cerrado' };
      const statusEmojis: Record<string, string> = { recibido: ':inbox_tray:', maquina_rearmada: ':gear:', cerrado: ':lock:' };
      const trackerName = await getUserName(userId);
      sendSlackNotification(`${statusEmojis[newStatus] || ':arrows_counterclockwise:'} *${current.desarme_number} → ${statusLabels[newStatus] || newStatus}* por ${trackerName}${observation ? `\n• ${observation}` : ''}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== GET TRACKING =====
    if (action === 'getDesarmeTracking') {
      if (!(await checkPerm('seguimiento_desarme'))) {
        return new Response(JSON.stringify({ error: 'Sin permiso para seguimiento' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await supabase.from('desarmes').select('*')
        .not('status', 'in', '("rechazado","cerrado","pendiente_cotizacion","pendiente_autorizacion")')
        .order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      if (error) return new Response(JSON.stringify({ error: 'Error al obtener seguimiento' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const orderIds = data.filter((d: any) => d.linked_order_id).map((d: any) => d.linked_order_id);
      let orderStatusMap: Record<string, any> = {};
      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from('orders').select('id, status, order_number, estimated_delivery_date').in('id', orderIds);
        orders?.forEach((o: any) => { orderStatusMap[o.id] = o; });
      }
      const enriched = data.map((d: any) => ({
        ...d,
        days_disassembled: Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        linked_order: d.linked_order_id ? (orderStatusMap[d.linked_order_id] || null) : null,
      }));
      return new Response(JSON.stringify({ tracking: enriched }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
