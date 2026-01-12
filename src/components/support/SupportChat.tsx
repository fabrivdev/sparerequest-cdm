import { useState, useEffect, useRef } from 'react';
import { X, Plus, Send, ArrowLeft, Image, Check, CheckCheck, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import NewConversationModal from './NewConversationModal';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import EmojiPicker from '@/components/ui/emoji-picker';

interface Conversation {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  image_url?: string;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  branch: string;
  onUnreadChange: (count: number) => void;
}

const SupportChat = ({ isOpen, onClose, userId, userName, branch, onUnreadChange }: SupportChatProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playNotificationSound } = useNotificationSound();

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);

      // Subscribe to new messages for this conversation
      const channel = supabase
        .channel(`conversation-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.sender_type === 'admin') {
              playNotificationSound();
              markMessagesAsRead(selectedConversation.id);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'support_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`,
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
    }
  }, [selectedConversation, playNotificationSound]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'admin')
      .eq('is_read', false);

    // Recalculate unread count
    const { data: allConversations } = await supabase
      .from('support_conversations')
      .select('id')
      .eq('user_id', userId);

    if (allConversations) {
      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', allConversations.map(c => c.id))
        .eq('sender_type', 'admin')
        .eq('is_read', false);

      onUnreadChange(count || 0);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!selectedConversation) return null;
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${selectedConversation.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('support-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('support-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async (imageUrl?: string) => {
    if ((!newMessage.trim() && !imageUrl) || !selectedConversation || sending) return;

    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: userId,
      sender_name: userName,
      sender_type: 'user',
      content: newMessage.trim() || (imageUrl ? 'Imagen adjunta' : ''),
      image_url: imageUrl || null,
    });

    if (!error) {
      // Update last_message_at
      await supabase
        .from('support_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage('');
    }
    setSending(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }

    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      await handleSendMessage(imageUrl);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateConversation = async (subject: string, initialMessage: string) => {
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .insert({
        user_id: userId,
        user_name: userName,
        branch,
        subject,
      })
      .select()
      .single();

    if (!convError && conversation) {
      // Send initial message
      await supabase.from('support_messages').insert({
        conversation_id: conversation.id,
        sender_id: userId,
        sender_name: userName,
        sender_type: 'user',
        content: initialMessage,
      });

      setIsNewConversationOpen(false);
      await fetchConversations();
      setSelectedConversation(conversation);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'resolved': return 'bg-muted';
      default: return 'bg-muted';
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

  const renderReadStatus = (message: Message) => {
    if (message.sender_type !== 'user') return null;
    
    return message.is_read ? (
      <CheckCheck className="h-3 w-3 text-blue-500" />
    ) : (
      <Check className="h-3 w-3 text-muted-foreground" />
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-background border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          {selectedConversation ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 ml-2">
                <h3 className="font-semibold text-sm truncate">{selectedConversation.subject}</h3>
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(selectedConversation.status)}
                </Badge>
              </div>
            </>
          ) : (
            <h3 className="font-semibold">Soporte</h3>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {selectedConversation ? (
          // Messages view
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.sender_type === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender_type === 'user'
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
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                      </span>
                      {renderReadStatus(message)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            {selectedConversation.status !== 'resolved' && (
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
                    placeholder="Escribe un mensaje..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  />
                  <Button size="icon" onClick={() => handleSendMessage()} disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          // Conversations list
          <>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm text-center">No tienes conversaciones de soporte</p>
                  <p className="text-xs text-center mt-1">Crea una nueva para contactar con el administrador</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate flex-1">{conv.subject}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* New conversation button */}
            <div className="p-4 border-t">
              <Button className="w-full" onClick={() => setIsNewConversationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva conversación
              </Button>
            </div>
          </>
        )}
      </div>

      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSubmit={handleCreateConversation}
      />
    </>
  );
};

export default SupportChat;
