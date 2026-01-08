import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Timer, TrendingUp, MapPin, Users, Package } from 'lucide-react';
import { Order } from '@/components/OrdersTable';

interface AdminDashboardProps {
  orders: Order[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminDashboard = ({ orders }: AdminDashboardProps) => {
  // Calculate time statistics (average time between status changes)
  const timeStats = useMemo(() => {
    const deliveredOrders = orders.filter(o => o.status === 'entregado');
    const solicitadoOrders = orders.filter(o => o.status === 'solicitado' || o.status === 'entregado');
    
    // Average time from pending to solicitado (using created_at to updated_at for solicitado orders)
    let avgPendingToSolicitado = 0;
    let avgSolicitadoToEntregado = 0;
    let avgTotalTime = 0;
    
    // For orders that are at least solicitado, calculate time from creation
    if (solicitadoOrders.length > 0) {
      const times = solicitadoOrders.map(o => {
        const created = new Date(o.created_at).getTime();
        const updated = new Date(o.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60); // hours
      }).filter(t => t > 0);
      
      if (times.length > 0) {
        avgPendingToSolicitado = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }
    
    // For delivered orders, calculate total time
    if (deliveredOrders.length > 0) {
      const times = deliveredOrders.map(o => {
        const created = new Date(o.created_at).getTime();
        const updated = new Date(o.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60); // hours
      }).filter(t => t > 0);
      
      if (times.length > 0) {
        avgTotalTime = times.reduce((a, b) => a + b, 0) / times.length;
        avgSolicitadoToEntregado = avgTotalTime - avgPendingToSolicitado;
      }
    }
    
    return {
      avgPendingToSolicitado: Math.max(0, avgPendingToSolicitado),
      avgSolicitadoToEntregado: Math.max(0, avgSolicitadoToEntregado),
      avgTotalTime: Math.max(0, avgTotalTime),
    };
  }, [orders]);

  // Top SKUs
  const topSkus = useMemo(() => {
    const skuMap: Record<string, { sku: string; brand: string; count: number; quantity: number }> = {};
    
    orders.forEach(o => {
      const key = `${o.brand}|${o.product_code}`;
      if (!skuMap[key]) {
        skuMap[key] = { sku: o.product_code, brand: o.brand, count: 0, quantity: 0 };
      }
      skuMap[key].count += 1;
      skuMap[key].quantity += o.quantity;
    });
    
    return Object.values(skuMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orders]);

  // Orders by branch
  const ordersByBranch = useMemo(() => {
    const branchMap: Record<string, number> = {};
    
    orders.forEach(o => {
      branchMap[o.branch_destination] = (branchMap[o.branch_destination] || 0) + 1;
    });
    
    return Object.entries(branchMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  // Orders by requester
  const ordersByRequester = useMemo(() => {
    const requesterMap: Record<string, { name: string; count: number; quantity: number }> = {};
    
    orders.forEach(o => {
      const name = (o as any).user_name || (o as any).user_email || 'Desconocido';
      if (!requesterMap[name]) {
        requesterMap[name] = { name, count: 0, quantity: 0 };
      }
      requesterMap[name].count += 1;
      requesterMap[name].quantity += o.quantity;
    });
    
    return Object.values(requesterMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [orders]);

  // Format hours to readable string
  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    } else {
      return `${(hours / 24).toFixed(1)} días`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente → Solicitado</p>
                <p className="text-2xl font-bold">{formatHours(timeStats.avgPendingToSolicitado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitado → Entregado</p>
                <p className="text-2xl font-bold">{formatHours(timeStats.avgSolicitadoToEntregado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Total Promedio</p>
                <p className="text-2xl font-bold">{formatHours(timeStats.avgTotalTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top SKUs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4" />
              Top 10 SKUs más pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSkus} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="sku" 
                    type="category" 
                    width={80} 
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name === 'quantity' ? 'Unidades' : 'Pedidos']}
                    labelFormatter={(label) => `SKU: ${label}`}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Branch */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Pedidos por Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByBranch}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {ordersByBranch.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Pedidos']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Requester */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Top 10 Solicitantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByRequester} margin={{ left: 40, right: 20, bottom: 60 }}>
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name === 'count' ? 'Pedidos' : 'Unidades']}
                />
                <Bar dataKey="count" name="Pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quantity" name="Unidades" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
