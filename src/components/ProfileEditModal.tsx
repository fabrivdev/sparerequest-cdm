import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { User, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdate: (profile: Profile) => void;
}

const ProfileEditModal = ({ isOpen, onClose, profile, onUpdate }: ProfileEditModalProps) => {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [branch, setBranch] = useState(profile.branch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    setFullName(profile.full_name || '');
    setBranch(profile.branch);
  }, [profile]);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (data && !error) {
        setBranches(data);
      }
    };
    
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!branch) {
      setError('Selecciona una sucursal');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        branch,
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error(updateError);
      setError('Error al actualizar el perfil');
      setIsLoading(false);
      return;
    }

    toast.success('Perfil actualizado');
    onUpdate({ ...profile, full_name: fullName.trim(), branch });
    onClose();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 ios-shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Editar Perfil</DialogTitle>
              <DialogDescription className="text-sm">
                Actualiza tus datos personales
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="editFullName">Nombre Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="editFullName"
                placeholder="Tu nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-11 bg-secondary/50 border-0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editBranch">Sucursal</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-11 bg-secondary/50 border-0 pl-10">
                  <SelectValue placeholder="Selecciona tu sucursal" />
                </SelectTrigger>
              <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-11"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
