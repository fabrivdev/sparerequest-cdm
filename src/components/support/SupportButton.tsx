import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import SupportChat from './SupportChat';

interface SupportButtonProps {
  userId: string;
  userName: string;
  branch: string;
}

const SupportButton = ({ userId, userName, branch }: SupportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      // Get user's conversations
      const { data: conversations } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('user_id', userId);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Count unread messages from admin
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .eq('sender_type', 'admin')
          .eq('is_read', false);

        setUnreadCount(count || 0);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('user-support-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.sender_type === 'admin') {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="fixed right-6 h-14 w-14 rounded-full shadow-lg z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <SupportChat
        isOpen={isOpen}
        onClose={handleClose}
        userId={userId}
        userName={userName}
        branch={branch}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
};

export default SupportButton;
