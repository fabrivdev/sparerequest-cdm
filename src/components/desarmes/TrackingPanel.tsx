import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, AlertTriangle, Eye, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { DESARME_STATUS_LABELS, DESARME_STATUS_COLORS, DESARME_ALL_STATUSES } from '@/constants/desarmeStatuses';
import { differenceInDays } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TrackingPanelProps {
  onSelect: (desarme: any) => void;
  refreshKey?: number;
}

interface MachineGroup {
  serial_number: string;
  client_names: string[];
  brand: string;
  model: string;
  branch: string;
  is_urgent: boolean;
  parts: any[];
}

const TrackingPanel = ({ onSelect, refreshKey }: TrackingPanelProps) => {
  const [desarmes, setDesarmes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const fetchTracking = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'getDesarmes', view: 'tracking' },
    });
    if (data?.desarmes) setDesarmes(data.desarmes);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTracking(); }, [fetchTracking, refreshKey]);

  useEffect(() => {
    const ch = supabase.channel('tracking-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'desarmes' }, () => fetchTracking())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTracking]);

  const getDays = (createdAt: string) => differenceInDays(new Date(), new Date(createdAt));

  const getTrafficLight = (days: number) => {
    if (days <= 7) return 'bg-green-500';
    if (days <= 14) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isOverDeadline = (d: any) => {
    if (!d.quoted_deadline) return false;
    // Support date format (yyyy-MM-dd) or legacy text format (e.g. "15 días")
    const deadlineDate = new Date(d.quoted_deadline);
    if (!isNaN(deadlineDate.getTime())) {
      return new Date() > deadlineDate;
    }
    // Legacy: try to parse number of days
    const deadlineDays = parseInt(d.quoted_deadline);
    if (isNaN(deadlineDays)) return false;
    return getDays(d.created_at) > deadlineDays;
  };

  // Filter by search + status
  const filtered = desarmes.filter(d => {
    if (statusFilter !== 'todos' && d.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return d.serial_number.toLowerCase().includes(s) ||
      d.client_name.toLowerCase().includes(s) ||
      d.desarme_number.toLowerCase().includes(s) ||
      d.product_code.toLowerCase().includes(s);
  });

  // Group by serial_number
  const groups: MachineGroup[] = [];
  const groupMap = new Map<string, MachineGroup>();
  filtered.forEach(d => {
    const key = d.serial_number;
    if (!groupMap.has(key)) {
      const group: MachineGroup = {
        serial_number: d.serial_number,
        client_names: [],
        brand: d.brand,
        model: d.model,
        branch: d.branch,
        is_urgent: d.is_urgent,
        parts: [],
      };
      groupMap.set(key, group);
      groups.push(group);
    }
    const g = groupMap.get(key)!;
    g.parts.push(d);
    if (d.is_urgent) g.is_urgent = true;
    if (d.client_name && !g.client_names.includes(d.client_name)) g.client_names.push(d.client_name);
  });

  const toggleGroup = (serial: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por serie, cliente, Nº desarme..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {DESARME_ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{DESARME_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> ≤7d</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 8-14d</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> &gt;14d</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No hay máquinas en seguimiento</div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const isOpen = openGroups.has(group.serial_number);
            const worstDays = Math.max(...group.parts.map(p => getDays(p.created_at)));
            const hasOverDeadline = group.parts.some(isOverDeadline);

            return (
              <Collapsible key={group.serial_number} open={isOpen} onOpenChange={() => toggleGroup(group.serial_number)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getTrafficLight(worstDays)}`} />
                    {group.is_urgent && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-medium">{group.serial_number}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm font-medium truncate">{group.client_names.join(', ')}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {group.brand} {group.model} · {group.branch}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px]">{group.parts.length} pieza{group.parts.length > 1 ? 's' : ''}</Badge>
                      <span className="text-xs font-bold">{worstDays}d</span>
                      {hasOverDeadline && (
                        <Badge variant="destructive" className="text-[10px] gap-0.5">
                          <Clock className="w-3 h-3" /> Fuera de plazo
                        </Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1">
                    {group.parts.map(part => {
                      const days = getDays(part.created_at);
                      const over = isOverDeadline(part);
                      return (
                        <div
                          key={part.id}
                          className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => onSelect(part)}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getTrafficLight(days)}`} />
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs">{part.desarme_number}</span>
                              <span className="font-mono text-xs text-muted-foreground">{part.product_code}</span>
                              <span className="text-xs text-muted-foreground">× {part.quantity}</span>
                              {group.client_names.length > 1 && (
                                <span className="text-xs font-medium text-primary">{part.client_name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{days}d</span>
                              {part.quoted_deadline && (
                                <span>/ plazo: {(() => {
                                  const d = new Date(part.quoted_deadline);
                                  return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PY') : part.quoted_deadline;
                                })()}</span>
                              )}
                              {over && <span className="text-destructive font-medium">⚠ Excedido</span>}
                              {part.service_order_number && <span>O.S.: {part.service_order_number}</span>}
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DESARME_STATUS_COLORS[part.status] || ''}`}>
                            {DESARME_STATUS_LABELS[part.status] || part.status}
                          </span>
                          <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrackingPanel;
