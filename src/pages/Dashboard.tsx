import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import OrderFilters, { OrderFiltersState } from '@/components/OrderFilters';
import OrdersTable, { Order } from '@/components/OrdersTable';
import EmptyState from '@/components/EmptyState';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState<OrderFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    brand: '',
    productCode: '',
    branch: '',
    status: '',
  });

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar los pedidos');
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleCreateOrder = async (orderData: {
    brand: string;
    productCode: string;
    quantity: number;
    branchDestination: string;
    observation: string;
  }) => {
    if (!user) return;

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      brand: orderData.brand,
      product_code: orderData.productCode,
      quantity: orderData.quantity,
      branch_destination: orderData.branchDestination,
      observation: orderData.observation || null,
    });

    if (error) {
      toast.error('Error al crear el pedido');
      throw error;
    }

    toast.success('Pedido creado exitosamente');
    fetchOrders();
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);

    if (error) {
      toast.error('Error al eliminar el pedido');
    } else {
      toast.success('Pedido eliminado');
      setOrders((prev) => prev.filter((order) => order.id !== id));
    }
  };

  // Get unique branches for filter dropdown
  const branches = useMemo(() => {
    return [...new Set(orders.map((o) => o.branch_destination))].sort();
  }, [orders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      
      if (filters.dateFrom && orderDate < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (orderDate > endOfDay) return false;
      }
      if (filters.brand && order.brand !== filters.brand) return false;
      if (filters.productCode && !order.product_code.toLowerCase().includes(filters.productCode.toLowerCase())) return false;
      if (filters.branch && order.branch_destination !== filters.branch) return false;
      if (filters.status && order.status !== filters.status) return false;
      
      return true;
    });
  }, [orders, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header onNewOrder={() => setIsFormOpen(true)} />

      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Mis Pedidos
          </h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState onNewOrder={() => setIsFormOpen(true)} />
        ) : (
          <>
            <OrderFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              branches={branches}
            />
            <OrdersTable 
              orders={filteredOrders} 
              onDelete={handleDeleteOrder}
            />
          </>
        )}
      </main>

      {/* Order Form Modal */}
      <OrderForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};

export default Dashboard;
