import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sun, Moon, User, Shield, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import UserNotifications from '@/components/UserNotifications';
import AppLayout from '@/components/AppLayout';
import ModuleCards from '@/components/home/ModuleCards';
import RecentActivity from '@/components/home/RecentActivity';
import NotificationsPreview from '@/components/home/NotificationsPreview';
import AnnouncementsSection from '@/components/home/AnnouncementsSection';
import ProfileEditModal from '@/components/ProfileEditModal';

const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000;

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [userName, setUserName] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        if (data?.full_name) setUserName(data.full_name.split(' ')[0]);
      });
  }, [user]);

  const checkAdminSession = (): boolean => {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return false;
    try {
      const { expiresAt } = JSON.parse(sessionData);
      if (Date.now() > expiresAt) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
  };

  const handleAdminClick = () => {
    if (checkAdminSession()) {
      navigate('/admin');
    } else {
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-orders', {
        body: { action: 'getOrders', password },
      });
      if (error) { toast.error('Error de conexión'); setIsLoading(false); return; }
      if (data.error) { toast.error(data.error); setIsLoading(false); return; }
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        authenticated: true, expiresAt: Date.now() + ADMIN_SESSION_DURATION, password,
      }));
      setShowPasswordModal(false);
      setPassword('');
      toast.success('Acceso autorizado');
      navigate('/admin');
    } catch { toast.error('Error al conectar'); }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="container mx-auto px-3 sm:px-6 py-8 space-y-8 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {userName ? `Hola, ${userName}` : 'Inicio'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Bienvenido al sistema de gestión de repuestos</p>
          </div>
          <div className="flex items-center gap-1">
            {user && <UserNotifications userId={user.id} />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowProfileModal(true)}
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Editar perfil"
            >
              <User className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAdminClick}
              className="h-9 w-9 text-muted-foreground hover:text-primary"
              title="Panel Admin"
            >
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnnouncementsSection />

        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Módulos</h2>
          <ModuleCards />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <RecentActivity />
          <NotificationsPreview />
        </div>
      </div>

      <ProfileEditModal
        isOpen={showProfileModal && !!profile}
        profile={profile || { id: '', user_id: '', full_name: '', branch: '', created_at: '', updated_at: '' }}
        onClose={() => setShowProfileModal(false)}
        onUpdate={() => {
          setShowProfileModal(false);
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
            setProfile(data);
            if (data?.full_name) setUserName(data.full_name.split(' ')[0]);
          });
        }}
      />

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg">Panel Admin</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Contraseña de administrador"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary/50 border-0 pl-10"
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando</> : 'Acceder'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Home;
