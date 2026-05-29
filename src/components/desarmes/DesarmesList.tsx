import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, AlertTriangle, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { DESARME_STATUS_LABELS, DESARME_STATUS_COLORS, DESARME_ALL_STATUSES } from '@/constants/desarmeStatuses';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Desarme {
  id: string;
  desarme_number: string;
  brand: string;
  model: string;
  serial_number: string;
  client_name: string;
  branch: string;
  product_code: string;
  product_name: string | null;
  quantity: number;
  reason: string;
  is_urgent: boolean;
  status: string;
  quoted_value: number | null;
  created_at: string;
  created_by_name?: string;
  items_summary?: string;
  items_count?: number;
}

interface DesarmesListProps {
  view?: string;
  onSelect: (desarme: Desarme) => void;
  onNew: () => void;
  canCreate: boolean;
  refreshKey?: number;
}

const DesarmesList = ({ view, onSelect, onNew, canCreate, refreshKey }: DesarmesListProps) => {
  const [desarmes, setDesarmes] = useState<Desarme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(50);

  const fetchDesarmes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('desarme-operations', {
        body: { action: 'getDesarmes', view: view || undefined, statusFilter: statusFilter !== 'all' ? statusFilter : undefined },
      });
      if (!error && data?.desarmes) {
        setDesarmes(data.desarmes);
      }
    } catch (err) {
      console.error('Error fetching desarmes:', err);
    }
    setLoading(false);
  }, [view, statusFilter]);

  useEffect(() => {
    fetchDesarmes();
  }, [fetchDesarmes, refreshKey]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('desarmes-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'desarmes' }, () => {
        fetchDesarmes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDesarmes]);

  const filtered = desarmes.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.desarme_number.toLowerCase().includes(s) ||
      d.client_name.toLowerCase().includes(s) ||
      d.serial_number.toLowerCase().includes(s) ||
      d.product_code.toLowerCase().includes(s) ||
      d.brand.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por Nº, serie, cliente, código..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {!view && (
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {DESARME_ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{DESARME_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {canCreate && (
          <Button onClick={onNew} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> Nuevo Desarme
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No se encontraron desarmes
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nº</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Serie</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="hidden lg:table-cell">Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(d => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(d)}>
                  <TableCell className="p-2">
                    {d.is_urgent && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.desarme_number}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {format(new Date(d.created_at), 'dd/MM/yy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm font-medium max-w-[120px] truncate">{d.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono">{d.serial_number}</TableCell>
                  <TableCell className="text-xs font-mono">{d.product_code}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">{d.branch}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${DESARME_STATUS_COLORS[d.status] || 'bg-muted text-muted-foreground'}`}>
                      {DESARME_STATUS_LABELS[d.status] || d.status}
                    </span>
                  </TableCell>
                  <TableCell className="p-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesarmesList;
