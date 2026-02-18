import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import ProfileSetup from '@/components/ProfileSetup';
import LoadingScreen from '@/components/LoadingScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowLeftRight, Truck, CheckCircle } from 'lucide-react';
import StockConsultView from '@/components/transfers/StockConsultView';
import MyTransfersView from '@/components/transfers/MyTransfersView';
import InTransitView from '@/components/transfers/InTransitView';
import ClosedTransfersView from '@/components/transfers/ClosedTransfersView';
import SupportButton from '@/components/support/SupportButton';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  branch: string;
}

const Transfers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(data);
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (profileLoading) return <LoadingScreen />;

  if (!profile && user) {
    return <ProfileSetup userId={user.id} onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNewOrder={() => navigate('/')}
        onEditProfile={() => {}}
        profile={profile}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Transferencias entre Sucursales
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta stock, solicita y gestiona transferencias
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="stock" className="gap-1.5 text-xs sm:text-sm">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Consulta Stock</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="my-transfers" className="gap-1.5 text-xs sm:text-sm">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden sm:inline">Mis Transferencias</span>
              <span className="sm:hidden">Mis Trans.</span>
            </TabsTrigger>
            <TabsTrigger value="in-transit" className="gap-1.5 text-xs sm:text-sm">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">En Tránsito</span>
              <span className="sm:hidden">Tránsito</span>
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5 text-xs sm:text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Cerradas</span>
              <span className="sm:hidden">Cerradas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <StockConsultView userBranch={profile?.branch || ''} userId={user?.id || ''} userName={profile?.full_name || ''} />
          </TabsContent>
          <TabsContent value="my-transfers">
            <MyTransfersView userBranch={profile?.branch || ''} userId={user?.id || ''} userName={profile?.full_name || ''} />
          </TabsContent>
          <TabsContent value="in-transit">
            <InTransitView userBranch={profile?.branch || ''} userId={user?.id || ''} userName={profile?.full_name || ''} />
          </TabsContent>
          <TabsContent value="closed">
            <ClosedTransfersView userBranch={profile?.branch || ''} userId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </main>

      {profile && user && (
        <SupportButton
          userId={user.id}
          userName={profile.full_name || 'Usuario'}
          branch={profile.branch}
        />
      )}
    </div>
  );
};

export default Transfers;
