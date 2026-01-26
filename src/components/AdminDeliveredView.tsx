import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, AlertTriangle, CheckCircle, User, Warehouse, Users, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Order } from '@/components/OrdersTable';
import { ORDER_DESTINATIONS } from '@/constants/destinations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminDeliveredViewProps {
  orders: Order[];
  password: string;
  onOrderUpdate: (orderId: string, updates: Partial<Order>) => void;
}

const AdminDeliveredView = ({ orders, password, onOrderUpdate }: AdminDeliveredViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only delivered orders
  const deliveredOrders = useMemo(() => {
    return orders
      .filter(order => order.status === 'entregado')
      .filter(order => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          order.product_code.toLowerCase().includes(term) ||
          order.brand.toLowerCase().includes(term) ||
          order.order_number?.toLowerCase().includes(term) ||
          order.branch_destination.toLowerCase().includes(term) ||
          (order as any).user_name?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime());
  }, [orders, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = deliveredOrders.length;
    const needsInvoicing = deliveredOrders.filter(o => 
      (o.order_destination === 'cliente' || o.order_destination === 'ambos') && !o.is_invoiced
    ).length;
    const invoiced = deliveredOrders.filter(o => 
      o.order_destination === 'stock' || o.is_invoiced
    ).length;
    const stockOnly = deliveredOrders.filter(o => o.order_destination === 'stock').length;
    
    return { total, needsInvoicing, invoiced, stockOnly };
  }, [deliveredOrders]);

  const getDestinationBadge = (destination: string) => {
    const destInfo = ORDER_DESTINATIONS.find(d => d.value === destination);
    if (!destInfo) return <Badge variant="secondary">-</Badge>;
    
    const Icon = destInfo.icon;
    const colorMap: Record<string, string> = {
      'cliente': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'stock': 'bg-green-500/10 text-green-600 border-green-500/20',
      'ambos': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    
    return (
      <Badge variant="outline" className={`${colorMap[destination] || ''} gap-1`}>
        <Icon className="w-3 h-3" />
        {destInfo.label}
      </Badge>
    );
  };

  const handleDestinationChange = async (orderId: string, newDestination: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: { 
          action: 'updateOrderDestination', 
          password, 
          orderId, 
          orderDestination: newDestination 
        },
      });

      if (error) {
        toast.error('Error al actualizar destino');
        return;
      }

      onOrderUpdate(orderId, { order_destination: newDestination });
      toast.success('Destino actualizado');
    } catch (err) {
      toast.error('Error al actualizar destino');
    }
  };

  const getInvoiceStatus = (order: Order) => {
    // Stock orders are always considered "N/A" for invoicing
    if (order.order_destination === 'stock') {
      return (
        <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
          N/A
        </Badge>
      );
    }
    
    // For cliente or ambos, check if invoiced
    if (order.is_invoiced) {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-600">Sí</span>
        </div>
      );
    }
    
    // Not invoiced - show warning
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-600">Pendiente</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Entregados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.needsInvoicing}</p>
                <p className="text-xs text-muted-foreground">Pte. Facturar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.invoiced}</p>
                <p className="text-xs text-muted-foreground">Facturados / N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/10 rounded-xl flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.stockOnly}</p>
                <p className="text-xs text-muted-foreground">Solo Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, marca, nro. pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 bg-secondary/50 border-0 pl-9 text-sm rounded-xl"
        />
      </div>

      {/* Table */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Pedidos Entregados - Control de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Entrega</TableHead>
                  <TableHead className="text-xs">Nro. Pedido</TableHead>
                  <TableHead className="text-xs">Usuario</TableHead>
                  <TableHead className="text-xs">Marca</TableHead>
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs text-center">Cant.</TableHead>
                  <TableHead className="text-xs">Sucursal</TableHead>
                  <TableHead className="text-xs">Observación</TableHead>
                  <TableHead className="text-xs">Destino</TableHead>
                  <TableHead className="text-xs">Facturado</TableHead>
                  <TableHead className="text-xs">Nro. Factura</TableHead>
                  <TableHead className="text-xs text-center">Cant. Fact.</TableHead>
                  <TableHead className="text-xs">Obs. Factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      No hay pedidos entregados
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveredOrders.map((order) => (
                    <TableRow key={order.id} className={
                      (order.order_destination === 'cliente' || order.order_destination === 'ambos') && !order.is_invoiced
                        ? 'bg-yellow-50/50 dark:bg-yellow-500/5'
                        : ''
                    }>
                      <TableCell className="text-xs">
                        {order.delivered_at 
                          ? format(new Date(order.delivered_at), 'dd/MM/yy', { locale: es })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {order.order_number || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(order as any).user_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.brand}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {order.product_code}
                      </TableCell>
                      <TableCell className="text-xs text-center font-medium">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.branch_destination}
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px]">
                        {order.observation ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block cursor-help">
                                  {order.observation}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{order.observation}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={order.order_destination} 
                          onValueChange={(value) => handleDestinationChange(order.id, value)}
                        >
                          <SelectTrigger className="h-8 w-[110px] text-xs border-0 bg-secondary/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_DESTINATIONS.map((dest) => {
                              const Icon = dest.icon;
                              return (
                                <SelectItem key={dest.value} value={dest.value}>
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="w-3 h-3" />
                                    {dest.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getInvoiceStatus(order)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.invoice_number || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        {order.invoiced_quantity ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {order.invoice_observation || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeliveredView;
