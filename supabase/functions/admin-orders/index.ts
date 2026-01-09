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
    const { action, password, orderId, orderIds, newStatus, orderNumber } = await req.json();
    
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

      // Get unique product combinations from orders
      const uniqueProducts = [...new Set(orders?.map(o => JSON.stringify({ brand: o.brand, code: o.product_code })) || [])]
        .map(s => JSON.parse(s));

      // Fetch prices only for products in orders
      const priceMap: Record<string, number> = {};
      
      if (uniqueProducts.length > 0) {
        // Fetch prices for each unique product (in parallel for efficiency)
        const pricePromises = uniqueProducts.map(async (p: { brand: string; code: string }) => {
          const { data: product } = await supabase
            .from('products')
            .select('price, brand, code')
            .eq('brand', p.brand)
            .eq('code', p.code)
            .maybeSingle();
          
          if (product) {
            priceMap[`${product.brand}|${product.code}`] = Number(product.price) || 0;
          }
        });
        
        await Promise.all(pricePromises);
      }
      
      console.log('Price map:', priceMap);

      // Get unique user IDs
      const userIds = [...new Set(orders?.map(o => o.user_id) || [])];
      
      // Fetch profiles for user names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      // Create a map of user_id to name
      const nameMap = Object.fromEntries(
        profiles?.map(p => [p.user_id, p.full_name]) || []
      );
      
      // Fetch user emails from auth.users (as fallback)
      const usersWithEmails = await Promise.all(
        userIds.map(async (userId) => {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          return { id: userId, email: userData?.user?.email || null };
        })
      );
      
      // Create a map of user_id to email
      const emailMap = Object.fromEntries(usersWithEmails.map(u => [u.id, u.email]));
      
      // Add name, email, and price to each order
      const ordersWithUser = orders?.map(order => {
        const productKey = `${order.brand}|${order.product_code}`;
        const unitPrice = priceMap[productKey] || 0;
        return {
          ...order,
          user_email: emailMap[order.user_id] || null,
          user_name: nameMap[order.user_id] || null,
          unit_price: unitPrice,
          total_price: unitPrice * order.quantity
        };
      });

      return new Response(
        JSON.stringify({ orders: ordersWithUser }),
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

      // If changing to 'entregado', check that order_number exists
      if (newStatus === 'entregado') {
        const { data: orderData } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', orderId)
          .single();
        
        if (!orderData?.order_number || orderData.order_number.trim() === '') {
          return new Response(
            JSON.stringify({ error: 'Debe ingresar un número de pedido antes de marcar como entregado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get current order to check if requested_at needs to be set
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('requested_at')
        .eq('id', orderId)
        .single();

      // Build update object with auto-fill dates based on status
      const updateData: Record<string, any> = { status: newStatus };
      const now = new Date().toISOString();
      
      if (newStatus === 'pending') {
        // Clear all dates when going back to pending
        updateData.requested_at = null;
        updateData.delivered_at = null;
      } else if (newStatus === 'solicitado') {
        updateData.requested_at = now;
        // Clear delivered_at when going back to solicitado
        updateData.delivered_at = null;
      } else if (newStatus === 'entregado') {
        updateData.delivered_at = now;
        // If jumping directly to entregado without requested_at, fill it too
        if (!currentOrder?.requested_at) {
          updateData.requested_at = now;
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar pedido' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          requested_at: updateData.requested_at || null, 
          delivered_at: updateData.delivered_at || null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'updateOrderNumber') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({ order_number: orderNumber || null })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order number:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar número de pedido' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'bulkUpdateStatus') {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !newStatus) {
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

      // If changing to 'entregado', check that all orders have order_number
      if (newStatus === 'entregado') {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number')
          .in('id', orderIds);
        
        const ordersWithoutNumber = ordersData?.filter(o => !o.order_number || o.order_number.trim() === '') || [];
        if (ordersWithoutNumber.length > 0) {
          return new Response(
            JSON.stringify({ error: `${ordersWithoutNumber.length} pedido(s) no tienen número de pedido. Ingrese el número antes de marcar como entregado.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Build update object with auto-fill dates based on status
      const updateData: Record<string, any> = { status: newStatus };
      const now = new Date().toISOString();
      
      if (newStatus === 'pending') {
        // Clear all dates when going back to pending
        updateData.requested_at = null;
        updateData.delivered_at = null;
      } else if (newStatus === 'solicitado') {
        updateData.requested_at = now;
        // Clear delivered_at when going back to solicitado
        updateData.delivered_at = null;
        // orderNumber is required for solicitado (validated on frontend)
        if (orderNumber && orderNumber.trim() !== '') {
          updateData.order_number = orderNumber.trim();
        }
      } else if (newStatus === 'entregado') {
        updateData.delivered_at = now;
        // orderNumber is required (validated before this point)
        if (orderNumber && orderNumber.trim() !== '') {
          updateData.order_number = orderNumber.trim();
        }
        // For orders jumping directly to entregado, we need to update requested_at individually
        const { data: ordersWithoutRequested } = await supabase
          .from('orders')
          .select('id')
          .in('id', orderIds)
          .is('requested_at', null);
        
        if (ordersWithoutRequested && ordersWithoutRequested.length > 0) {
          const idsWithoutRequested = ordersWithoutRequested.map(o => o.id);
          await supabase
            .from('orders')
            .update({ requested_at: now })
            .in('id', idsWithoutRequested);
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .in('id', orderIds);

      if (error) {
        console.error('Error updating orders:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar pedidos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: orderIds.length, 
          requested_at: updateData.requested_at || null, 
          delivered_at: updateData.delivered_at || null,
          order_number: updateData.order_number || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'bulkDelete') {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (error) {
        console.error('Error deleting orders:', error);
        return new Response(
          JSON.stringify({ error: 'Error al eliminar pedidos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, deleted: orderIds.length }),
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
