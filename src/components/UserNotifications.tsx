import { useState, useEffect } from 'react';
import { Bell, Package, Truck, ArrowRightLeft, CheckCheck, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface UserNotificationsProps {
  userId: string;
}

const UserNotifications = ({ userId }: UserNotificationsProps) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playNotificationSound } = useNotificationSound();

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user notifications:', error);
    } else {
      setNotifications((data as unknown as UserNotification[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as UserNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          playNotificationSound();
          toast.info(newNotif.message, { duration: 5000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, playNotificationSound]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('Todas las notificaciones marcadas como leídas');
    }
  };

  const handleDeleteRead = async () => {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('is_read', true);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      toast.success('Notificaciones leídas eliminadas');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_delivered':
        return <Package className="w-4 h-4 text-green-500" />;
      case 'order_status_change':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'transfer_request':
        return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
      case 'transfer_dispatched':
        return <Truck className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 relative text-muted-foreground hover:text-primary"
          title="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Notificaciones</h4>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0 ? 'Sin notificaciones nuevas' : `${unreadCount} sin leer`}
            </p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllAsRead}>
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-destructive hover:text-destructive"
                onClick={handleDeleteRead}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No hay notificaciones</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-3 p-3 border-b border-border last:border-b-0 transition-colors cursor-pointer ${
                  notification.is_read ? 'bg-background' : 'bg-primary/5 hover:bg-primary/10'
                }`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{notification.title}</p>
                  <p className="text-sm leading-snug text-muted-foreground">{notification.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserNotifications;
