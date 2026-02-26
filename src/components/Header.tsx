import { useState, useEffect } from 'react';
import { Package, LogOut, Plus, Shield, Loader2, Lock, User, BookOpen, Sun, Moon, MoreVertical } from 'lucide-react';
import UserNotifications from '@/components/UserNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UserManual from '@/components/UserManual';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000;

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

interface HeaderProps {
  onNewOrder: () => void;
  onEditProfile?: () => void;
  profile?: Profile | null;
  hideNewOrder?: boolean;
}

const Header = ({ onNewOrder, onEditProfile, profile, hideNewOrder }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);

  // Fetch pending transfers count for user's branch
  useEffect(() => {
    if (!profile?.branch) return;

    const fetchCount = async () => {
      const [pendingRes, inTransitRes] = await Promise.all([
        supabase
          .from('transfers')
          .select('*', { count: 'exact', head: true })
          .eq('source_branch', profile.branch)
          .eq('status', 'Pendiente'),
        supabase
          .from('transfers')
          .select('*', { count: 'exact', head: true })
          .eq('requester_branch', profile.branch)
          .eq('status', 'Despachada'),
      ]);
      setPendingTransferCount((pendingRes.count || 0) + (inTransitRes.count || 0));
    };

    fetchCount();

    const channel = supabase
      .channel('header-transfer-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.branch]);

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

      if (error) {
        toast.error('Error de conexión');
        setIsLoading(false);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      const sessionData = {
        authenticated: true,
        expiresAt: Date.now() + ADMIN_SESSION_DURATION,
        password: password,
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
      
      setShowPasswordModal(false);
      setPassword('');
      toast.success('Acceso autorizado');
      navigate('/admin');
    } catch (err) {
      toast.error('Error al conectar');
    }

    setIsLoading(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border pt-safe">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground">
                  Solicitud de Repuestos
                </h1>
                <p className="text-xs text-muted-foreground">
                  {profile?.full_name || user?.email} • {profile?.branch}
                </p>
              </div>
              {/* Section Switcher */}
              <div className="ml-1 sm:ml-2 inline-flex bg-secondary/50 rounded-lg p-0.5 sm:p-1">
                <button
                  onClick={() => navigate('/')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all',
                    location.pathname === '/'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Compras
                </button>
                <button
                  onClick={() => navigate('/transfers')}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all relative',
                    location.pathname === '/transfers'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="sm:hidden">Transfer.</span>
                  <span className="hidden sm:inline">Transferencias</span>
                  {pendingTransferCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 sm:h-5 min-w-4 sm:min-w-5 flex items-center justify-center p-0 text-[9px] sm:text-[10px]">
                      {pendingTransferCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {user && <UserNotifications userId={user.id} />}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>

              {/* Desktop: show all buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowManual(true)}
                  className="h-10 w-10 text-muted-foreground hover:text-primary"
                  title="Manual de usuario"
                >
                  <BookOpen className="w-5 h-5" />
                </Button>
                {onEditProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEditProfile}
                    className="h-10 w-10 text-muted-foreground hover:text-primary"
                    title="Editar perfil"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAdminClick}
                  className="h-10 w-10 text-muted-foreground hover:text-primary"
                >
                  <Shield className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile: group secondary actions in dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:hidden text-muted-foreground hover:text-primary"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowManual(true)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manual de usuario
                  </DropdownMenuItem>
                  {onEditProfile && (
                    <DropdownMenuItem onClick={onEditProfile}>
                      <User className="w-4 h-4 mr-2" />
                      Editar perfil
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleAdminClick}>
                    <Shield className="w-4 h-4 mr-2" />
                    Panel Admin
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {!hideNewOrder && (
                <Button
                  onClick={onNewOrder}
                  className="h-9 sm:h-10 gap-1 sm:gap-2 px-2.5 sm:px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Pedido</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await signOut();
                    localStorage.removeItem(ADMIN_SESSION_KEY);
                    toast.success('Sesión cerrada');
                  } catch (err) {
                    console.error('Logout error:', err);
                    toast.error('Error al cerrar sesión');
                  }
                }}
                className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Password Modal */}
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
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando
                </>
              ) : (
                'Acceder'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Manual Modal */}
      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} />
    </>
  );
};

export default Header;
