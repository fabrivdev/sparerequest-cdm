import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface AdminSupportIndicatorProps {
  password: string;
  onOpenSupport: () => void;
}

const AdminSupportIndicator = ({ password, onOpenSupport }: AdminSupportIndicatorProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-support-indicator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.sender_type === 'user') {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [password]);

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getAdminUnreadCount', password },
      });

      if (!error && data?.count !== undefined) {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onOpenSupport}
      className="relative"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default AdminSupportIndicator;
