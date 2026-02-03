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
    const body = await req.json();
    const { action, password, orderId, orderIds, newStatus, orderNumber, shippingMethod, type, userId, userName, brand: notifBrand, productCode: notifProductCode, message, notificationId, conversationId, senderId, senderName, senderType, content, status, readerType, imageUrl, fileName, fileBase64, contentType } = body;
    
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // createNotification doesn't require admin password (called from user side)
    if (action === 'createNotification') {
      if (!type || !userId || !userName || !message) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type,
          user_id: userId,
          user_name: userName,
          brand: notifBrand || null,
          product_code: notifProductCode || null,
          message,
        });

      if (error) {
        console.error('Error creating notification:', error);
        return new Response(
          JSON.stringify({ error: 'Error al crear notificación' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All other actions require admin password
    if (password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Contraseña incorrecta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get notifications
    if (action === 'getNotifications') {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener notificaciones' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ notifications: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark notification as read
    if (action === 'markNotificationRead') {
      if (!notificationId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return new Response(
          JSON.stringify({ error: 'Error al marcar notificación' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark all notifications as read
    if (action === 'markAllNotificationsRead') {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return new Response(
          JSON.stringify({ error: 'Error al marcar notificaciones' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete all read notifications
    if (action === 'deleteReadNotifications') {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('is_read', true);

      if (error) {
        console.error('Error deleting read notifications:', error);
        return new Response(
          JSON.stringify({ error: 'Error al eliminar notificaciones' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl2 = Deno.env.get('SUPABASE_URL')!;
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
      const priceMap: Record<string, { aereo: number; maritimo: number; terrestre: number }> = {};
      
      if (uniqueProducts.length > 0) {
        // Fetch prices for each unique product (in parallel for efficiency)
        const pricePromises = uniqueProducts.map(async (p: { brand: string; code: string }) => {
          const { data: product } = await supabase
            .from('products')
            .select('price_aereo, price_maritimo, price_terrestre, brand, code')
            .eq('brand', p.brand)
            .eq('code', p.code)
            .maybeSingle();
          
          if (product) {
            priceMap[`${product.brand}|${product.code}`] = {
              aereo: Number(product.price_aereo) || 0,
              maritimo: Number(product.price_maritimo) || 0,
              terrestre: Number(product.price_terrestre) || 0
            };
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
      
      // Add name, email, and price to each order (using correct price based on shipping method)
      const ordersWithUser = orders?.map(order => {
        const productKey = `${order.brand}|${order.product_code}`;
        const prices = priceMap[productKey];
        // Use price based on shipping method
        const unitPrice = order.shipping_method === 'maritimo' 
          ? (prices?.maritimo || 0) 
          : order.shipping_method === 'terrestre'
            ? (prices?.terrestre || 0)
            : (prices?.aereo || 0);
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

      const validStatuses = ['pending', 'solicitado', 'pte_envio', 'entregado', 'cancelado'];
      if (!validStatuses.includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: 'Estado inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If changing to 'entregado', check that order_number and estimated_delivery_date exist
      if (newStatus === 'entregado') {
        const { data: orderData } = await supabase
          .from('orders')
          .select('order_number, estimated_delivery_date')
          .eq('id', orderId)
          .single();
        
        if (!orderData?.order_number || orderData.order_number.trim() === '') {
          return new Response(
            JSON.stringify({ error: 'Debe ingresar un número de pedido antes de marcar como entregado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!orderData?.estimated_delivery_date) {
          return new Response(
            JSON.stringify({ error: 'Debe ingresar una fecha estimada antes de marcar como entregado' }),
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
      
      if (newStatus === 'pending' || newStatus === 'cancelado') {
        // Clear all dates and order number when going back to pending or cancelling
        if (newStatus === 'pending') {
          updateData.requested_at = null;
          updateData.delivered_at = null;
          updateData.order_number = null;
          updateData.estimated_delivery_date = null;
        }
      } else if (newStatus === 'solicitado') {
        updateData.requested_at = now;
        updateData.delivered_at = null;
      } else if (newStatus === 'pte_envio') {
        if (!currentOrder?.requested_at) {
          updateData.requested_at = now;
        }
        updateData.delivered_at = null;
      } else if (newStatus === 'entregado') {
        updateData.delivered_at = now;
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
      const { estimatedDeliveryDate } = body;
      
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: Record<string, any> = { 
        order_number: orderNumber || null,
        estimated_delivery_date: estimatedDeliveryDate || null
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
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

    if (action === 'updateEstimatedDate') {
      const { estimatedDeliveryDate } = body;
      
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({ estimated_delivery_date: estimatedDeliveryDate || null })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating estimated date:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar fecha estimada' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'updateShippingMethod') {
      if (!orderId || !shippingMethod) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validMethods = ['aereo', 'maritimo', 'terrestre'];
      if (!validMethods.includes(shippingMethod)) {
        return new Response(
          JSON.stringify({ error: 'Método de envío inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First get the order to calculate new price
      const { data: orderData } = await supabase
        .from('orders')
        .select('brand, product_code, quantity')
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('orders')
        .update({ shipping_method: shippingMethod })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating shipping method:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar método de envío' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate new price based on shipping method
      let unitPrice = 0;
      let totalPrice = 0;
      
      if (orderData) {
        const { data: product } = await supabase
          .from('products')
          .select('price_aereo, price_maritimo, price_terrestre')
          .eq('brand', orderData.brand)
          .eq('code', orderData.product_code)
          .maybeSingle();
        
        if (product) {
          unitPrice = shippingMethod === 'maritimo' 
            ? Number(product.price_maritimo) || 0 
            : shippingMethod === 'terrestre'
              ? Number(product.price_terrestre) || 0
              : Number(product.price_aereo) || 0;
          totalPrice = unitPrice * orderData.quantity;
        }
      }

      return new Response(
        JSON.stringify({ success: true, unit_price: unitPrice, total_price: totalPrice }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'bulkUpdateStatus') {
      const { estimatedDeliveryDate } = body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !newStatus) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validStatuses = ['pending', 'solicitado', 'pte_envio', 'entregado', 'cancelado'];
      if (!validStatuses.includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: 'Estado inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If changing to 'entregado', check that all orders have order_number and estimated_delivery_date
      if (newStatus === 'entregado') {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number, estimated_delivery_date')
          .in('id', orderIds);
        
        const ordersWithoutNumber = ordersData?.filter(o => !o.order_number || o.order_number.trim() === '') || [];
        if (ordersWithoutNumber.length > 0) {
          return new Response(
            JSON.stringify({ error: `${ordersWithoutNumber.length} pedido(s) no tienen número de pedido. Ingrese el número antes de marcar como entregado.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const ordersWithoutDate = ordersData?.filter(o => !o.estimated_delivery_date) || [];
        if (ordersWithoutDate.length > 0) {
          return new Response(
            JSON.stringify({ error: `${ordersWithoutDate.length} pedido(s) no tienen fecha estimada. Ingrese la fecha antes de marcar como entregado.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Build update object with auto-fill dates based on status
      const updateData: Record<string, any> = { status: newStatus };
      const now = new Date().toISOString();
      
      if (newStatus === 'pending') {
        // Clear all dates and order number when going back to pending
        updateData.requested_at = null;
        updateData.delivered_at = null;
        updateData.order_number = null;
        updateData.estimated_delivery_date = null;
      } else if (newStatus === 'solicitado') {
        updateData.requested_at = now;
        // Clear delivered_at when going back to solicitado
        updateData.delivered_at = null;
        // orderNumber is required for solicitado (validated on frontend)
        if (orderNumber && orderNumber.trim() !== '') {
          updateData.order_number = orderNumber.trim();
          updateData.estimated_delivery_date = estimatedDeliveryDate || null;
        }
      } else if (newStatus === 'entregado') {
        updateData.delivered_at = now;
        // orderNumber is required (validated before this point)
        if (orderNumber && orderNumber.trim() !== '') {
          updateData.order_number = orderNumber.trim();
          updateData.estimated_delivery_date = estimatedDeliveryDate || null;
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

    // Admin full order update
    if (action === 'adminUpdateOrder') {
      const { orderId: editOrderId, brand: editBrand, productCode: editProductCode, quantity: editQuantity, branchDestination: editBranchDestination, observation: editObservation, orderNumber: editOrderNumber, shippingMethod: editShippingMethod, orderDestination: editOrderDestination } = body;
      
      if (!editOrderId || !editBrand || !editProductCode || !editQuantity || !editBranchDestination) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validMethods = ['aereo', 'maritimo', 'terrestre'];
      const validDestinations = ['cliente', 'stock', 'ambos'];

      const updateData: Record<string, any> = {
        brand: editBrand.trim(),
        product_code: editProductCode.trim(),
        quantity: parseInt(editQuantity) || 1,
        branch_destination: editBranchDestination.trim(),
        observation: editObservation?.trim() || null,
        order_number: editOrderNumber?.trim() || null,
        shipping_method: validMethods.includes(editShippingMethod) ? editShippingMethod : 'aereo',
        order_destination: validDestinations.includes(editOrderDestination) ? editOrderDestination : 'cliente',
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', editOrderId);

      if (error) {
        console.error('Error updating order:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar el pedido' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'bulkUpdateShippingMethod') {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || !shippingMethod) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validMethods = ['aereo', 'maritimo', 'terrestre'];
      if (!validMethods.includes(shippingMethod)) {
        return new Response(
          JSON.stringify({ error: 'Método de envío inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({ shipping_method: shippingMethod })
        .in('id', orderIds);

      if (error) {
        console.error('Error updating shipping method:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar método de envío' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, updated: orderIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order destination
    if (action === 'updateOrderDestination') {
      const { orderId: destOrderId, orderDestination } = body;
      
      if (!destOrderId || !orderDestination) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validDestinations = ['cliente', 'stock', 'ambos'];
      if (!validDestinations.includes(orderDestination)) {
        return new Response(
          JSON.stringify({ error: 'Destino inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({ order_destination: orderDestination })
        .eq('id', destOrderId);

      if (error) {
        console.error('Error updating order destination:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar destino' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ SUPPORT CHAT ACTIONS ============

    // Get all registered users for admin to start conversations
    if (action === 'getAllUsers') {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, branch')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener usuarios' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ users: profiles || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create conversation (admin side - to start chat with a user)
    if (action === 'createAdminConversation') {
      const { targetUserId, targetUserName, targetBranch, subject, initialMessage } = body;
      
      if (!targetUserId || !targetUserName || !subject || !initialMessage) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('support_conversations')
        .insert({
          user_id: targetUserId,
          user_name: targetUserName,
          branch: targetBranch || 'Sin sucursal',
          subject,
          status: 'open',
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Error al crear conversación' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send initial message from admin
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: 'admin',
          sender_name: 'Administrador',
          sender_type: 'admin',
          content: initialMessage,
        });

      if (msgError) {
        console.error('Error sending initial message:', msgError);
      }

      return new Response(
        JSON.stringify({ success: true, conversation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all conversations for admin
    if (action === 'getAdminConversations') {
      const { data: conversations, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener conversaciones' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { count } = await supabase
            .from('support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'user')
            .eq('is_read', false);

          return { ...conv, unread_count: count || 0 };
        })
      );

      return new Response(
        JSON.stringify({ conversations: conversationsWithUnread }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get messages for a conversation
    if (action === 'getConversationMessages') {
      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: 'Falta conversationId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener mensajes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload support image (admin side - uses service role)
    if (action === 'uploadSupportImage') {
      if (!fileName || !fileBase64 || !contentType) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode base64 to binary
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('support-images')
        .upload(fileName, bytes, { contentType });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Error al subir imagen' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('support-images')
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ success: true, publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message (admin side)
    if (action === 'sendMessage') {
      if (!conversationId || !senderId || !senderName || !senderType || (!content && !imageUrl)) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_name: senderName,
          sender_type: senderType,
          content: content || 'Imagen adjunta',
          image_url: imageUrl || null,
        });

      if (msgError) {
        console.error('Error sending message:', msgError);
        return new Response(
          JSON.stringify({ error: 'Error al enviar mensaje' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last_message_at
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete conversation and all its messages
    if (action === 'deleteConversation') {
      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: 'Falta conversationId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete messages first (due to FK constraint)
      await supabase
        .from('support_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase
        .from('support_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return new Response(
          JSON.stringify({ error: 'Error al eliminar conversación' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation status
    if (action === 'updateConversationStatus') {
      if (!conversationId || !status) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('support_conversations')
        .update({ status })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation status:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar estado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark messages as read
    if (action === 'markMessagesAsRead') {
      if (!conversationId || !readerType) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark messages from the opposite type as read
      const senderTypeToMark = readerType === 'admin' ? 'user' : 'admin';
      
      const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', senderTypeToMark)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return new Response(
          JSON.stringify({ error: 'Error al marcar mensajes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin unread count (total unread messages from users)
    if (action === 'getAdminUnreadCount') {
      const { count, error } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'user')
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener conteo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ count: count || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== PROVIDER MANAGEMENT ====================
    
    // Get all providers
    if (action === 'getProviders') {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching providers:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener proveedores' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ providers: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create provider
    if (action === 'createProvider') {
      const { providerData } = body;
      
      if (!providerData || !providerData.name) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('providers')
        .insert({
          name: providerData.name,
          color: providerData.color || '#888888',
          text_color: providerData.text_color || 'text-white',
          is_active: providerData.is_active !== undefined ? providerData.is_active : true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating provider:', error);
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Ya existe un proveedor con ese nombre' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Error al crear proveedor' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ provider: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update provider
    if (action === 'updateProvider') {
      const { providerId, providerData } = body;
      
      if (!providerId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: Record<string, any> = {};
      if (providerData.name !== undefined) updateData.name = providerData.name;
      if (providerData.color !== undefined) updateData.color = providerData.color;
      if (providerData.text_color !== undefined) updateData.text_color = providerData.text_color;
      if (providerData.is_active !== undefined) updateData.is_active = providerData.is_active;

      const { data, error } = await supabase
        .from('providers')
        .update(updateData)
        .eq('id', providerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating provider:', error);
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Ya existe un proveedor con ese nombre' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Error al actualizar proveedor' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ provider: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete provider
    if (action === 'deleteProvider') {
      const { providerId } = body;
      
      if (!providerId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', providerId);

      if (error) {
        console.error('Error deleting provider:', error);
        return new Response(
          JSON.stringify({ error: 'Error al eliminar proveedor' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ BRANCH MANAGEMENT ACTIONS ============

    // Create branch
    if (action === 'createBranch') {
      const { branchData } = body;
      
      if (!branchData?.name) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('branches')
        .insert({
          name: branchData.name.toUpperCase(),
          is_active: branchData.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating branch:', error);
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Ya existe una sucursal con ese nombre' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Error al crear sucursal' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ branch: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update branch
    if (action === 'updateBranch') {
      const { branchId, branchData } = body;
      
      if (!branchId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: Record<string, any> = {};
      if (branchData.name !== undefined) updateData.name = branchData.name.toUpperCase();
      if (branchData.is_active !== undefined) updateData.is_active = branchData.is_active;

      const { data, error } = await supabase
        .from('branches')
        .update(updateData)
        .eq('id', branchId)
        .select()
        .single();

      if (error) {
        console.error('Error updating branch:', error);
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Ya existe una sucursal con ese nombre' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Error al actualizar sucursal' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ branch: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete branch
    if (action === 'deleteBranch') {
      const { branchId } = body;
      
      if (!branchId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) {
        console.error('Error deleting branch:', error);
        return new Response(
          JSON.stringify({ error: 'Error al eliminar sucursal' }),
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
