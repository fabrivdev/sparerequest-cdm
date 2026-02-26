import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationsPreview = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      setNotifications(data || []);
    };
    fetch();

    const ch = supabase.channel('home-notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notificaciones
          {notifications.length > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
              {notifications.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin notificaciones nuevas</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-2.5 bg-secondary/30 rounded-lg">
              <p className="text-xs font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsPreview;
