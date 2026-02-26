import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import ModuleCards from '@/components/home/ModuleCards';
import RecentActivity from '@/components/home/RecentActivity';
import NotificationsPreview from '@/components/home/NotificationsPreview';
import AnnouncementsSection from '@/components/home/AnnouncementsSection';

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setUserName(data.full_name.split(' ')[0]);
      });
  }, [user]);

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {userName ? `Hola, ${userName}` : 'Inicio'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenido al sistema de gestión de repuestos</p>
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
    </AppLayout>
  );
};

export default Home;
