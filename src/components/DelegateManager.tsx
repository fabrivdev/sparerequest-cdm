import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DelegateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUpdate: () => void;
}

interface DelegateWithProfile {
  id: string;
  delegate_user_id: string;
  delegate_name: string;
  delegate_branch: string;
  is_active: boolean;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  branch: string;
}

const DelegateManager = ({ isOpen, onClose, userId, onUpdate }: DelegateManagerProps) => {
  const [delegates, setDelegates] = useState<DelegateWithProfile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchDelegates = async () => {
    setIsLoading(true);
    
    // Fetch existing delegates
    const { data: delegatesData, error: delegatesError } = await supabase
      .from('invoice_delegates')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true);

    if (delegatesError) {
      console.error('Error fetching delegates:', delegatesError);
      setIsLoading(false);
      return;
    }

    if (delegatesData && delegatesData.length > 0) {
      // Fetch profiles for delegates
      const delegateUserIds = delegatesData.map(d => d.delegate_user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, branch')
        .in('user_id', delegateUserIds);

      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      const delegatesWithProfiles: DelegateWithProfile[] = delegatesData.map(d => ({
        id: d.id,
        delegate_user_id: d.delegate_user_id,
        delegate_name: profileMap.get(d.delegate_user_id)?.full_name || 'Usuario desconocido',
        delegate_branch: profileMap.get(d.delegate_user_id)?.branch || '',
        is_active: d.is_active,
      }));

      setDelegates(delegatesWithProfiles);
    } else {
      setDelegates([]);
    }

    setIsLoading(false);
  };

  const fetchAvailableUsers = async () => {
    // Fetch all users except current user
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, branch')
      .neq('user_id', userId)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setAvailableUsers(data || []);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDelegates();
      fetchAvailableUsers();
    }
  }, [isOpen, userId]);

  const handleAddDelegate = async () => {
    if (!selectedUser) {
      toast.error('Selecciona un usuario');
      return;
    }

    // Check if already exists
    if (delegates.some(d => d.delegate_user_id === selectedUser)) {
      toast.error('Este usuario ya es delegado');
      return;
    }

    setIsAdding(true);

    const { error } = await supabase
      .from('invoice_delegates')
      .insert({
        owner_user_id: userId,
        delegate_user_id: selectedUser,
        is_active: true,
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        // Reactivate existing delegate
        const { error: updateError } = await supabase
          .from('invoice_delegates')
          .update({ is_active: true })
          .eq('owner_user_id', userId)
          .eq('delegate_user_id', selectedUser);

        if (updateError) {
          toast.error('Error al agregar delegado');
        } else {
          toast.success('Delegado agregado');
          setSelectedUser('');
          fetchDelegates();
          onUpdate();
        }
      } else {
        toast.error('Error al agregar delegado');
        console.error(error);
      }
    } else {
      toast.success('Delegado agregado');
      setSelectedUser('');
      fetchDelegates();
      onUpdate();
    }

    setIsAdding(false);
  };

  const handleRemoveDelegate = async (delegateId: string) => {
    const { error } = await supabase
      .from('invoice_delegates')
      .update({ is_active: false })
      .eq('id', delegateId);

    if (error) {
      toast.error('Error al eliminar delegado');
      console.error(error);
    } else {
      toast.success('Delegado eliminado');
      fetchDelegates();
      onUpdate();
    }
  };

  // Filter available users to exclude existing delegates
  const filteredAvailableUsers = availableUsers.filter(
    u => !delegates.some(d => d.delegate_user_id === u.user_id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Gestionar Delegados
          </DialogTitle>
          <DialogDescription>
            Permite que otros usuarios facturen tus pedidos entregados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new delegate */}
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {filteredAvailableUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name || 'Usuario'} ({user.branch})
                  </SelectItem>
                ))}
                {filteredAvailableUsers.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay usuarios disponibles
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAddDelegate} disabled={!selectedUser || isAdding}>
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Current delegates list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Delegados actuales ({delegates.length})
            </p>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : delegates.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                No tienes delegados asignados
              </div>
            ) : (
              <div className="space-y-2">
                {delegates.map((delegate) => (
                  <div
                    key={delegate.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                  >
                    <div>
                      <p className="font-medium text-sm">{delegate.delegate_name}</p>
                      <p className="text-xs text-muted-foreground">{delegate.delegate_branch}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveDelegate(delegate.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelegateManager;
