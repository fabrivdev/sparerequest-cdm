import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, ArrowLeft, Clock, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import OrderFilters, { OrderFiltersState } from '@/components/OrderFilters';
import OrdersTable, { Order } from '@/components/OrdersTable';

const ADMIN_SESSION_KEY = 'admin_session';

const Admin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    brand: '',
    productCode: '',
    branch: '',
    status: '',
  });

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

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    navigate('/');
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
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

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error('Error al actualizar');
    }

    setUpdatingOrderId(null);
  };

  // Get unique branches for filter dropdown
  const branches = useMemo(() => {
    return [...new Set(orders.map((o) => o.branch_destination))].sort();
  }, [orders]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const solicitado = orders.filter(o => o.status === 'solicitado').length;
    const entregado = orders.filter(o => o.status === 'entregado').length;
    return { pending, solicitado, entregado };
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.solicitado}</p>
                <p className="text-xs text-muted-foreground">Solicitados</p>
              </div>
            </div>
          </div>
          <div className="bg-card ios-shadow rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.entregado}</p>
                <p className="text-xs text-muted-foreground">Entregados</p>
              </div>
            </div>
          </div>
        </div>

        <OrderFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          branches={branches}
        />
        <OrdersTable 
          orders={filteredOrders}
          isAdmin
          onStatusChange={handleStatusChange}
          updatingOrderId={updatingOrderId}
          showExport
        />
      </main>
    </div>
  );
};

export default Admin;
