import { useEffect, useState } from 'react';
import { Clock, Package, ArrowLeftRight, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'order' | 'transfer' | 'desarme';
  label: string;
  date: string;
}

const RecentActivity = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const [orders, transfers, desarmes] = await Promise.all([
        supabase.from('orders').select('id, product_code, brand, status, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('transfers').select('id, product_code, brand, status, updated_at').eq('requester_user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('desarmes').select('id, desarme_number, product_code, status, updated_at').eq('created_by', user.id).order('updated_at', { ascending: false }).limit(5),
      ]);

      const all: ActivityItem[] = [
        ...(orders.data || []).map(o => ({ id: o.id, type: 'order' as const, label: `${o.brand} ${o.product_code} — ${o.status}`, date: o.updated_at })),
        ...(transfers.data || []).map(t => ({ id: t.id, type: 'transfer' as const, label: `${t.brand} ${t.product_code} — ${t.status}`, date: t.updated_at })),
        ...(desarmes.data || []).map(d => ({ id: d.id, type: 'desarme' as const, label: `${d.desarme_number} ${d.product_code} — ${d.status}`, date: d.updated_at })),
      ];

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(all.slice(0, 10));
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const iconMap = { order: Package, transfer: ArrowLeftRight, desarme: Wrench };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin actividad reciente</p>
        ) : (
          items.map((item) => {
            const Icon = iconMap[item.type];
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: es })}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
