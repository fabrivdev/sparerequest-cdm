import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, ArrowLeftRight, Wrench, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppSidebarProps {
  userBranch?: string;
}

const AppSidebar = ({ userBranch }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useUserPermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [pendingCotizar, setPendingCotizar] = useState(0);
  const [pendingAutorizar, setPendingAutorizar] = useState(0);

  useEffect(() => {
    if (!userBranch) return;
    const fetch = async () => {
      const [p, t] = await Promise.all([
        supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('source_branch', userBranch).eq('status', 'Pendiente'),
        supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('requester_branch', userBranch).eq('status', 'Despachada'),
      ]);
      setPendingTransfers((p.count || 0) + (t.count || 0));
    };
    fetch();
    const ch = supabase.channel('sidebar-transfers').on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userBranch]);

  useEffect(() => {
    const canCotizar = hasPermission('cotizar_desarme');
    const canAutorizar = hasPermission('autorizar_desarme');
    if (!canCotizar && !canAutorizar) return;
    const fetch = async () => {
      if (canCotizar) {
        const { count } = await supabase.from('desarmes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_cotizacion');
        setPendingCotizar(count || 0);
      }
      if (canAutorizar) {
        const { count } = await supabase.from('desarmes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_autorizacion');
        setPendingAutorizar(count || 0);
      }
    };
    fetch();
    const ch = supabase.channel('sidebar-desarmes').on('postgres_changes', { event: '*', schema: 'public', table: 'desarmes' }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hasPermission]);

  const canDesarmes = hasPermission('ver_desarmes');
  const desarmesBadge = pendingCotizar + pendingAutorizar;

  const items = [
    { path: '/home', label: 'Inicio', icon: Home, badge: 0 },
    ...(hasPermission('ver_compras') ? [{ path: '/dashboard', label: 'Compras', icon: Package, badge: 0 }] : []),
    ...(hasPermission('ver_transferencias') ? [{ path: '/transfers', label: 'Transferencias', icon: ArrowLeftRight, badge: pendingTransfers }] : []),
    ...(canDesarmes ? [{ path: '/desarmes', label: 'Desarmes', icon: Wrench, badge: desarmesBadge }] : []),
  ];

  return (
    <aside className={cn(
      'sticky top-0 h-screen border-r border-border bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-200 z-40',
      collapsed ? 'w-[52px]' : 'w-52'
    )}>
      {/* Logo header */}
      <div className={cn(
        'flex items-center border-b border-border',
        collapsed ? 'justify-center p-3' : 'gap-2 px-3 py-3'
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title={collapsed ? 'Expandir menú' : ''}
        >
          <img src="/favicon.png" alt="CDM" className="w-8 h-8 flex-shrink-0 rounded" />
          {!collapsed && <span className="text-sm font-semibold text-foreground">CDM</span>}
        </button>
        {!collapsed && (
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 ml-auto" onClick={() => setCollapsed(true)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 py-3 space-y-1 px-2">
        {items.map(item => {
          const isActive = location.pathname === item.path;
          const content = (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center rounded-lg font-medium transition-all relative',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
              {!collapsed && <span className="truncate text-sm">{item.label}</span>}
              {item.badge > 0 && (
                <Badge variant="destructive" className={cn(
                  'h-5 min-w-5 flex items-center justify-center p-0 text-[10px]',
                  collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                )}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                  {item.badge > 0 && ` (${item.badge})`}
                </TooltipContent>
              </Tooltip>
            );
          }
          return content;
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
