import { useState, useEffect, useRef } from 'react';
import { Send, User, MapPin, Check, Clock, AlertCircle, Trash2, Image, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import EmojiPicker from '@/components/ui/emoji-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  image_url?: string;
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
  onDelete?: (conversationId: string) => void;
}

const AdminChatView = ({ conversation, password, onStatusChange, onDelete }: AdminChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playNotificationSound } = useNotificationSound();

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
            playNotificationSound();
            markMessagesAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, playNotificationSound]);

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

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin/${conversation.id}/${Date.now()}.${fileExt}`;
      
      // Admin uses service role through edge function for upload
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'uploadSupportImage',
          password,
          fileName,
          fileBase64: await fileToBase64(file),
          contentType: file.type,
        },
      });

      if (error) throw error;
      return data?.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleSendMessage = async (imageUrl?: string) => {
    if ((!newMessage.trim() && !imageUrl) || sending) return;

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
          content: newMessage.trim() || (imageUrl ? 'Imagen adjunta' : ''),
          imageUrl: imageUrl || null,
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }

    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      await handleSendMessage(imageUrl);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConversation = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'deleteConversation',
          password,
          conversationId: conversation.id,
        },
      });

      if (!error && onDelete) {
        onDelete(conversation.id);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
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

  const renderReadStatus = (message: Message) => {
    if (message.sender_type !== 'admin') return null;
    
    return message.is_read ? (
      <CheckCheck className="h-3 w-3 text-blue-500" />
    ) : (
      <Check className="h-3 w-3 text-muted-foreground" />
    );
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
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(conversation.status)}>
              {getStatusLabel(conversation.status)}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará la conversación y todos los mensajes de forma permanente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
                {message.image_url && (
                  <a href={message.image_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={message.image_url} 
                      alt="Imagen adjunta" 
                      className="max-w-full rounded-md mb-2 cursor-pointer hover:opacity-90"
                    />
                  </a>
                )}
                {message.content && message.content !== 'Imagen adjunta' && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {renderReadStatus(message)}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image className="h-4 w-4" />
              )}
            </Button>
            <EmojiPicker 
              onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
              disabled={sending}
            />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe una respuesta..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
            <Button onClick={() => handleSendMessage()} disabled={sending || !newMessage.trim()}>
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
