import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, DollarSign, Check, CheckCheck, Trash2 } from 'lucide-react';
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

interface Notification {
  id: string;
  type: string;
  user_id: string;
  user_name: string;
  brand: string | null;
  product_code: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AdminNotificationsProps {
  password: string;
}

const AdminNotifications = ({ password }: AdminNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getNotifications', password },
      });

      if (error || data.error) {
        console.error('Error fetching notifications:', error || data.error);
        return;
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [password]);

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Show toast for new notification
          const icon = newNotification.type === 'product_not_found' ? '⚠️' : '💲';
          toast.info(`${icon} ${newNotification.message}`, {
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'markNotificationRead', password, notificationId },
      });

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'markAllNotificationsRead', password },
      });

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        toast.success('Todas las notificaciones marcadas como leídas');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteReadNotifications = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'deleteReadNotifications', password },
      });

      if (!error) {
        setNotifications((prev) => prev.filter((n) => !n.is_read));
        toast.success('Notificaciones leídas eliminadas');
      }
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'product_not_found':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'zero_price_order':
        return <DollarSign className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-destructive hover:text-destructive"
                onClick={handleDeleteReadNotifications}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Eliminar leídas
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            notifications.slice(0, 50).map((notification) => (
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
                  <p className="text-sm leading-snug">{notification.message}</p>
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

export default AdminNotifications;
