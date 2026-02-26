import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import LoadingScreen from '@/components/LoadingScreen';
import { ShieldX } from 'lucide-react';

const Desarmes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasPermission, loading } = useUserPermissions();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;
  if (loading) return <LoadingScreen />;

  if (!hasPermission('ver_desarmes')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldX className="w-16 h-16 mx-auto text-destructive/50" />
          <h2 className="text-xl font-semibold text-foreground">No autorizado</h2>
          <p className="text-sm text-muted-foreground">No tienes permiso para acceder a esta sección.</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary hover:underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onNewOrder={() => {}} hideNewOrder />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Módulo Desarmes</p>
          <p className="text-sm">Próximamente: creación, cotización, autorización y seguimiento de desarmes.</p>
        </div>
      </main>
    </div>
  );
};

export default Desarmes;
