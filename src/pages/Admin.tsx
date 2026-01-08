import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Loader2, 
  Package, 
  MapPin, 
  Calendar,
  Hash,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ADMIN_SESSION_KEY = 'admin_session';

interface Order {
  id: string;
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/10 text-warning' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'entregado', label: 'Entregado', color: 'bg-primary/10 text-primary' },
];

const Admin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${statusOption?.color || 'bg-muted text-muted-foreground'} border-0 font-medium`}>
        {statusOption?.label || status}
      </Badge>
    );
  };

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
      <header className="sticky top-0 z-50 glass border-b border-border/50">
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

      {/* Orders List */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-card ios-shadow rounded-xl p-4 animate-fade-in"
            >
              {/* Row 1: Brand, Code, Status */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{order.brand}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      <span className="truncate">{order.product_code}</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Row 2: Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
                <div className="bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">Cantidad</span>
                  <p className="font-medium">{order.quantity}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>Destino</span>
                  </div>
                  <p className="font-medium truncate">{order.branch_destination}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg px-3 py-2 col-span-2 sm:col-span-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>Fecha</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(order.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              {/* Observation */}
              {order.observation && (
                <div className="bg-accent/50 rounded-lg px-3 py-2 mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <FileText className="w-3 h-3" />
                    <span>Observación</span>
                  </div>
                  <p className="text-sm">{order.observation}</p>
                </div>
              )}

              {/* Status Update */}
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Cambiar estado:</span>
                <Select
                  value={order.status}
                  onValueChange={(value) => handleStatusChange(order.id, value)}
                  disabled={updatingOrderId === order.id}
                >
                  <SelectTrigger className="w-40 h-9 bg-secondary/50 border-0">
                    {updatingOrderId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay pedidos registrados</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;