import { useState, useEffect, useRef } from 'react';
import { Send, User, MapPin, Check, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  branch: string;
  subject: string;
  status: string;
  created_at: string;
}

interface AdminChatViewProps {
  conversation: Conversation;
  password: string;
  onStatusChange: (conversationId: string, newStatus: string) => void;
}

const AdminChatView = ({ conversation, password, onStatusChange }: AdminChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.sender_type === 'user') {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { 
          action: 'getConversationMessages', 
          password, 
          conversationId: conversation.id 
        },
      });

      if (!error && data?.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase.functions.invoke('admin-orders', {
        body: { 
          action: 'markMessagesAsRead', 
          password, 
          conversationId: conversation.id,
          readerType: 'admin'
        },
      });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: { 
          action: 'sendMessage', 
          password,
          conversationId: conversation.id,
          senderId: 'admin',
          senderName: 'Administrador',
          senderType: 'admin',
          content: newMessage.trim()
        },
      });

      if (!error) {
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'pending': return 'Pendiente';
      case 'resolved': return 'Resuelto';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'open': return 'default';
      case 'pending': return 'secondary';
      case 'resolved': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{conversation.subject}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{conversation.user_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{conversation.branch}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(conversation.created_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
              </div>
            </div>
          </div>
          <Badge variant={getStatusVariant(conversation.status)}>
            {getStatusLabel(conversation.status)}
          </Badge>
        </div>

        {/* Status actions */}
        <div className="flex gap-2 mt-3">
          {conversation.status !== 'resolved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(conversation.id, 'resolved')}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar como resuelto
            </Button>
          )}
          {conversation.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(conversation.id, 'pending')}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Marcar como pendiente
            </Button>
          )}
          {conversation.status === 'resolved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(conversation.id, 'open')}
            >
              Reabrir conversación
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.sender_type === 'admin' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">{message.sender_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender_type === 'admin'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {conversation.status !== 'resolved' && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe una respuesta..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatView;
