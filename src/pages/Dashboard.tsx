import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import OrderForm from '@/components/OrderForm';
import OrderFilters, { OrderFiltersState } from '@/components/OrderFilters';
import OrdersTable, { Order } from '@/components/OrdersTable';
import EmptyState from '@/components/EmptyState';
import ProfileSetup from '@/components/ProfileSetup';
import ProfileEditModal from '@/components/ProfileEditModal';
import ViewToggle from '@/components/ViewToggle';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

interface OrderWithUser extends Order {
  user_email?: string;
  user_name?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branchOrders, setBranchOrders] = useState<OrderWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [view, setView] = useState<'my-orders' | 'branch-orders'>('my-orders');
  const [filters, setFilters] = useState<OrderFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    brand: '',
    productCode: '',
    branch: '',
    status: '',
  });

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    }
    
    setProfile(data);
    setProfileLoading(false);
  };

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

  const fetchBranchOrders = async () => {
    if (!user || !profile) return;

    // Fetch orders for the user's branch
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('branch_destination', profile.branch)
      .order('created_at', { ascending: false });

    if (ordersError) {
      toast.error('Error al cargar los pedidos de la sucursal');
      console.error(ordersError);
      return;
    }

    if (!ordersData || ordersData.length === 0) {
      setBranchOrders([]);
      return;
    }

    // Get unique user_ids from orders
    const userIds = [...new Set(ordersData.map(o => o.user_id))];
    
    // Fetch profiles for those users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Map profiles to orders
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
    
    const ordersWithUsers: OrderWithUser[] = ordersData.map(order => ({
      ...order,
      user_name: profileMap.get(order.user_id) || 'Usuario desconocido',
    }));

    setBranchOrders(ordersWithUsers);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchOrders();
    }
  }, [profile]);

  useEffect(() => {
    if (profile && view === 'branch-orders') {
      fetchBranchOrders();
    }
  }, [profile, view]);

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
    if (view === 'branch-orders') {
      fetchBranchOrders();
    }
  };

  const handleUpdateOrder = async (orderId: string, data: {
    brand: string;
    product_code: string;
    quantity: number;
    branch_destination: string;
    observation: string | null;
  }) => {
    const { error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', orderId);

    if (error) {
      toast.error('Error al actualizar el pedido');
      throw error;
    }

    toast.success('Pedido actualizado exitosamente');
    fetchOrders();
    if (view === 'branch-orders') {
      fetchBranchOrders();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    // Find the order to check if it can be deleted
    const order = orders.find(o => o.id === id);
    if (order) {
      const hoursSinceCreation = (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        toast.error('No se puede eliminar: pasaron más de 24 horas');
        return;
      }
      if (order.status !== 'pending') {
        toast.error('No se puede eliminar: el estado ya cambió');
        return;
      }
    }

    const { error } = await supabase.from('orders').delete().eq('id', id);

    if (error) {
      toast.error('Error al eliminar el pedido');
    } else {
      toast.success('Pedido eliminado');
      setOrders((prev) => prev.filter((order) => order.id !== id));
      if (view === 'branch-orders') {
        setBranchOrders((prev) => prev.filter((order) => order.id !== id));
      }
    }
  };

  const handleProfileComplete = () => {
    fetchProfile();
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    // Refresh branch orders if viewing them since branch might have changed
    if (view === 'branch-orders') {
      fetchBranchOrders();
    }
  };

  // Get unique branches for filter dropdown
  const branches = useMemo(() => {
    const currentOrders = view === 'my-orders' ? orders : branchOrders;
    return [...new Set(currentOrders.map((o) => o.branch_destination))].sort();
  }, [orders, branchOrders, view]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    const currentOrders = view === 'my-orders' ? orders : branchOrders;
    return currentOrders.filter((order) => {
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
  }, [orders, branchOrders, view, filters]);

  // Show loading while checking profile
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Show profile setup if no profile exists
  if (!profile && user) {
    return <ProfileSetup userId={user.id} onComplete={handleProfileComplete} />;
  }

  const currentOrders = view === 'my-orders' ? orders : branchOrders;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onNewOrder={() => setIsFormOpen(true)} 
        onEditProfile={() => setShowProfileEdit(true)}
        profile={profile}
      />

      <main className="container mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="mb-6">
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {/* Stats */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {view === 'my-orders' ? 'Mis Pedidos' : `Pedidos en ${profile?.branch}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentOrders.length} {currentOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : currentOrders.length === 0 ? (
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
              onUpdate={handleUpdateOrder}
              showUserColumn={view === 'branch-orders'}
              currentUserId={user?.id}
            />
          </>
        )}
      </main>

      {/* Order Form Modal */}
      <OrderForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrder}
        defaultBranch={profile?.branch}
      />

      {/* Profile Edit Modal */}
      {profile && (
        <ProfileEditModal
          isOpen={showProfileEdit}
          onClose={() => setShowProfileEdit(false)}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Dashboard;
