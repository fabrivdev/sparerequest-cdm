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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Pencil, Trash2, Loader2, Building2, MapPin } from 'lucide-react';
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

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminSettingsProps {
  password: string;
}

const AdminSettings = ({ password }: AdminSettingsProps) => {
  // Provider state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  // Provider form state
  const [providerName, setProviderName] = useState('');
  const [providerColor, setProviderColor] = useState('#888888');
  const [providerTextColor, setProviderTextColor] = useState('text-white');
  const [providerIsActive, setProviderIsActive] = useState(true);

  // Branch state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Branch form state
  const [branchName, setBranchName] = useState('');
  const [branchIsActive, setBranchIsActive] = useState(true);

  const fetchProviders = async () => {
    setIsLoadingProviders(true);
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
    setIsLoadingProviders(false);
  };

  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Error al cargar sucursales');
      console.error(error);
    } else {
      setBranches(data || []);
    }
    setIsLoadingBranches(false);
  };

  useEffect(() => {
    fetchProviders();
    fetchBranches();
  }, []);

  // Provider functions
  const openCreateProviderModal = () => {
    setEditingProvider(null);
    setProviderName('');
    setProviderColor('#888888');
    setProviderTextColor('text-white');
    setProviderIsActive(true);
    setIsProviderModalOpen(true);
  };

  const openEditProviderModal = (provider: Provider) => {
    setEditingProvider(provider);
    setProviderName(provider.name);
    setProviderColor(provider.color);
    setProviderTextColor(provider.text_color);
    setProviderIsActive(provider.is_active);
    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!providerName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSavingProvider(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: editingProvider ? 'updateProvider' : 'createProvider',
          password,
          providerId: editingProvider?.id,
          providerData: {
            name: providerName.trim(),
            color: providerColor,
            text_color: providerTextColor,
            is_active: providerIsActive,
          },
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al guardar proveedor');
      } else {
        toast.success(editingProvider ? 'Proveedor actualizado' : 'Proveedor creado');
        setIsProviderModalOpen(false);
        fetchProviders();
      }
    } catch (err) {
      toast.error('Error al guardar proveedor');
    }

    setIsSavingProvider(false);
  };

  const handleDeleteProvider = async (provider: Provider) => {
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

  const handleToggleProviderActive = async (provider: Provider) => {
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

  // Branch functions
  const openCreateBranchModal = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchIsActive(true);
    setIsBranchModalOpen(true);
  };

  const openEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchIsActive(branch.is_active);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSavingBranch(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: editingBranch ? 'updateBranch' : 'createBranch',
          password,
          branchId: editingBranch?.id,
          branchData: {
            name: branchName.trim(),
            is_active: branchIsActive,
          },
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al guardar sucursal');
      } else {
        toast.success(editingBranch ? 'Sucursal actualizada' : 'Sucursal creada');
        setIsBranchModalOpen(false);
        fetchBranches();
      }
    } catch (err) {
      toast.error('Error al guardar sucursal');
    }

    setIsSavingBranch(false);
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`¿Estás seguro de eliminar "${branch.name}"?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'deleteBranch',
          password,
          branchId: branch.id,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al eliminar sucursal');
      } else {
        toast.success('Sucursal eliminada');
        fetchBranches();
      }
    } catch (err) {
      toast.error('Error al eliminar sucursal');
    }
  };

  const handleToggleBranchActive = async (branch: Branch) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'updateBranch',
          password,
          branchId: branch.id,
          branchData: {
            is_active: !branch.is_active,
          },
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al actualizar sucursal');
      } else {
        toast.success(`Sucursal ${!branch.is_active ? 'activada' : 'desactivada'}`);
        fetchBranches();
      }
    } catch (err) {
      toast.error('Error al actualizar sucursal');
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
      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="providers" className="gap-2">
            <Building2 className="w-4 h-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <MapPin className="w-4 h-4" />
            Sucursales
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers">
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
                <Button onClick={openCreateProviderModal} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Proveedor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProviders ? (
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
                          onCheckedChange={() => handleToggleProviderActive(provider)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditProviderModal(provider)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProvider(provider)}
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
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sucursales</CardTitle>
                    <CardDescription>Administra las sucursales disponibles</CardDescription>
                  </div>
                </div>
                <Button onClick={openCreateBranchModal} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Sucursal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBranches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : branches.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay sucursales configuradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-foreground">{branch.name}</span>
                        {!branch.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={branch.is_active}
                          onCheckedChange={() => handleToggleBranchActive(branch)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditBranchModal(branch)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBranch(branch)}
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
        </TabsContent>
      </Tabs>

      {/* Provider Modal */}
      <Dialog open={isProviderModalOpen} onOpenChange={setIsProviderModalOpen}>
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
              <Label htmlFor="provider-name">Nombre</Label>
              <Input
                id="provider-name"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Ej: CLAAS-ARG"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-color">Color de fondo</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="provider-color"
                  type="color"
                  value={providerColor}
                  onChange={(e) => {
                    setProviderColor(e.target.value);
                    setProviderTextColor(getContrastTextColor(e.target.value));
                  }}
                  className="h-10 w-20 p-1 cursor-pointer"
                />
                <Input
                  value={providerColor}
                  onChange={(e) => {
                    setProviderColor(e.target.value);
                    setProviderTextColor(getContrastTextColor(e.target.value));
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
                  className={`${providerTextColor} font-semibold text-sm border-0`}
                  style={{ backgroundColor: providerColor }}
                >
                  {providerName || 'PROVEEDOR'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="provider-is-active">Activo</Label>
              <Switch
                id="provider-is-active"
                checked={providerIsActive}
                onCheckedChange={setProviderIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsProviderModalOpen(false)}
              disabled={isSavingProvider}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProvider} disabled={isSavingProvider}>
              {isSavingProvider ? (
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

      {/* Branch Modal */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Modifica los datos de la sucursal'
                : 'Ingresa el nombre de la nueva sucursal'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Nombre</Label>
              <Input
                id="branch-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Ej: NUEVA SUCURSAL"
                className="h-10 uppercase"
              />
              <p className="text-xs text-muted-foreground">
                El nombre se guardará en mayúsculas automáticamente
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="branch-is-active">Activa</Label>
              <Switch
                id="branch-is-active"
                checked={branchIsActive}
                onCheckedChange={setBranchIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsBranchModalOpen(false)}
              disabled={isSavingBranch}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveBranch} disabled={isSavingBranch}>
              {isSavingBranch ? (
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
