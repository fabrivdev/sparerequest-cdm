import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search, AlertTriangle, Eye } from 'lucide-react';
import { DESARME_STATUS_LABELS, DESARME_STATUS_COLORS } from '@/constants/desarmeStatuses';
import { differenceInDays } from 'date-fns';

interface TrackingPanelProps {
  onSelect: (desarme: any) => void;
  refreshKey?: number;
}

const TrackingPanel = ({ onSelect, refreshKey }: TrackingPanelProps) => {
  const [desarmes, setDesarmes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const getDaysDisassembled = (createdAt: string) => differenceInDays(new Date(), new Date(createdAt));

  const getTrafficLight = (days: number) => {
    if (days <= 7) return 'bg-green-500';
    if (days <= 14) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filtered = desarmes.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.serial_number.toLowerCase().includes(s) ||
      d.client_name.toLowerCase().includes(s) ||
      d.desarme_number.toLowerCase().includes(s) ||
      d.product_code.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por serie, cliente, Nº desarme..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> ≤7d</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 8-14d</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> &gt;14d</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No hay máquinas en seguimiento</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Código</TableHead>
                <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => {
                const days = getDaysDisassembled(d.created_at);
                return (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(d)}>
                    <TableCell className="p-1.5">
                      <div className={`w-3 h-3 rounded-full ${getTrafficLight(days)}`} />
                    </TableCell>
                    <TableCell className="p-1.5">
                      {d.is_urgent && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.desarme_number}</TableCell>
                    <TableCell className="font-mono text-xs">{d.serial_number}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[100px] truncate">{d.client_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs font-mono">{d.product_code}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{d.branch}</TableCell>
                    <TableCell className="text-xs font-bold">{days}d</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DESARME_STATUS_COLORS[d.status] || ''}`}>
                        {DESARME_STATUS_LABELS[d.status] || d.status}
                      </span>
                    </TableCell>
                    <TableCell className="p-1.5"><Eye className="w-4 h-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default TrackingPanel;
