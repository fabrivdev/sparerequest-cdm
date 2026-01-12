import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  branch: string;
}

interface NewAdminConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  onConversationCreated: () => void;
}

const NewAdminConversationModal = ({ isOpen, onClose, password, onConversationCreated }: NewAdminConversationModalProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          u =>
            (u.full_name?.toLowerCase().includes(query)) ||
            u.branch.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getAllUsers', password },
      });

      if (!error && data?.users) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !subject.trim() || !message.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'createAdminConversation',
          password,
          targetUserId: selectedUser.user_id,
          targetUserName: selectedUser.full_name || 'Usuario',
          targetBranch: selectedUser.branch,
          subject: subject.trim(),
          initialMessage: message.trim(),
        },
      });

      if (!error && data?.success) {
        onConversationCreated();
        handleClose();
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setSubject('');
    setMessage('');
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva conversación con usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedUser ? (
            // User selection step
            <>
              <div>
                <Label className="text-sm font-medium mb-2 block">Buscar usuario</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o sucursal..."
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                {fetchingUsers ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No se encontraron usuarios</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.user_id}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.full_name || 'Sin nombre'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{user.branch}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            // Message composition step
            <>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.branch}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Cambiar
                </Button>
              </div>

              <div>
                <Label htmlFor="subject">Asunto</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Actualización de producto, Información importante..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !subject.trim() || !message.trim()}
                >
                  {loading ? 'Enviando...' : 'Enviar mensaje'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAdminConversationModal;
