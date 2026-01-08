import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Loader2, MapPin } from 'lucide-react';
import { BRANCHES } from '@/constants/branches';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

const ProfileSetup = ({ userId, onComplete }: ProfileSetupProps) => {
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const { error: insertError } = await supabase.from('profiles').insert({
      user_id: userId,
      full_name: fullName.trim(),
      branch,
    });

    if (insertError) {
      console.error(insertError);
      setError('Error al crear el perfil');
      setIsLoading(false);
      return;
    }

    toast.success('Perfil creado exitosamente');
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Completa tu Perfil
          </h1>
          <p className="text-muted-foreground mt-2">
            Necesitamos algunos datos para continuar
          </p>
        </div>

        <Card className="ios-shadow border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Información del Usuario</CardTitle>
            <CardDescription>
              Estos datos se usarán para identificarte en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Tu nombre completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12 bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Sucursal</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className="h-12 bg-secondary/50 border-0 pl-10">
                      <SelectValue placeholder="Selecciona tu sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
