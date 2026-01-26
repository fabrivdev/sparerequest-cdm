import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  color: string;
  text_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminSettingsProps {
  password: string;
}

const AdminSettings = ({ password }: AdminSettingsProps) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#888888');
  const [textColor, setTextColor] = useState('text-white');
  const [isActive, setIsActive] = useState(true);

  const fetchProviders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Error al cargar proveedores');
      console.error(error);
    } else {
      setProviders(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const openCreateModal = () => {
    setEditingProvider(null);
    setName('');
    setColor('#888888');
    setTextColor('text-white');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setName(provider.name);
    setColor(provider.color);
    setTextColor(provider.text_color);
    setIsActive(provider.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: editingProvider ? 'updateProvider' : 'createProvider',
          password,
          providerId: editingProvider?.id,
          providerData: {
            name: name.trim(),
            color,
            text_color: textColor,
            is_active: isActive,
          },
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al guardar proveedor');
      } else {
        toast.success(editingProvider ? 'Proveedor actualizado' : 'Proveedor creado');
        setIsModalOpen(false);
        fetchProviders();
      }
    } catch (err) {
      toast.error('Error al guardar proveedor');
    }

    setIsSaving(false);
  };

  const handleDelete = async (provider: Provider) => {
    if (!confirm(`¿Estás seguro de eliminar "${provider.name}"?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'deleteProvider',
          password,
          providerId: provider.id,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al eliminar proveedor');
      } else {
        toast.success('Proveedor eliminado');
        fetchProviders();
      }
    } catch (err) {
      toast.error('Error al eliminar proveedor');
    }
  };

  const handleToggleActive = async (provider: Provider) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'updateProvider',
          password,
          providerId: provider.id,
          providerData: {
            is_active: !provider.is_active,
          },
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al actualizar proveedor');
      } else {
        toast.success(`Proveedor ${!provider.is_active ? 'activado' : 'desactivado'}`);
        fetchProviders();
      }
    } catch (err) {
      toast.error('Error al actualizar proveedor');
    }
  };

  // Determine if text should be light or dark based on background color
  const getContrastTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'text-black' : 'text-white';
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Proveedores / Marcas</CardTitle>
                <CardDescription>Administra los proveedores disponibles para pedidos</CardDescription>
              </div>
            </div>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay proveedores configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      className={`${provider.text_color} font-semibold text-sm border-0`}
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name}
                    </Badge>
                    {!provider.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={provider.is_active}
                      onCheckedChange={() => handleToggleActive(provider)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(provider)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(provider)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider
                ? 'Modifica los datos del proveedor'
                : 'Ingresa los datos del nuevo proveedor'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: CLAAS-ARG"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color de fondo</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setTextColor(getContrastTextColor(e.target.value));
                  }}
                  className="h-10 w-20 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setTextColor(getContrastTextColor(e.target.value));
                  }}
                  placeholder="#888888"
                  className="h-10 flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="flex items-center gap-3">
                <Badge
                  className={`${textColor} font-semibold text-sm border-0`}
                  style={{ backgroundColor: color }}
                >
                  {name || 'PROVEEDOR'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active">Activo</Label>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
