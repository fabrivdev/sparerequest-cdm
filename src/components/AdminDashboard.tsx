import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { Timer, TrendingUp, MapPin, Users, Package, Tag, DollarSign, UserCheck, Plane, Ship } from 'lucide-react';
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

// Brand colors
const BRAND_COLORS: Record<string, string> = {
  'CLAAS': '#B4C618',
  'HORSCH': '#A01B1B',
};

// Fallback palette for other brands
const GREEN_PALETTE = [
  'hsl(75, 46%, 44%)',
  'hsl(75, 46%, 55%)',
  'hsl(75, 46%, 35%)',
  'hsl(85, 40%, 50%)',
  'hsl(65, 50%, 45%)',
  'hsl(90, 35%, 40%)',
  'hsl(75, 30%, 60%)',
  'hsl(80, 45%, 48%)',
  'hsl(70, 40%, 52%)',
  'hsl(75, 50%, 38%)',
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
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [orders]);

  // Calculate time statistics (average time between status changes)
  const timeStats = useMemo(() => {
    // Orders that have requested_at (went from pending to solicitado)
    const ordersWithRequestedAt = orders.filter(o => o.requested_at);
    // Orders that have delivered_at (went from solicitado to entregado)
    const ordersWithDeliveredAt = orders.filter(o => o.delivered_at && o.requested_at);
    
    let avgPendingToSolicitado = 0;
    let avgSolicitadoToEntregado = 0;
    let avgTotalTime = 0;
    
    // Calculate average time from created_at to requested_at (pending → solicitado)
    if (ordersWithRequestedAt.length > 0) {
      const times = ordersWithRequestedAt.map(o => {
        const created = new Date(o.created_at).getTime();
        const requested = new Date(o.requested_at!).getTime();
        return (requested - created) / (1000 * 60 * 60); // hours
      }).filter(t => t >= 0);
      
      if (times.length > 0) {
        avgPendingToSolicitado = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }
    
    // Calculate average time from requested_at to delivered_at (solicitado → entregado)
    if (ordersWithDeliveredAt.length > 0) {
      const times = ordersWithDeliveredAt.map(o => {
        const requested = new Date(o.requested_at!).getTime();
        const delivered = new Date(o.delivered_at!).getTime();
        return (delivered - requested) / (1000 * 60 * 60); // hours
      }).filter(t => t >= 0);
      
      if (times.length > 0) {
        avgSolicitadoToEntregado = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }
    
    // Calculate total average time (created_at to delivered_at)
    if (ordersWithDeliveredAt.length > 0) {
      const times = ordersWithDeliveredAt.map(o => {
        const created = new Date(o.created_at).getTime();
        const delivered = new Date(o.delivered_at!).getTime();
        return (delivered - created) / (1000 * 60 * 60); // hours
      }).filter(t => t >= 0);
      
      if (times.length > 0) {
        avgTotalTime = times.reduce((a, b) => a + b, 0) / times.length;
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

  // Orders by brand (pie chart) with percentages and brand colors
  const ordersByBrand = useMemo(() => {
    const brandMap: Record<string, number> = {};
    
    orders.forEach(o => {
      brandMap[o.brand] = (brandMap[o.brand] || 0) + o.quantity;
    });
    
    const total = Object.values(brandMap).reduce((a, b) => a + b, 0);
    
    return Object.entries(brandMap)
      .map(([name, value], index) => ({ 
        name, 
        value, 
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
        color: BRAND_COLORS[name] || GREEN_PALETTE[index % GREEN_PALETTE.length]
      }))
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

  // Calculate total value, active sellers, and shipping method stats
  const summaryStats = useMemo(() => {
    const totalValue = orders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    const activeSellers = new Set(orders.map(o => (o as any).user_id || (o as any).user_email)).size;
    const totalUnits = orders.reduce((acc, o) => acc + o.quantity, 0);
    const activeBranches = new Set(orders.map(o => o.branch_destination)).size;
    
    // Shipping method stats
    const aereoOrders = orders.filter(o => (o as any).shipping_method === 'aereo' || !(o as any).shipping_method);
    const maritimoOrders = orders.filter(o => (o as any).shipping_method === 'maritimo');
    const aereoUnits = aereoOrders.reduce((sum, o) => sum + o.quantity, 0);
    const maritimoUnits = maritimoOrders.reduce((sum, o) => sum + o.quantity, 0);
    const aereoValue = aereoOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    const maritimoValue = maritimoOrders.reduce((sum, o) => sum + ((o as any).total_price || 0), 0);
    
    return { 
      totalValue, 
      activeSellers, 
      totalUnits, 
      activeBranches,
      aereoCount: aereoOrders.length,
      maritimoCount: maritimoOrders.length,
      aereoUnits,
      maritimoUnits,
      aereoValue,
      maritimoValue
    };
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

  const renderCustomizedLabel = ({ x, y, width, value }: any) => {
    return (
      <text 
        x={x + width / 2} 
        y={y - 8} 
        fill="hsl(var(--foreground))" 
        textAnchor="middle" 
        fontSize={12}
        fontWeight={600}
      >
        {value}
      </text>
    );
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

        {/* Orders by Branch - Column Chart with data labels */}
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
                  <BarChart data={ordersByBranch} margin={{ left: 10, right: 10, bottom: 60, top: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={80}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      name="Pedidos"
                      radius={[8, 8, 0, 0]}
                    >
                      {ordersByBranch.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={GREEN_PALETTE[index % GREEN_PALETTE.length]} />
                      ))}
                      <LabelList dataKey="value" content={renderCustomizedLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - Brand Pie Chart with percentages */}
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
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    >
                      {ordersByBrand.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [`${value} unidades (${props.payload.percentage}%)`, name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary with Total Value and Active Sellers */}
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
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Total Pedidos</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{orders.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Total Unidades</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {summaryStats.totalUnits.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Valor Total</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    ${summaryStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Vendedores Activos</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {summaryStats.activeSellers}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Sucursales Activas</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {summaryStats.activeBranches}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shipping Method Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Plane className="w-7 h-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Envíos Aéreos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{summaryStats.aereoCount} pedidos</p>
                    <p className="text-sm text-muted-foreground">
                      {summaryStats.aereoUnits.toLocaleString()} unidades • ${summaryStats.aereoValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center">
                <Ship className="w-7 h-7 text-cyan-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Envíos Marítimos</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{summaryStats.maritimoCount} pedidos</p>
                    <p className="text-sm text-muted-foreground">
                      {summaryStats.maritimoUnits.toLocaleString()} unidades • ${summaryStats.maritimoValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
