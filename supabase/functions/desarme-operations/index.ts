import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/slack/api';
const SLACK_CHANNEL = '#nuevo-canal';
const SLACK_CHANNEL_ID_REGEX = /^[CGDZ][A-Z0-9]{8,}$/;
// ── CSV helper ──────────────────────────────────────────────────────────
const csvEscape = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildCSV = (desarme: any, action: string, emails: Record<string, string>, names: Record<string, string>): string => {
  const headers = [
    'Numero de Desarme','Accion','Fecha',
    'Marca','Modelo','Numero de Serie','Cliente','Sucursal',
    'Codigo de Producto','Nombre de Producto','Cantidad','Motivo',
    'Es Urgente','Vendedor','Estado Actual',
    'Valor Cotizado','Plazo','Metodo de Envio','Observaciones Cotizacion',
    'Motivo de Rechazo','Nro Orden de Servicio',
    'Email Creador','Nombre Creador',
    'Email Cotizador','Nombre Cotizador',
    'Email Autorizador','Nombre Autorizador',
  ];
  const row = [
    desarme.desarme_number, action, new Date().toISOString(),
    desarme.brand, desarme.model, desarme.serial_number, desarme.client_name, desarme.branch,
    desarme.product_code, desarme.product_name, desarme.quantity, desarme.reason,
    desarme.is_urgent ? 'Si' : 'No', desarme.salesperson, desarme.status,
    desarme.quoted_value, desarme.quoted_deadline, desarme.quoted_shipping_method, desarme.quote_observations,
    desarme.rejection_reason, desarme.service_order_number,
    emails.creator || '', names.creator || '',
    emails.quoter || '', names.quoter || '',
    emails.authorizer || '', names.authorizer || '',
  ];
  return headers.map(csvEscape).join(',') + '\n' + row.map(csvEscape).join(',') + '\n';
};

// ── Slack helpers ───────────────────────────────────────────────────────
const resolveSlackChannelId = async (
  channelRef: string,
  gatewayHeaders: Record<string, string>
): Promise<string | null> => {
  if (SLACK_CHANNEL_ID_REGEX.test(channelRef)) return channelRef;

  const targetChannelName = channelRef.replace(/^#/, '').trim().toLowerCase();
  let cursor = '';

  do {
    const params = new URLSearchParams();
    params.set('exclude_archived', 'true');
    params.set('limit', '200');
    params.set('types', 'public_channel,private_channel');
    if (cursor) params.set('cursor', cursor);

    const listRes = await fetch(`${GATEWAY_URL}/conversations.list?${params.toString()}`, {
      method: 'GET',
      headers: gatewayHeaders,
    });
    const listData = await listRes.json();

    if (!listData.ok) {
      console.error('Slack conversations.list failed:', JSON.stringify(listData));
      return null;
    }

    const match = (listData.channels || []).find((c: any) => (c?.name || '').toLowerCase() === targetChannelName);
    if (match?.id) return match.id;

    cursor = listData.response_metadata?.next_cursor || '';
  } while (cursor);

  return null;
};

// ── Slack CSV upload ────────────────────────────────────────────────────
const sendSlackCSV = async (desarme: any, supabase: any, action: string) => {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');
    if (!LOVABLE_API_KEY) { console.error('Slack CSV skipped: LOVABLE_API_KEY not configured'); return; }
    if (!SLACK_API_KEY) { console.error('Slack CSV skipped: SLACK_API_KEY not configured'); return; }

    // Gather emails from auth.users
    const userIds = [desarme.created_by, desarme.quoted_by, desarme.authorized_by].filter(Boolean);
    const emailMap: Record<string, string> = {};
    for (const uid of userIds) {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data?.user?.email) emailMap[uid] = data.user.email;
    }

    // Gather names from profiles
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
    const nameMap: Record<string, string> = {};
    profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name || 'Usuario'; });

    const emails = {
      creator: emailMap[desarme.created_by] || '',
      quoter: desarme.quoted_by ? (emailMap[desarme.quoted_by] || '') : '',
      authorizer: desarme.authorized_by ? (emailMap[desarme.authorized_by] || '') : '',
    };
    const names = {
      creator: nameMap[desarme.created_by] || 'Usuario',
      quoter: desarme.quoted_by ? (nameMap[desarme.quoted_by] || '') : '',
      authorizer: desarme.authorized_by ? (nameMap[desarme.authorized_by] || '') : '',
    };

    const csvContent = buildCSV(desarme, action, emails, names);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${desarme.desarme_number}_${action}_${today}.csv`;

    const gatewayHeaders = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': SLACK_API_KEY,
    };

    const csvBytes = new TextEncoder().encode(csvContent);

    // Step 1: Get upload URL (form-urlencoded)
    const uploadParams = new URLSearchParams();
    uploadParams.set('filename', filename);
    uploadParams.set('length', String(csvBytes.length));

    const uploadUrlRes = await fetch(`${GATEWAY_URL}/files.getUploadURLExternal`, {
      method: 'POST',
      headers: { ...gatewayHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: uploadParams.toString(),
    });
    const uploadUrlData = await uploadUrlRes.json();
    if (!uploadUrlData.ok) {
      console.error('Slack getUploadURLExternal failed:', JSON.stringify(uploadUrlData));
      return;
    }

    // Step 2: Upload file content
    const putRes = await fetch(uploadUrlData.upload_url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csvContent,
    });
    if (!putRes.ok) {
      console.error(`Slack file upload PUT failed [${putRes.status}]`);
      return;
    }

    const channelId = await resolveSlackChannelId(SLACK_CHANNEL, gatewayHeaders);
    if (!channelId) {
      console.error(`Slack channel not found or not accessible: ${SLACK_CHANNEL}`);
      return;
    }

    // Step 3: Complete upload and share to channel
    const completeRes = await fetch(`${GATEWAY_URL}/files.completeUploadExternal`, {
      method: 'POST',
      headers: { ...gatewayHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        files: [{ id: uploadUrlData.file_id, title: filename }],
        channel_id: channelId,
        initial_comment: `📋 Desarme ${desarme.desarme_number} — ${action}`,
      }),
    });
    const completeData = await completeRes.json();
    if (!completeData.ok) {
      console.error('Slack completeUploadExternal failed:', JSON.stringify(completeData));
    }
  } catch (e) {
    console.error('Slack CSV upload error:', e);
  }
};

// ── n8n webhook helper ──────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://favegacdm.app.n8n.cloud/webhook/desarmes';

const sendN8nWebhook = async (accion: string, solicitud: string, creadorEmail: string) => {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, solicitud, creador_email: creadorEmail }),
    });
    if (!res.ok) console.error(`n8n webhook failed [${res.status}]:`, await res.text());
  } catch (e) {
    console.error('n8n webhook error:', e);
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────
const respond = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return respond({ error: 'No autorizado' }, 401);

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return respond({ error: 'No autorizado' }, 401);
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

    // Helper: fetch full desarme for CSV
    const getFullDesarme = async (id: string) => {
      const { data } = await supabase.from('desarmes').select('*').eq('id', id).single();
      return data;
    };

    const body = await req.json();
    const { action } = body;

    // ===== CREATE DESARME =====
    if (action === 'createDesarme') {
      if (!(await checkPerm('crear_desarme'))) return respond({ error: 'Sin permiso para crear desarmes' }, 403);
      const { brand, model, serial_number, client_name, branch, product_code, product_name, quantity, reason, is_urgent, salesperson } = body;
      if (!brand || !model || !serial_number || !client_name || !branch || !product_code || !quantity || !reason) return respond({ error: 'Faltan campos obligatorios' }, 400);
      const { data, error } = await supabase.from('desarmes').insert({
        created_by: userId, brand, model, serial_number, client_name, branch,
        product_code, product_name: product_name || null,
        quantity: parseInt(quantity), reason, is_urgent: !!is_urgent,
        salesperson: salesperson || null,
      }).select().single();
      if (error) { console.error('Error creating desarme:', error); return respond({ error: 'Error al crear desarme' }, 500); }
      await logStatus(data.id, null, 'pendiente_cotizacion', userId, 'Desarme creado');
      sendSlackCSV(data, supabase, 'Creado');
      // n8n webhook - CREADO
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(userId);
      sendN8nWebhook('CREADO', data.desarme_number, creatorAuth?.user?.email || '');
      return respond({ desarme: data });
    }

    // ===== GET DESARMES =====
    if (action === 'getDesarmes') {
      if (!(await checkPerm('ver_desarmes'))) return respond({ error: 'Sin permiso' }, 403);
      const { statusFilter, view } = body;
      let query = supabase.from('desarmes').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      if (view === 'cotizar') {
        query = supabase.from('desarmes').select('*').eq('status', 'pendiente_cotizacion').order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      } else if (view === 'autorizar') {
        query = supabase.from('desarmes').select('*').eq('status', 'pendiente_autorizacion').order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      } else if (view === 'tracking') {
        query = supabase.from('desarmes').select('*').order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      }
      const { data, error } = await query;
      if (error) return respond({ error: 'Error al obtener desarmes' }, 500);
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
      return respond({ desarmes: enriched });
    }

    // ===== GET DESARME DETAIL =====
    if (action === 'getDesarmeDetail') {
      if (!(await checkPerm('ver_desarmes'))) return respond({ error: 'Sin permiso' }, 403);
      const { desarmeId } = body;
      if (!desarmeId) return respond({ error: 'Falta desarmeId' }, 400);
      const { data: desarme, error } = await supabase.from('desarmes').select('*').eq('id', desarmeId).single();
      if (error || !desarme) return respond({ error: 'Desarme no encontrado' }, 404);
      const { data: logs } = await supabase.from('desarme_status_log').select('*').eq('desarme_id', desarmeId).order('created_at', { ascending: true });
      return respond({ desarme, logs: logs || [] });
    }

    // ===== QUOTE DESARME =====
    if (action === 'quoteDesarme') {
      if (!(await checkPerm('cotizar_desarme'))) return respond({ error: 'Sin permiso para cotizar' }, 403);
      const { desarmeId, quoted_value, quoted_deadline, quoted_shipping_method, quote_observations } = body;
      if (!desarmeId || quoted_value === undefined) return respond({ error: 'Faltan campos obligatorios' }, 400);
      const { data: current } = await supabase.from('desarmes').select('status, desarme_number').eq('id', desarmeId).single();
      if (!current || current.status !== 'pendiente_cotizacion') return respond({ error: 'El desarme no está pendiente de cotización' }, 400);
      const { error } = await supabase.from('desarmes').update({
        status: 'pendiente_autorizacion', quoted_value: parseFloat(quoted_value),
        quoted_deadline: quoted_deadline || null, quoted_shipping_method: quoted_shipping_method || null,
        quote_observations: quote_observations || null, quoted_by: userId, quoted_at: new Date().toISOString(),
      }).eq('id', desarmeId);
      if (error) return respond({ error: 'Error al cotizar' }, 500);
      await logStatus(desarmeId, 'pendiente_cotizacion', 'pendiente_autorizacion', userId, `Cotizado: $${quoted_value}`);
      const fullDesarme = await getFullDesarme(desarmeId);
      if (fullDesarme) sendSlackCSV(fullDesarme, supabase, 'Cotizado');
      // n8n webhook - COTIZADO (email del creador original)
      const { data: desarmeForQuote } = await supabase.from('desarmes').select('created_by, desarme_number').eq('id', desarmeId).single();
      if (desarmeForQuote) {
        const { data: creatorAuthQ } = await supabase.auth.admin.getUserById(desarmeForQuote.created_by);
        sendN8nWebhook('COTIZADO', desarmeForQuote.desarme_number, creatorAuthQ?.user?.email || '');
      }
      return respond({ success: true });
    }

    // ===== AUTHORIZE DESARME =====
    if (action === 'authorizeDesarme') {
      if (!(await checkPerm('autorizar_desarme'))) return respond({ error: 'Sin permiso para autorizar' }, 403);
      const { desarmeId } = body;
      if (!desarmeId) return respond({ error: 'Falta desarmeId' }, 400);
      const { data: current } = await supabase.from('desarmes').select('status, quoted_by, desarme_number, created_by').eq('id', desarmeId).single();
      if (!current || current.status !== 'pendiente_autorizacion') return respond({ error: 'El desarme no está pendiente de autorización' }, 400);
      const { error } = await supabase.from('desarmes').update({ status: 'aprobado', authorized_by: userId, authorized_at: new Date().toISOString() }).eq('id', desarmeId);
      if (error) return respond({ error: 'Error al autorizar' }, 500);
      await logStatus(desarmeId, 'pendiente_autorizacion', 'aprobado', userId, 'Aprobado');

      if (current.quoted_by) {
        await supabase.from('user_notifications').insert({ user_id: current.quoted_by, type: 'desarme_approved', title: 'Desarme aprobado', message: `Tu cotización ${current.desarme_number} fue aprobada`, metadata: { desarme_id: desarmeId } });
      }
      if (current.created_by) {
        await supabase.from('user_notifications').insert({ user_id: current.created_by, type: 'desarme_ready_for_order', title: 'Generar pedido', message: `El desarme ${current.desarme_number} fue aprobado. Ya puedes generar el pedido.`, metadata: { desarme_id: desarmeId } });
      }

      const fullDesarme = await getFullDesarme(desarmeId);
      if (fullDesarme) sendSlackCSV(fullDesarme, supabase, 'Aprobado');
      // n8n webhook - APROBADO
      const { data: creatorAuthA } = await supabase.auth.admin.getUserById(current.created_by);
      sendN8nWebhook('APROBADO', current.desarme_number, creatorAuthA?.user?.email || '');
      return respond({ success: true });
    }

    // ===== REJECT DESARME =====
    if (action === 'rejectDesarme') {
      if (!(await checkPerm('autorizar_desarme'))) return respond({ error: 'Sin permiso para rechazar' }, 403);
      const { desarmeId, rejection_reason } = body;
      if (!desarmeId || !rejection_reason) return respond({ error: 'El motivo de rechazo es obligatorio' }, 400);
      const { data: current } = await supabase.from('desarmes').select('status, quoted_by, desarme_number').eq('id', desarmeId).single();
      if (!current || !['pendiente_cotizacion', 'pendiente_autorizacion'].includes(current.status)) return respond({ error: 'El desarme no puede ser rechazado en su estado actual' }, 400);
      const { error } = await supabase.from('desarmes').update({ status: 'rechazado', rejection_reason, authorized_by: userId, authorized_at: new Date().toISOString() }).eq('id', desarmeId);
      if (error) return respond({ error: 'Error al rechazar' }, 500);
      await logStatus(desarmeId, current.status, 'rechazado', userId, `Rechazado: ${rejection_reason}`);

      if (current.quoted_by) {
        await supabase.from('user_notifications').insert({ user_id: current.quoted_by, type: 'desarme_rejected', title: 'Desarme rechazado', message: `Tu cotización ${current.desarme_number} fue rechazada: ${rejection_reason}`, metadata: { desarme_id: desarmeId } });
      }

      const fullDesarme = await getFullDesarme(desarmeId);
      if (fullDesarme) sendSlackCSV(fullDesarme, supabase, 'Rechazado');
      // n8n webhook - RECHAZADO
      const { data: desarmeForReject } = await supabase.from('desarmes').select('created_by, desarme_number').eq('id', desarmeId).single();
      if (desarmeForReject) {
        const { data: creatorAuthR } = await supabase.auth.admin.getUserById(desarmeForReject.created_by);
        sendN8nWebhook('RECHAZADO', desarmeForReject.desarme_number, creatorAuthR?.user?.email || '');
      }
      return respond({ success: true });
    }

    // ===== GENERATE ORDER =====
    if (action === 'generateOrder') {
      const { desarmeId } = body;
      if (!desarmeId) return respond({ error: 'Falta desarmeId' }, 400);
      const { data: desarme } = await supabase.from('desarmes').select('*').eq('id', desarmeId).single();
      if (!desarme || desarme.status !== 'aprobado') return respond({ error: 'El desarme debe estar aprobado para generar pedido' }, 400);
      const observation = `Generado desde Desarme Nº ${desarme.desarme_number} – Serie ${desarme.serial_number} – Cliente ${desarme.client_name}`;
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: desarme.created_by, brand: desarme.brand, product_code: desarme.product_code,
        quantity: desarme.quantity, branch_destination: desarme.branch,
        shipping_method: desarme.quoted_shipping_method || 'aereo', observation, status: 'pending', order_destination: 'cliente',
      }).select().single();
      if (orderError) return respond({ error: 'Error al generar pedido' }, 500);
      await supabase.from('desarmes').update({ status: 'pedido_generado', linked_order_id: order.id }).eq('id', desarmeId);
      await logStatus(desarmeId, 'aprobado', 'pedido_generado', userId, `Pedido generado: ${order.id}`);
      const updatedDesarme = await getFullDesarme(desarmeId);
      if (updatedDesarme) sendSlackCSV(updatedDesarme, supabase, 'Pedido Generado');
      return respond({ success: true, order });
    }

    // ===== UPDATE DESARME STATUS =====
    if (action === 'updateDesarmeStatus') {
      if (!(await checkPerm('seguimiento_desarme'))) return respond({ error: 'Sin permiso para seguimiento' }, 403);
      const { desarmeId, newStatus, observation, service_order_number } = body;
      if (!desarmeId || !newStatus) return respond({ error: 'Faltan parámetros' }, 400);
      const validStatuses = ['recibido', 'maquina_rearmada', 'cerrado'];
      if (!validStatuses.includes(newStatus)) return respond({ error: 'Estado inválido' }, 400);
      if (newStatus === 'cerrado' && !service_order_number) return respond({ error: 'El Nro. de Orden de Servicio es obligatorio para cerrar el desarme' }, 400);

      const { data: current } = await supabase.from('desarmes').select('status, desarme_number').eq('id', desarmeId).single();
      if (!current) return respond({ error: 'Desarme no encontrado' }, 404);
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'maquina_rearmada') updateData.reassembled_at = new Date().toISOString();
      if (newStatus === 'cerrado') { updateData.closed_at = new Date().toISOString(); updateData.service_order_number = service_order_number; }
      const { error } = await supabase.from('desarmes').update(updateData).eq('id', desarmeId);
      if (error) return respond({ error: 'Error al actualizar estado' }, 500);
      await logStatus(desarmeId, current.status, newStatus, userId, observation || null);

      if (newStatus === 'recibido') {
        const { data: desarmeData } = await supabase.from('desarmes').select('created_by, desarme_number').eq('id', desarmeId).single();
        if (desarmeData) {
          await supabase.from('user_notifications').insert({ user_id: desarmeData.created_by, type: 'desarme_recibido', title: 'Repuesto recibido', message: `El repuesto del desarme ${desarmeData.desarme_number} fue recibido. Procede con el rearmado.`, metadata: { desarme_id: desarmeId } });
        }
      }

      const statusLabels: Record<string, string> = { recibido: 'Recibido', maquina_rearmada: 'Maquina Rearmada', cerrado: 'Cerrado' };
      const fullDesarme = await getFullDesarme(desarmeId);
      if (fullDesarme) sendSlackCSV(fullDesarme, supabase, statusLabels[newStatus] || newStatus);
      return respond({ success: true });
    }

    // ===== CANCEL DESARME =====
    if (action === 'cancelDesarme') {
      const { desarmeId, observation } = body;
      if (!desarmeId) return respond({ error: 'Falta desarmeId' }, 400);
      if (!observation || !observation.trim()) return respond({ error: 'La observación es obligatoria para cancelar' }, 400);
      const { data: current } = await supabase.from('desarmes').select('*').eq('id', desarmeId).single();
      if (!current) return respond({ error: 'Desarme no encontrado' }, 404);
      if (current.created_by !== userId) return respond({ error: 'Solo el creador puede cancelar el desarme' }, 403);
      const cancellableStatuses = ['pendiente_cotizacion', 'pendiente_autorizacion', 'aprobado'];
      if (!cancellableStatuses.includes(current.status)) return respond({ error: 'El desarme no puede ser cancelado en su estado actual' }, 400);
      const { error } = await supabase.from('desarmes').update({ status: 'cancelado' }).eq('id', desarmeId);
      if (error) return respond({ error: 'Error al cancelar' }, 500);
      await logStatus(desarmeId, current.status, 'cancelado', userId, observation.trim());

      // Notify quoter if exists
      if (current.quoted_by && current.quoted_by !== userId) {
        await supabase.from('user_notifications').insert({ user_id: current.quoted_by, type: 'desarme_cancelado', title: 'Desarme cancelado', message: `El desarme ${current.desarme_number} fue cancelado por el creador: ${observation.trim()}`, metadata: { desarme_id: desarmeId } });
      }

      const fullDesarme = await getFullDesarme(desarmeId);
      if (fullDesarme) sendSlackCSV(fullDesarme, supabase, 'Cancelado');
      const { data: creatorAuthC } = await supabase.auth.admin.getUserById(current.created_by);
      sendN8nWebhook('CANCELADO', current.desarme_number, creatorAuthC?.user?.email || '');
      return respond({ success: true });
    }

    // ===== GET TRACKING =====
    if (action === 'getDesarmeTracking') {
      if (!(await checkPerm('seguimiento_desarme'))) return respond({ error: 'Sin permiso para seguimiento' }, 403);
      const { data, error } = await supabase.from('desarmes').select('*')
        .not('status', 'in', '("rechazado","cerrado","pendiente_cotizacion","pendiente_autorizacion","cancelado")')
        .order('is_urgent', { ascending: false }).order('created_at', { ascending: true });
      if (error) return respond({ error: 'Error al obtener seguimiento' }, 500);
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
      return respond({ tracking: enriched });
    }

    return respond({ error: 'Acción no válida' }, 400);
  } catch (error) {
    console.error('Error:', error);
    return respond({ error: 'Error interno del servidor' }, 500);
  }
});
