import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

const ALL_PERMISSIONS = [
  { key: 'ver_compras', label: 'Ver Compras', group: 'Compras' },
  { key: 'crear_pedido', label: 'Crear Pedido', group: 'Compras' },
  { key: 'ver_transferencias', label: 'Ver Transferencias', group: 'Transferencias' },
  { key: 'solicitar_transferencia', label: 'Solicitar Transferencia', group: 'Transferencias' },
  { key: 'ver_desarmes', label: 'Ver Desarmes', group: 'Desarmes' },
  { key: 'crear_desarme', label: 'Crear Desarme', group: 'Desarmes' },
  { key: 'cotizar_desarme', label: 'Cotizar Desarme', group: 'Desarmes' },
  { key: 'autorizar_desarme', label: 'Autorizar Desarme', group: 'Desarmes' },
  { key: 'seguimiento_desarme', label: 'Seguimiento Desarme', group: 'Desarmes' },
];

interface AdminUsersPermissionsProps {
  password: string;
}

const AdminUsersPermissions = ({ password }: AdminUsersPermissionsProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-orders', {
      body: { action: 'getUsers', password },
    });
    if (!error && data?.users) {
      setUsers(data.users);
    }
    setLoading(false);
  };

  const openPermissions = async (user: Profile) => {
    setSelectedUser(user);
    setLoadingPerms(true);
    const { data, error } = await supabase.functions.invoke('admin-orders', {
      body: { action: 'getUserPermissions', password, targetUserId: user.user_id },
    });
    if (!error && data?.permissions) {
      setUserPermissions(data.permissions);
    } else {
      setUserPermissions([]);
    }
    setLoadingPerms(false);
  };

  const togglePermission = (perm: string) => {
    setUserPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-orders', {
      body: { action: 'setUserPermissions', password, targetUserId: selectedUser.user_id, permissions: userPermissions },
    });
    if (error || data?.error) {
      toast.error('Error al guardar permisos');
    } else {
      toast.success('Permisos actualizados');
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(term) ||
      u.branch.toLowerCase().includes(term)
    );
  });

  const groups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuario o sucursal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => openPermissions(user)}
              className="flex items-center justify-between bg-card border border-border rounded-xl p-3 hover:bg-accent/50 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{user.branch}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Configurar</Badge>
            </button>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No se encontraron usuarios</p>
          )}
        </div>
      )}

      {/* Permissions Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Permisos – {selectedUser?.full_name || 'Usuario'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{selectedUser?.branch}</p>
          </DialogHeader>

          {loadingPerms ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map(group => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                  <div className="space-y-2">
                    {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                      <div key={perm.key} className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground">{perm.label}</span>
                        <Switch
                          checked={userPermissions.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={savePermissions} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar permisos
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPermissions;
