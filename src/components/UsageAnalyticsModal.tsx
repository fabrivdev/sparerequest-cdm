import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, Calendar, TrendingUp, Activity } from 'lucide-react';
import { format, subDays, startOfDay, getDay, getHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface UsageAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Session {
  id: string;
  user_id: string;
  user_name: string;
  branch: string;
  connected_at: string;
  disconnected_at: string | null;
  duration_minutes: number | null;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const GREEN_PALETTE = [
  'hsl(75, 46%, 44%)', 'hsl(75, 46%, 55%)', 'hsl(75, 46%, 35%)',
  'hsl(85, 40%, 50%)', 'hsl(65, 50%, 45%)', 'hsl(90, 35%, 40%)',
  'hsl(75, 30%, 60%)', 'hsl(80, 45%, 48%)',
];

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

const UsageAnalyticsModal = ({ isOpen, onClose }: UsageAnalyticsModalProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const fetchSessions = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('connected_at', thirtyDaysAgo)
        .order('connected_at', { ascending: false });

      if (!error && data) {
        setSessions(data as Session[]);
      }
      setIsLoading(false);
    };

    fetchSessions();
  }, [isOpen]);

  // Summary stats
  const stats = useMemo(() => {
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;
    const completedSessions = sessions.filter(s => s.duration_minutes != null);
    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;
    const totalSessions = sessions.length;
    const avgSessionsPerUser = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;
    return { uniqueUsers, avgDuration, totalSessions, avgSessionsPerUser };
  }, [sessions]);

  // Connections per day (last 30 days)
  const dailyConnections = useMemo(() => {
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'dd/MM');
      dayMap[d] = 0;
    }
    sessions.forEach(s => {
      const key = format(new Date(s.connected_at), 'dd/MM');
      if (dayMap[key] !== undefined) dayMap[key]++;
    });
    return Object.entries(dayMap).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  // Peak hours (0-23)
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, value: 0 }));
    sessions.forEach(s => {
      const h = getHours(new Date(s.connected_at));
      hours[h].value++;
    });
    return hours;
  }, [sessions]);

  // Peak days of week
  const weekdayActivity = useMemo(() => {
    const days = DAY_NAMES.map(name => ({ name, value: 0 }));
    sessions.forEach(s => {
      const d = getDay(new Date(s.connected_at));
      days[d].value++;
    });
    return days;
  }, [sessions]);

  // Top users by sessions
  const topUsers = useMemo(() => {
    const userMap: Record<string, { name: string; branch: string; sessions: number; totalMinutes: number }> = {};
    sessions.forEach(s => {
      if (!userMap[s.user_id]) {
        userMap[s.user_id] = { name: s.user_name, branch: s.branch, sessions: 0, totalMinutes: 0 };
      }
      userMap[s.user_id].sessions++;
      userMap[s.user_id].totalMinutes += s.duration_minutes || 0;
    });
    return Object.values(userMap).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  }, [sessions]);

  // Users by branch
  const branchStats = useMemo(() => {
    const branchMap: Record<string, number> = {};
    sessions.forEach(s => {
      branchMap[s.branch] = (branchMap[s.branch] || 0) + 1;
    });
    return Object.entries(branchMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sessions]);

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)} min`;
    return `${(mins / 60).toFixed(1)} hrs`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Estadísticas de Uso del Sitio
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Últimos 30 días</p>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-10" /> : (
                    <p className="text-xl font-bold text-foreground">{stats.uniqueUsers}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Usuarios únicos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-10" /> : (
                    <p className="text-xl font-bold text-foreground">{stats.totalSessions}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Sesiones totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-10" /> : (
                    <p className="text-xl font-bold text-foreground">{formatMinutes(stats.avgDuration)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Duración promedio</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-10" /> : (
                    <p className="text-xl font-bold text-foreground">{stats.avgSessionsPerUser.toFixed(1)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Sesiones/usuario</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Connections Line Chart */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conexiones diarias</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyConnections}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" name="Conexiones" stroke="hsl(75, 46%, 44%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours & Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Horarios frecuentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyActivity}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Conexiones" fill="hsl(75, 46%, 44%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Días de la semana</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayActivity}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Conexiones" radius={[4, 4, 0, 0]}>
                        {weekdayActivity.map((_, i) => (
                          <Cell key={i} fill={GREEN_PALETTE[i % GREEN_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Users & Branch Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Usuarios más activos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {topUsers.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.branch}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold">{u.sessions} sesiones</p>
                        <p className="text-[10px] text-muted-foreground">{formatMinutes(u.totalMinutes)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Conexiones por Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full rounded-lg" />
              ) : branchStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={branchStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {branchStats.map((_, i) => (
                          <Cell key={i} fill={GREEN_PALETTE[i % GREEN_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center -mt-2">
                    {branchStats.slice(0, 6).map((b, i) => (
                      <span key={i} className="text-[10px] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: GREEN_PALETTE[i % GREEN_PALETTE.length] }} />
                        {b.name} ({b.value})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsageAnalyticsModal;
