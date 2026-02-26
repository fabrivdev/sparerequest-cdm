import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import AppLayout from '@/components/AppLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const [pendingCotizar, setPendingCotizar] = useState(0);
  const [pendingAutorizar, setPendingAutorizar] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user, navigate]);

  // Fetch pending counts for tabs
  useEffect(() => {
    const canQuote = hasPermission('cotizar_desarme');
    const canAuth = hasPermission('autorizar_desarme');
    if (!canQuote && !canAuth) return;
    const fetchCounts = async () => {
      if (canQuote) {
        const { count } = await supabase.from('desarmes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_cotizacion');
        setPendingCotizar(count || 0);
      }
      if (canAuth) {
        const { count } = await supabase.from('desarmes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_autorizacion');
        setPendingAutorizar(count || 0);
      }
    };
    fetchCounts();
    const ch = supabase.channel('desarmes-tab-counts').on('postgres_changes', { event: '*', schema: 'public', table: 'desarmes' }, () => fetchCounts()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hasPermission, refreshKey]);

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
    if (mode === 'quote') setShowQuote(true);
    else if (mode === 'authorize') setShowAuthorize(true);
    else setDetailId(desarme.id);
  };

  const tabs: { value: string; label: string; shortLabel?: string; badge?: number }[] = [
    { value: 'mis', label: 'Desarmes', shortLabel: 'Desarmes' },
  ];
  if (canQuote) tabs.push({ value: 'cotizar', label: 'Cotizar', shortLabel: 'Cotizar', badge: pendingCotizar });
  if (canAuthorize) tabs.push({ value: 'autorizar', label: 'Autorizar', shortLabel: 'Autoriz.', badge: pendingAutorizar });
  if (canTrack) tabs.push({ value: 'tracking', label: 'Seguimiento', shortLabel: 'Seguim.' });

  return (
    <AppLayout userBranch={profile?.branch}>
      <Header onNewOrder={() => {}} hideNewOrder />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="mis" className="space-y-4">
          <TabsList className="w-full justify-start">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm relative">
                <span className="sm:hidden">{t.shortLabel || t.label}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {(t.badge ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 text-[10px] ml-1.5">
                    {t.badge! > 99 ? '99+' : t.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="mis">
            <DesarmesList onSelect={d => handleSelect(d)} onNew={() => setShowNew(true)} canCreate={canCreate} refreshKey={refreshKey} />
          </TabsContent>
          {canQuote && (
            <TabsContent value="cotizar">
              <DesarmesList view="cotizar" onSelect={d => handleSelect(d, 'quote')} onNew={() => setShowNew(true)} canCreate={canCreate} refreshKey={refreshKey} />
            </TabsContent>
          )}
          {canAuthorize && (
            <TabsContent value="autorizar">
              <DesarmesList view="autorizar" onSelect={d => handleSelect(d, 'authorize')} onNew={() => setShowNew(true)} canCreate={canCreate} refreshKey={refreshKey} />
            </TabsContent>
          )}
          {canTrack && (
            <TabsContent value="tracking">
              <TrackingPanel onSelect={d => handleSelect(d)} refreshKey={refreshKey} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <NewDesarmeModal isOpen={showNew} onClose={() => setShowNew(false)} defaultBranch={profile?.branch || ''} onCreated={refresh} />
      <QuoteDesarmeModal isOpen={showQuote} onClose={() => { setShowQuote(false); setSelectedDesarme(null); }} desarme={selectedDesarme} onQuoted={refresh} />
      <AuthorizeDesarmeModal isOpen={showAuthorize} onClose={() => { setShowAuthorize(false); setSelectedDesarme(null); }} desarme={selectedDesarme} onActioned={refresh} />
      <DesarmeDetailModal isOpen={!!detailId} onClose={() => { setDetailId(null); setSelectedDesarme(null); }} desarmeId={detailId} canGenerateOrder={canAuthorize || canCreate} canUpdateStatus={canTrack} onRefresh={refresh} />
    </AppLayout>
  );
};

export default Desarmes;
