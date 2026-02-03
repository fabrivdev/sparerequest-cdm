import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ArrowLeft, Clock, Truck, CheckCircle, LayoutDashboard, List, MessageCircle, XCircle, PackageSearch, Settings, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import OrderFilters, { OrderFiltersState } from '@/components/OrderFilters';
import OrdersTable, { Order } from '@/components/OrdersTable';
import ProductCatalogUpload from '@/components/ProductCatalogUpload';
import BulkActionsBar from '@/components/BulkActionsBar';
import AdminDashboard from '@/components/AdminDashboard';
import LoadingScreen from '@/components/LoadingScreen';
import OnlineUsersIndicator from '@/components/OnlineUsersIndicator';
import AdminNotifications from '@/components/AdminNotifications';
import AdminSupportIndicator from '@/components/AdminSupportIndicator';
import AdminSupportCenter from '@/components/admin/AdminSupportCenter';
import AdminSettings from '@/components/AdminSettings';
import AdminDeliveredView from '@/components/AdminDeliveredView';

const ADMIN_SESSION_KEY = 'admin_session';

interface OnlineUser {
  user_id: string;
  user_name: string;
  branch: string;
  online_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filters, setFilters] = useState<OrderFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    brand: '',
    productCode: '',
    branch: '',
    status: '',
    observation: '',
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeTab, setActiveTab] = useState('orders');

  const getAdminSession = () => {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return null;
    
    try {
      const parsed = JSON.parse(sessionData);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
  };

  const loadOrders = async (adminPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getOrders', password: adminPassword },
      });

      if (error || data.error) {
        toast.error('Sesión expirada');
        localStorage.removeItem(ADMIN_SESSION_KEY);
        navigate('/');
        return;
      }

      setOrders(data.orders);
      setPassword(adminPassword);
    } catch (err) {
      toast.error('Error al cargar pedidos');
      navigate('/');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate('/');
      return;
    }
    loadOrders(session.password);
  }, [navigate]);

  // Subscribe to online users presence
  useEffect(() => {
    const channel = supabase
      .channel('online_users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((u: any) => ({
          user_id: u.user_id || '',
          user_name: u.user_name || 'Usuario',
          branch: u.branch || '',
          online_at: u.online_at || new Date().toISOString(),
        })) as OnlineUser[];
        setOnlineUsers(users);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    navigate('/');
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Validate on frontend that 'entregado' requires order_number and estimated_delivery_date
    if (newStatus === 'entregado') {
      const order = orders.find(o => o.id === orderId);
      if (!order?.order_number || order.order_number.trim() === '') {
        toast.error('Debe ingresar un número de pedido antes de marcar como entregado');
        return;
      }
      if (!order?.estimated_delivery_date) {
        toast.error('Debe ingresar una fecha estimada antes de marcar como entregado');
        return;
      }
    }

    setUpdatingOrderId(orderId);

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'updateStatus', password, orderId, newStatus },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        setUpdatingOrderId(null);
        return;
      }

      // Update local state with new status and dates from response
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            const updates: Partial<typeof order> = { 
              status: newStatus,
              requested_at: data.requested_at,
              delivered_at: data.delivered_at
            };
            // Clear order_number and estimated_delivery_date when going back to pending
            if (newStatus === 'pending') {
              updates.order_number = null;
              updates.estimated_delivery_date = null;
            }
            return { ...order, ...updates };
          }
          return order;
        })
      );
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error('Error al actualizar');
    }

    setUpdatingOrderId(null);
  };

  const handleOrderNumberChange = async (orderId: string, orderNumber: string, estimatedDeliveryDate?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'updateOrderNumber', password, orderId, orderNumber, estimatedDeliveryDate },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { 
            ...order, 
            order_number: orderNumber || null,
            estimated_delivery_date: estimatedDeliveryDate || order.estimated_delivery_date
          } : order
        )
      );
      toast.success('Número de pedido actualizado');
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const handleEstimatedDateChange = async (orderId: string, estimatedDeliveryDate: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'updateEstimatedDate', password, orderId, estimatedDeliveryDate },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, estimated_delivery_date: estimatedDeliveryDate } : order
        )
      );
      toast.success('Fecha estimada actualizada');
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const handleShippingMethodChange = async (orderId: string, shippingMethod: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'updateShippingMethod', password, orderId, shippingMethod },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { 
            ...order, 
            shipping_method: shippingMethod,
            unit_price: data.unit_price,
            total_price: data.total_price
          } : order
        )
      );
      toast.success('Método de envío actualizado');
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const handleBulkStatusChange = async (newStatus: string, orderNumber?: string, estimatedDeliveryDate?: string) => {
    // Validate on frontend that 'entregado' requires order_number and estimated_delivery_date for all selected
    if (newStatus === 'entregado') {
      const ordersWithoutNumber = orders.filter(
        o => selectedOrders.includes(o.id) && (!o.order_number || o.order_number.trim() === '')
      );
      if (ordersWithoutNumber.length > 0) {
        toast.error(`${ordersWithoutNumber.length} pedido(s) no tienen número de pedido`);
        return;
      }
      const ordersWithoutDate = orders.filter(
        o => selectedOrders.includes(o.id) && !o.estimated_delivery_date
      );
      if (ordersWithoutDate.length > 0) {
        toast.error(`${ordersWithoutDate.length} pedido(s) no tienen fecha estimada`);
        return;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'bulkUpdateStatus', password, orderIds: selectedOrders, newStatus, orderNumber, estimatedDeliveryDate },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (selectedOrders.includes(order.id)) {
            const updates: Partial<typeof order> = { 
              status: newStatus,
              requested_at: data.requested_at ?? order.requested_at,
              delivered_at: data.delivered_at ?? order.delivered_at
            };
            // For pending status, clear dates and order number
            if (newStatus === 'pending') {
              updates.requested_at = null;
              updates.delivered_at = null;
              updates.order_number = null;
              updates.estimated_delivery_date = null;
            }
            // For solicitado, clear delivered_at
            if (newStatus === 'solicitado') {
              updates.delivered_at = null;
            }
            if (data.order_number) {
              updates.order_number = data.order_number;
              updates.estimated_delivery_date = estimatedDeliveryDate || null;
            }
            return { ...order, ...updates };
          }
          return order;
        })
      );
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} pedidos actualizados`);
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'bulkDelete', password, orderIds: selectedOrders },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al eliminar');
        return;
      }

      setOrders((prev) => prev.filter((order) => !selectedOrders.includes(order.id)));
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} pedidos eliminados`);
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleBulkShippingMethodChange = async (shippingMethod: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'bulkUpdateShippingMethod', password, orderIds: selectedOrders, shippingMethod },
      });

      if (error || data.error) {
        toast.error(data?.error || 'Error al actualizar');
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          selectedOrders.includes(order.id) ? { ...order, shipping_method: shippingMethod } : order
        )
      );
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} pedidos actualizados a ${shippingMethod === 'aereo' ? 'Aéreo' : 'Marítimo'}`);
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  // Get unique branches for filter dropdown
  const branches = useMemo(() => {
    return [...new Set(orders.map((o) => o.branch_destination))].sort();
  }, [orders]);

  // Calculate stats with totals
  const stats = useMemo(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const solicitadoOrders = orders.filter(o => o.status === 'solicitado');
    const pteEnvioOrders = orders.filter(o => o.status === 'pte_envio');
    const entregadoOrders = orders.filter(o => o.status === 'entregado');
    const canceladoOrders = orders.filter(o => o.status === 'cancelado');
    
    const pendingTotal = pendingOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    const solicitadoTotal = solicitadoOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    const pteEnvioTotal = pteEnvioOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    const entregadoTotal = entregadoOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    
    return { 
      pending: pendingOrders.length, 
      pendingTotal,
      solicitado: solicitadoOrders.length, 
      solicitadoTotal,
      pteEnvio: pteEnvioOrders.length,
      pteEnvioTotal,
      entregado: entregadoOrders.length,
      entregadoTotal,
      cancelado: canceladoOrders.length
    };
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
      if (filters.observation && (!order.observation || !order.observation.toLowerCase().includes(filters.observation.toLowerCase()))) return false;
      
      return true;
    });
  }, [orders, filters]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Panel Administrador</h1>
              <p className="text-xs text-muted-foreground">{orders.length} pedidos totales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OnlineUsersIndicator users={onlineUsers} />
            <AdminNotifications password={password} />
            <AdminSupportIndicator password={password} onOpenSupport={() => setActiveTab('support')} />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Product Catalog Upload */}
        <div className="mb-6">
          <ProductCatalogUpload />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-xs font-semibold text-red-500">${stats.pendingTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.solicitado}</p>
                <p className="text-xs text-muted-foreground">Solicitados</p>
                <p className="text-xs font-semibold text-yellow-500">${stats.solicitadoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <PackageSearch className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.pteEnvio}</p>
                <p className="text-xs text-muted-foreground">Pte. de envío</p>
                <p className="text-xs font-semibold text-blue-500">${stats.pteEnvioTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.entregado}</p>
                <p className="text-xs text-muted-foreground">Entregados</p>
                <p className="text-xs font-semibold text-green-500">${stats.entregadoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/10 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.cancelado}</p>
                <p className="text-xs text-muted-foreground">Cancelados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Dashboard, Orders, Delivered, Support, and Settings */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Entregados</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Soporte</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <OrderFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              branches={branches}
            />

            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedCount={selectedOrders.length}
              onStatusChange={handleBulkStatusChange}
              onShippingMethodChange={handleBulkShippingMethodChange}
              onDelete={handleBulkDelete}
              onClearSelection={() => setSelectedOrders([])}
              selectedOrdersNeedOrderNumber={orders.some(
                o => selectedOrders.includes(o.id) && (!o.order_number || o.order_number.trim() === '')
              )}
              selectedOrdersNeedEstimatedDate={orders.some(
                o => selectedOrders.includes(o.id) && !o.estimated_delivery_date
              )}
              orders={orders}
              selectedOrders={selectedOrders}
              onSelectByOrderNumber={(orderNumber) => {
                const ordersWithSameNumber = orders
                  .filter(o => o.order_number === orderNumber)
                  .map(o => o.id);
                const newSelection = [...new Set([...selectedOrders, ...ordersWithSameNumber])];
                setSelectedOrders(newSelection);
              }}
            />

            <OrdersTable 
              orders={filteredOrders}
              isAdmin
              adminPassword={password}
              onStatusChange={handleStatusChange}
              onOrderNumberChange={handleOrderNumberChange}
              onEstimatedDateChange={handleEstimatedDateChange}
              onShippingMethodChange={handleShippingMethodChange}
              updatingOrderId={updatingOrderId}
              showExport
              selectable
              selectedOrders={selectedOrders}
              onSelectionChange={setSelectedOrders}
              onAdminEdit={() => loadOrders(password)}
            />
          </TabsContent>

          <TabsContent value="delivered" className="space-y-4">
            <AdminDeliveredView 
              orders={orders} 
              password={password}
              onOrderUpdate={(orderId, updates) => {
                setOrders(prev => prev.map(o => 
                  o.id === orderId ? { ...o, ...updates } : o
                ));
              }}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <OrderFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              branches={branches}
            />
            <AdminDashboard orders={filteredOrders} />
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <AdminSupportCenter password={password} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <AdminSettings password={password} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
