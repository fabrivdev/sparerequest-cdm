import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Timer, TrendingUp, MapPin, Users, Package, Tag } from 'lucide-react';
import { Order } from '@/components/OrdersTable';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminDashboardProps {
  orders: Order[];
}

// Variaciones de verde para los gráficos
const GREEN_PALETTE = [
  'hsl(75, 46%, 44%)',   // Primary olive
  'hsl(75, 46%, 55%)',   // Lighter
  'hsl(75, 46%, 35%)',   // Darker
  'hsl(85, 40%, 50%)',   // More yellow-green
  'hsl(65, 50%, 45%)',   // More lime
  'hsl(90, 35%, 40%)',   // Forest
  'hsl(75, 30%, 60%)',   // Muted
  'hsl(80, 45%, 48%)',   // Vibrant
  'hsl(70, 40%, 52%)',   // Soft
  'hsl(75, 50%, 38%)',   // Deep
];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ChartSkeleton = () => (
  <div className="h-[300px] flex items-center justify-center">
    <div className="space-y-3 w-full px-4">
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-8 w-[90%] rounded-lg" />
      <Skeleton className="h-8 w-[80%] rounded-lg" />
      <Skeleton className="h-8 w-[70%] rounded-lg" />
      <Skeleton className="h-8 w-[60%] rounded-lg" />
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-lg" />
    ))}
  </div>
);

const AdminDashboard = ({ orders }: AdminDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [orders]);

  // Calculate time statistics (average time between status changes)
  const timeStats = useMemo(() => {
    const deliveredOrders = orders.filter(o => o.status === 'entregado');
    const solicitadoOrders = orders.filter(o => o.status === 'solicitado' || o.status === 'entregado');
    
    let avgPendingToSolicitado = 0;
    let avgSolicitadoToEntregado = 0;
    let avgTotalTime = 0;
    
    if (solicitadoOrders.length > 0) {
      const times = solicitadoOrders.map(o => {
        const created = new Date(o.created_at).getTime();
        const updated = new Date(o.updated_at || o.created_at).getTime();
        return (updated - created) / (1000 * 60 * 60);
      }).filter(t => t > 0);
      
      if (times.length > 0) {
        avgPendingToSolicitado = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }
    
    if (deliveredOrders.length > 0) {
      const times = deliveredOrders.map(o => {
        const created = new Date(o.created_at).getTime();
        const updated = new Date(o.updated_at || o.created_at).getTime();
        return (updated - created) / (1000 * 60 * 60);
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

  // Top SKUs with brand + code
  const topSkus = useMemo(() => {
    const skuMap: Record<string, { label: string; sku: string; brand: string; count: number; quantity: number }> = {};
    
    orders.forEach(o => {
      const key = `${o.brand}|${o.product_code}`;
      if (!skuMap[key]) {
        skuMap[key] = { 
          label: `${o.brand} - ${o.product_code}`,
          sku: o.product_code, 
          brand: o.brand, 
          count: 0, 
          quantity: 0 
        };
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

  // Orders by brand (pie chart)
  const ordersByBrand = useMemo(() => {
    const brandMap: Record<string, number> = {};
    
    orders.forEach(o => {
      brandMap[o.brand] = (brandMap[o.brand] || 0) + o.quantity;
    });
    
    return Object.entries(brandMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  // Orders by requester with monthly breakdown
  const requestersByMonth = useMemo(() => {
    const requesterMap: Record<string, { name: string; months: Record<number, number>; total: number }> = {};
    
    orders.forEach(o => {
      const name = (o as any).user_name || (o as any).user_email || 'Desconocido';
      const month = new Date(o.created_at).getMonth();
      
      if (!requesterMap[name]) {
        requesterMap[name] = { name, months: {}, total: 0 };
      }
      requesterMap[name].months[month] = (requesterMap[name].months[month] || 0) + 1;
      requesterMap[name].total += 1;
    });
    
    return Object.values(requesterMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [orders]);

  // Get current year months that have data
  const activeMonths = useMemo(() => {
    const monthsWithData = new Set<number>();
    orders.forEach(o => {
      monthsWithData.add(new Date(o.created_at).getMonth());
    });
    return Array.from(monthsWithData).sort((a, b) => a - b);
  }, [orders]);

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    } else {
      return `${(hours / 24).toFixed(1)} días`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg">
          <p className="font-medium text-sm text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-semibold text-primary">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Timer className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente → Solicitado</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatHours(timeStats.avgPendingToSolicitado)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center">
                <Timer className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitado → Entregado</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatHours(timeStats.avgSolicitadoToEntregado)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Total Promedio</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatHours(timeStats.avgTotalTime)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top SKUs */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Package className="w-5 h-5 text-primary" />
              Top 10 SKUs más pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkus} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis 
                      dataKey="label" 
                      type="category" 
                      width={130} 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="quantity" 
                      name="Unidades"
                      fill="hsl(75, 46%, 44%)" 
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Branch - Column Chart */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="w-5 h-5 text-primary" />
              Pedidos por Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersByBranch} margin={{ left: 10, right: 10, bottom: 60 }}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={80}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      name="Pedidos"
                      radius={[8, 8, 0, 0]}
                    >
                      {ordersByBranch.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={GREEN_PALETTE[index % GREEN_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Brand Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Tag className="w-5 h-5 text-primary" />
              Distribución por Marca
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByBrand}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {ordersByBrand.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={GREEN_PALETTE[index % GREEN_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, 'Unidades']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty placeholder or additional chart */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="w-5 h-5 text-primary" />
              Resumen General
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <span className="text-muted-foreground">Total Pedidos</span>
                  <span className="text-2xl font-bold text-primary">{orders.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <span className="text-muted-foreground">Total Unidades</span>
                  <span className="text-2xl font-bold text-primary">
                    {orders.reduce((acc, o) => acc + o.quantity, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <span className="text-muted-foreground">Marcas Únicas</span>
                  <span className="text-2xl font-bold text-primary">
                    {new Set(orders.map(o => o.brand)).size}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <span className="text-muted-foreground">Sucursales Activas</span>
                  <span className="text-2xl font-bold text-primary">
                    {new Set(orders.map(o => o.branch_destination)).size}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders by Requester - Table with Months */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="w-5 h-5 text-primary" />
            Top 10 Solicitantes por Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-semibold text-foreground">Solicitante</TableHead>
                    {activeMonths.map(month => (
                      <TableHead key={month} className="text-center font-semibold text-foreground">
                        {MONTHS[month]}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold text-primary">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestersByMonth.map((requester, idx) => (
                    <TableRow key={requester.name} className="border-0 hover:bg-primary/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[200px]">{requester.name}</span>
                        </div>
                      </TableCell>
                      {activeMonths.map(month => (
                        <TableCell key={month} className="text-center">
                          {requester.months[month] ? (
                            <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-primary/10 text-primary rounded-lg font-medium text-sm">
                              {requester.months[month]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[40px] px-3 py-1 bg-primary text-primary-foreground rounded-lg font-bold">
                          {requester.total}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
