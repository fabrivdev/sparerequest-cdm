import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import OrderCard from '@/components/OrderCard';
import OrderForm from '@/components/OrderForm';
import EmptyState from '@/components/EmptyState';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <Header onNewOrder={() => setIsFormOpen(true)} />

      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="mb-6">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onDelete={handleDeleteOrder}
              />
            ))}
          </div>
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
