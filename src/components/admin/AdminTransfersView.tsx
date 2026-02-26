import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TRANSFER_STATUS_COLORS, TransferStatus } from '@/constants/transferStatuses';
import StockPDFUpload from '@/components/transfers/StockPDFUpload';
import TransferDetailModal from '@/components/transfers/TransferDetailModal';
import * as XLSX from 'xlsx';

interface Transfer {
  id: string;
  brand: string;
  product_code: string;
  product_name: string;
  requester_branch: string;
  source_branch: string;
  requested_quantity: number;
  approved_quantity: number | null;
  dispatched_quantity: number | null;
  received_quantity: number | null;
  status: string;
  priority: string;
  observation: string | null;
  created_at: string;
  transfer_destination: string;
  client_name: string | null;
  is_invoiced: boolean | null;
  invoice_number: string | null;
  not_invoiced_reason: string | null;
  remission_number: string | null;
}

type FilterType = 'all' | 'active' | 'closed';

const ACTIVE_STATUSES = ['Pendiente', 'Aceptada', 'Despachada', 'Recibida', 'Incidencia'];
const CLOSED_STATUSES = ['Cerrada', 'Rechazada', 'Cancelada'];

const DESTINATION_LABELS: Record<string, string> = {
  stock: 'Stock',
  cliente: 'Cliente',
  ambos: 'Ambos',
};

const AdminTransfersView = ({ password }: { password: string }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransfers(data as Transfer[]);
    } else {
      toast.error('Error al cargar transferencias');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filteredTransfers = transfers.filter(t => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(t.status);
    if (filter === 'closed') return CLOSED_STATUSES.includes(t.status);
    return true;
  });

  const exportToExcel = () => {
    if (filteredTransfers.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const rows = filteredTransfers.map(t => ({
      'Fecha': format(new Date(t.created_at), 'dd/MM/yyyy', { locale: es }),
      'Marca': t.brand,
      'Código': t.product_code,
      'Producto': t.product_name,
      'Origen': t.source_branch,
      'Destino Sucursal': t.requester_branch,
      'Destino': DESTINATION_LABELS[t.transfer_destination] || t.transfer_destination,
      'Cliente': t.client_name || '-',
      'Cant. Solicitada': t.requested_quantity,
      'Cant. Recibida': t.received_quantity ?? '-',
      'Estado': t.status,
      'Prioridad': t.priority,
      'Facturado': t.is_invoiced === null ? '-' : t.is_invoiced ? 'Sí' : 'No',
      'Nro Factura': t.invoice_number || '-',
      'Nro Remisión': t.remission_number || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transferencias');
    XLSX.writeFile(wb, `Transferencias_Admin_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success('Excel exportado');
  };

  return (
    <div className="space-y-6">
      <StockPDFUpload userId="admin" onSuccess={() => {}} />

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-foreground">Transferencias</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5">
              <Download className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTransfers} disabled={loading} className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({transfers.length})</TabsTrigger>
            <TabsTrigger value="active">Activas ({transfers.filter(t => ACTIVE_STATUSES.includes(t.status)).length})</TabsTrigger>
            <TabsTrigger value="closed">Cerradas ({transfers.filter(t => CLOSED_STATUSES.includes(t.status)).length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredTransfers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay transferencias</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Producto</TableHead>
                  <TableHead className="font-semibold">Origen</TableHead>
                  <TableHead className="font-semibold">Destino</TableHead>
                  <TableHead className="font-semibold">Para</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold text-center">Cant.</TableHead>
                  <TableHead className="font-semibold text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Fact.</TableHead>
                  <TableHead className="font-semibold text-center">Prioridad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedTransfer(t)}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{t.product_code}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">{t.product_name}</TableCell>
                    <TableCell className="text-xs">{t.source_branch}</TableCell>
                    <TableCell className="text-xs">{t.requester_branch}</TableCell>
                    <TableCell className="text-xs">{DESTINATION_LABELS[t.transfer_destination] || t.transfer_destination}</TableCell>
                    <TableCell className="text-xs">{t.client_name || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{t.requested_quantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${TRANSFER_STATUS_COLORS[t.status as TransferStatus] || ''}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {t.is_invoiced === null ? '-' : t.is_invoiced ? '✅' : '❌'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.priority === 'urgente' ? 'destructive' : 'secondary'} className="text-xs">
                        {t.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedTransfer && (
        <TransferDetailModal
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          transferId={selectedTransfer.id}
          userBranch="ADMIN"
          userId="admin"
          userName="Administrador"
          onStatusChange={fetchTransfers}
          isAdmin={true}
          adminPassword={password}
        />
      )}
    </div>
  );
};

export default AdminTransfersView;
