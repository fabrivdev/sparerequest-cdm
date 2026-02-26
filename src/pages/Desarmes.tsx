import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import LoadingScreen from '@/components/LoadingScreen';
import { ShieldX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DesarmesList from '@/components/desarmes/DesarmesList';
import NewDesarmeModal from '@/components/desarmes/NewDesarmeModal';
import QuoteDesarmeModal from '@/components/desarmes/QuoteDesarmeModal';
import AuthorizeDesarmeModal from '@/components/desarmes/AuthorizeDesarmeModal';
import DesarmeDetailModal from '@/components/desarmes/DesarmeDetailModal';
import TrackingPanel from '@/components/desarmes/TrackingPanel';
import { supabase } from '@/integrations/supabase/client';

const Desarmes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasPermission, loading } = useUserPermissions();

  const [showNew, setShowNew] = useState(false);
  const [selectedDesarme, setSelectedDesarme] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showQuote, setShowQuote] = useState(false);
  const [showAuthorize, setShowAuthorize] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
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
          <button onClick={() => navigate('/')} className="text-sm text-primary hover:underline">Volver al inicio</button>
        </div>
      </div>
    );
  }

  const canCreate = hasPermission('crear_desarme');
  const canQuote = hasPermission('cotizar_desarme');
  const canAuthorize = hasPermission('autorizar_desarme');
  const canTrack = hasPermission('seguimiento_desarme');

  const handleSelect = (desarme: any, mode?: 'quote' | 'authorize') => {
    setSelectedDesarme(desarme);
    if (mode === 'quote') {
      setShowQuote(true);
    } else if (mode === 'authorize') {
      setShowAuthorize(true);
    } else {
      setDetailId(desarme.id);
    }
  };

  // Build tabs
  const tabs: { value: string; label: string; shortLabel?: string }[] = [
    { value: 'mis', label: 'Mis Desarmes', shortLabel: 'Mis' },
  ];
  if (canQuote) tabs.push({ value: 'cotizar', label: 'Cotizar', shortLabel: 'Cotizar' });
  if (canAuthorize) tabs.push({ value: 'autorizar', label: 'Autorizar', shortLabel: 'Autoriz.' });
  if (canTrack) tabs.push({ value: 'tracking', label: 'Seguimiento', shortLabel: 'Seguim.' });

  return (
    <div className="min-h-screen bg-background">
      <Header onNewOrder={() => {}} hideNewOrder />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="mis" className="space-y-4">
          <TabsList className="w-full justify-start">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                <span className="sm:hidden">{t.shortLabel || t.label}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Mis Desarmes */}
          <TabsContent value="mis">
            <DesarmesList
              onSelect={d => handleSelect(d)}
              onNew={() => setShowNew(true)}
              canCreate={canCreate}
              refreshKey={refreshKey}
            />
          </TabsContent>

          {/* Cotizar */}
          {canQuote && (
            <TabsContent value="cotizar">
              <DesarmesList
                view="cotizar"
                onSelect={d => handleSelect(d, 'quote')}
                onNew={() => setShowNew(true)}
                canCreate={canCreate}
                refreshKey={refreshKey}
              />
            </TabsContent>
          )}

          {/* Autorizar */}
          {canAuthorize && (
            <TabsContent value="autorizar">
              <DesarmesList
                view="autorizar"
                onSelect={d => handleSelect(d, 'authorize')}
                onNew={() => setShowNew(true)}
                canCreate={canCreate}
                refreshKey={refreshKey}
              />
            </TabsContent>
          )}

          {/* Seguimiento */}
          {canTrack && (
            <TabsContent value="tracking">
              <TrackingPanel onSelect={d => handleSelect(d)} refreshKey={refreshKey} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Modals */}
      <NewDesarmeModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        defaultBranch={profile?.branch || ''}
        onCreated={refresh}
      />
      <QuoteDesarmeModal
        isOpen={showQuote}
        onClose={() => { setShowQuote(false); setSelectedDesarme(null); }}
        desarme={selectedDesarme}
        onQuoted={refresh}
      />
      <AuthorizeDesarmeModal
        isOpen={showAuthorize}
        onClose={() => { setShowAuthorize(false); setSelectedDesarme(null); }}
        desarme={selectedDesarme}
        onActioned={refresh}
      />
      <DesarmeDetailModal
        isOpen={!!detailId}
        onClose={() => { setDetailId(null); setSelectedDesarme(null); }}
        desarmeId={detailId}
        canGenerateOrder={canAuthorize || canCreate}
        canUpdateStatus={canTrack}
        onRefresh={refresh}
      />
    </div>
  );
};

export default Desarmes;
