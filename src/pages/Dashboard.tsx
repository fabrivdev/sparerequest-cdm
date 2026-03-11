import { useState, useEffect, useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportOrdersToExcel } from '@/utils/exportOrdersExcel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import AppLayout from '@/components/AppLayout';
import OrderForm from '@/components/OrderForm';
import OrderFilters, { OrderFiltersState } from '@/components/OrderFilters';
import OrdersTable, { Order } from '@/components/OrdersTable';
import EmptyState from '@/components/EmptyState';
import ProfileSetup from '@/components/ProfileSetup';
import ProfileEditModal from '@/components/ProfileEditModal';
import ViewToggle from '@/components/ViewToggle';
import LoadingScreen from '@/components/LoadingScreen';
import SupportButton from '@/components/support/SupportButton';
import DeliveredOrdersView from '@/components/DeliveredOrdersView';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

interface Branch {
  name: string;
  is_active: boolean;
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
  const [view, setView] = useState<'my-orders' | 'branch-orders' | 'delivered'>('my-orders');
  
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filters, setFilters] = useState<OrderFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    brand: '',
    productCode: '',
    branch: '',
    status: '',
    observation: '',
  });

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (error) console.error('Error fetching profile:', error);
    setProfile(data);
    if (data?.branch) setSelectedBranch(data.branch);
    setProfileLoading(false);
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase.from('branches').select('name, is_active').order('name');
    if (error) console.error('Error fetching branches:', error);
    else setBranches(data || []);
  };

  const fetchAllPaginated = async (query: any) => {
    const PAGE_SIZE = 1000;
    let all: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const data = await fetchAllPaginated(supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }));
      setOrders(data);
    } catch (error) { toast.error('Error al cargar los pedidos'); console.error(error); }
    setIsLoading(false);
  };

  const fetchBranchOrders = async () => {
    if (!user || !profile) return;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (selectedBranch && selectedBranch !== 'all') query = query.eq('branch_destination', selectedBranch);
    try {
      const ordersData = await fetchAllPaginated(query);
      if (ordersData.length === 0) { setBranchOrders([]); return; }
    const userIds = [...new Set(ordersData.map(o => o.user_id))];
    const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
    setBranchOrders(ordersData.map(order => ({ ...order, user_name: profileMap.get(order.user_id) || 'Usuario desconocido' })));
  };

  useEffect(() => { fetchProfile(); fetchBranches(); }, [user]);
  
  useEffect(() => { if (profile) fetchOrders(); }, [profile]);
  useEffect(() => { if (profile && view === 'branch-orders') fetchBranchOrders(); }, [profile, view, selectedBranch]);

  // Track user presence
  useEffect(() => {
    if (!user || !profile) return;
    let sessionId: string | null = null;
    const connectedAt = Date.now();
    const createSession = async () => {
      const { data } = await supabase.from('user_sessions').insert({ user_id: user.id, user_name: profile.full_name || 'Usuario', branch: profile.branch }).select('id').single();
      if (data) sessionId = data.id;
    };
    createSession();
    const channel = supabase.channel('online_users').on('presence', { event: 'sync' }, () => {}).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id, user_name: profile.full_name || 'Usuario', branch: profile.branch, online_at: new Date().toISOString() });
    });
    return () => {
      if (sessionId) {
        const now = new Date();
        supabase.from('user_sessions').update({ disconnected_at: now.toISOString(), duration_minutes: Math.max(1, Math.round((now.getTime() - connectedAt) / 60000)) }).eq('id', sessionId).then(() => {});
      }
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleCreateOrder = async (orderData: { brand: string; productCode: string; quantity: number; branchDestination: string; shippingMethod: string; orderDestination: string; observation: string; }) => {
    if (!user) return;
    const { error } = await supabase.from('orders').insert({ user_id: user.id, brand: orderData.brand, product_code: orderData.productCode, quantity: orderData.quantity, branch_destination: orderData.branchDestination, shipping_method: orderData.shippingMethod, order_destination: orderData.orderDestination, observation: orderData.observation || null });
    if (error) { toast.error('Error al crear el pedido'); throw error; }
    toast.success('Pedido creado exitosamente');
    fetchOrders();
    if (view === 'branch-orders') fetchBranchOrders();
  };

  const handleUpdateOrder = async (orderId: string, data: { brand: string; product_code: string; quantity: number; branch_destination: string; observation: string | null; }) => {
    const { error } = await supabase.from('orders').update(data).eq('id', orderId);
    if (error) { toast.error('Error al actualizar el pedido'); throw error; }
    toast.success('Pedido actualizado exitosamente');
    fetchOrders();
    if (view === 'branch-orders') fetchBranchOrders();
  };

  const handleDeleteOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      const hoursSinceCreation = (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) { toast.error('No se puede eliminar: pasaron más de 24 horas'); return; }
      if (order.status !== 'pending') { toast.error('No se puede eliminar: el estado ya cambió'); return; }
    }
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) toast.error('Error al eliminar el pedido');
    else { toast.success('Pedido eliminado'); setOrders(prev => prev.filter(o => o.id !== id)); if (view === 'branch-orders') setBranchOrders(prev => prev.filter(o => o.id !== id)); }
  };

  const filterBranches = useMemo(() => {
    const currentOrders = view === 'my-orders' ? orders : branchOrders;
    return [...new Set(currentOrders.map(o => o.branch_destination))].sort();
  }, [orders, branchOrders, view]);

  const filteredOrders = useMemo(() => {
    const currentOrders = view === 'my-orders' ? orders : branchOrders;
    return currentOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (filters.dateFrom && orderDate < filters.dateFrom) return false;
      if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23, 59, 59, 999); if (orderDate > end) return false; }
      if (filters.brand && order.brand !== filters.brand) return false;
      if (filters.productCode && !order.product_code.toLowerCase().includes(filters.productCode.toLowerCase())) return false;
      if (filters.branch && order.branch_destination !== filters.branch) return false;
      if (filters.status && order.status !== filters.status) return false;
      if (filters.observation && (!order.observation || !order.observation.toLowerCase().includes(filters.observation.toLowerCase()))) return false;
      return true;
    });
  }, [orders, branchOrders, view, filters]);

  const pendingInvoiceCount = useMemo(() => orders.filter(o => o.status === 'entregado' && (o.order_destination || 'cliente') !== 'stock' && !o.is_invoiced).length, [orders]);
  const currentOrders = view === 'my-orders' ? orders : view === 'branch-orders' ? branchOrders : orders.filter(o => o.status === 'entregado');

  if (profileLoading) return <LoadingScreen />;
  if (!profile && user) return <ProfileSetup userId={user.id} onComplete={() => fetchProfile()} />;

  return (
    <AppLayout userBranch={profile?.branch}>
      <Header onNewOrder={() => setIsFormOpen(true)} onEditProfile={() => setShowProfileEdit(true)} profile={profile} />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <ViewToggle view={view} onViewChange={setView} selectedBranch={selectedBranch} onBranchChange={setSelectedBranch} userBranch={profile?.branch || ''} branches={branches} pendingInvoiceCount={pendingInvoiceCount} />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {view === 'my-orders' ? 'Mis Pedidos' : view === 'branch-orders' ? selectedBranch === 'all' ? 'Todas las Sucursales' : `Pedidos en ${selectedBranch}` : 'Pedidos Entregados'}
            </h2>
            <p className="text-sm text-muted-foreground">{currentOrders.length} {currentOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}</p>
          </div>
          <div className="flex items-center gap-2">
            {filteredOrders.length > 0 && view !== 'delivered' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 sm:h-10 gap-1 sm:gap-2 px-2.5 sm:px-4"
                onClick={() => {
                  const label = view === 'my-orders' ? 'Mis_Pedidos' : selectedBranch === 'all' ? 'Todas_Sucursales' : selectedBranch.replace(/\s+/g, '_');
                  exportOrdersToExcel(filteredOrders, `Pedidos_${label}_${new Date().toISOString().slice(0,10)}`, view === 'branch-orders');
                }}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            )}
            {currentOrders.length > 0 && (
              <Button onClick={() => setIsFormOpen(true)} className="h-9 sm:h-10 gap-1 sm:gap-2 px-2.5 sm:px-4">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Pedido</span>
              </Button>
            )}
          </div>
        </div>
        {isLoading ? <LoadingScreen /> : view === 'delivered' ? (
          <DeliveredOrdersView orders={orders} onUpdate={fetchOrders} userId={user?.id || ''} pendingInvoiceCount={pendingInvoiceCount} />
        ) : currentOrders.length === 0 ? <EmptyState onNewOrder={() => setIsFormOpen(true)} /> : (
          <>
            <OrderFilters filters={filters} onFiltersChange={setFilters} branches={filterBranches} />
            <OrdersTable orders={filteredOrders} onDelete={handleDeleteOrder} onUpdate={handleUpdateOrder} showUserColumn={view === 'branch-orders'} currentUserId={user?.id} />
          </>
        )}
      </main>
      <OrderForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleCreateOrder} defaultBranch={profile?.branch} />
      {profile && <ProfileEditModal isOpen={showProfileEdit} onClose={() => setShowProfileEdit(false)} profile={profile} onUpdate={(p) => { setProfile(p); if (view === 'branch-orders') fetchBranchOrders(); }} />}
      {profile && user && <SupportButton userId={user.id} userName={profile.full_name || 'Usuario'} branch={profile.branch} />}
      
    </AppLayout>
  );
};

export default Dashboard;
