import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ModuleCards from '@/components/home/ModuleCards';
import RecentActivity from '@/components/home/RecentActivity';
import NotificationsPreview from '@/components/home/NotificationsPreview';
import AnnouncementsSection from '@/components/home/AnnouncementsSection';

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

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
      <div className="container mx-auto px-3 sm:px-6 py-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inicio</h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenido al sistema de gestión de repuestos</p>
        </div>

        <AnnouncementsSection />
        <ModuleCards />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecentActivity />
          <NotificationsPreview />
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;
