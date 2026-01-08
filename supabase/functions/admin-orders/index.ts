import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, password, orderId, newStatus } = await req.json();
    
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    
    if (password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Contraseña incorrecta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'getOrders') {
      // Get orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener pedidos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get unique user IDs
      const userIds = [...new Set(orders?.map(o => o.user_id) || [])];
      
      // Fetch user emails from auth.users
      const usersWithEmails = await Promise.all(
        userIds.map(async (userId) => {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          return { id: userId, email: userData?.user?.email || null };
        })
      );
      
      // Create a map of user_id to email
      const emailMap = Object.fromEntries(usersWithEmails.map(u => [u.id, u.email]));
      
      // Add email to each order
      const ordersWithEmail = orders?.map(order => ({
        ...order,
        user_email: emailMap[order.user_id] || null
      }));

      return new Response(
        JSON.stringify({ orders: ordersWithEmail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'updateStatus') {
      if (!orderId || !newStatus) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validStatuses = ['pending', 'solicitado', 'entregado'];
      if (!validStatuses.includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: 'Estado inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar pedido' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Acción no válida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});