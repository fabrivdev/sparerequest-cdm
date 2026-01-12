import { useState, useEffect } from 'react';
import { MessageCircle, User, MapPin, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminChatView from './AdminChatView';
import NewAdminConversationModal from './NewAdminConversationModal';

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  branch: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string;
  unread_count?: number;
}

interface AdminSupportCenterProps {
  password: string;
}

const AdminSupportCenter = ({ password }: AdminSupportCenterProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  useEffect(() => {
    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('admin-support-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [password]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getAdminConversations', password },
      });

      if (!error && data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (conversationId: string, newStatus: string) => {
    try {
      await supabase.functions.invoke('admin-orders', {
        body: { 
          action: 'updateConversationStatus', 
          password, 
          conversationId, 
          status: newStatus 
        },
      });
      
      fetchConversations();
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
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

  const filteredConversations = conversations.filter(
    conv => statusFilter === 'all' || conv.status === statusFilter
  );

  const openCount = conversations.filter(c => c.status === 'open').length;
  const pendingCount = conversations.filter(c => c.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Conversations list */}
      <div className="w-96 border rounded-lg flex flex-col">
        {/* Header with new conversation button */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Conversaciones</h3>
            <Button size="sm" onClick={() => setIsNewConversationOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Todos ({conversations.length})
            </Button>
            <Button
              variant={statusFilter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('open')}
            >
              Abiertos ({openCount})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pendientes ({pendingCount})
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm text-center">No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{conv.subject}</span>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{conv.user_name}</span>
                        <MapPin className="h-3 w-3 ml-1" />
                        <span>{conv.branch}</span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat view */}
      <div className="flex-1 border rounded-lg">
        {selectedConversation ? (
          <AdminChatView
            conversation={selectedConversation}
            password={password}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteConversation}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg">Selecciona una conversación</p>
            <p className="text-sm">para ver los mensajes</p>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      <NewAdminConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        password={password}
        onConversationCreated={fetchConversations}
      />
    </div>
  );
};

export default AdminSupportCenter;
