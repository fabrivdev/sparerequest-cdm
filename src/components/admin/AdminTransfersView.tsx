import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StockPDFUpload from '@/components/transfers/StockPDFUpload';
import TransferDetailModal from '@/components/transfers/TransferDetailModal';

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
}

const statusColors: Record<string, string> = {
  'Pendiente': 'bg-yellow-500/10 text-yellow-600',
  'Aceptada': 'bg-blue-500/10 text-blue-600',
  'Despachada': 'bg-purple-500/10 text-purple-600',
  'Recibida': 'bg-green-500/10 text-green-600',
  'Cerrada': 'bg-muted text-muted-foreground',
  'Incidencia': 'bg-destructive/10 text-destructive',
  'Rechazada': 'bg-destructive/10 text-destructive',
};

const AdminTransfersView = ({ password }: { password: string }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .in('status', ['Pendiente', 'Aceptada', 'Despachada', 'Recibida', 'Incidencia'])
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

  return (
    <div className="space-y-6">
      {/* Stock PDF Upload - Admin only */}
      <StockPDFUpload userId="admin" onSuccess={() => {}} />

      {/* Active Transfers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Transferencias activas</h3>
          <Button variant="outline" size="sm" onClick={fetchTransfers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay transferencias activas</p>
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
                  <TableHead className="font-semibold text-center">Cant.</TableHead>
                  <TableHead className="font-semibold text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Prioridad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedTransfer(t)}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{t.product_code}</TableCell>
                    <TableCell className="text-sm">{t.product_name}</TableCell>
                    <TableCell className="text-xs">{t.source_branch}</TableCell>
                    <TableCell className="text-xs">{t.requester_branch}</TableCell>
                    <TableCell className="text-center font-medium">{t.requested_quantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-xs ${statusColors[t.status] || ''}`}>
                        {t.status}
                      </Badge>
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

      {/* Detail Modal */}
      {selectedTransfer && (
        <TransferDetailModal
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          transferId={selectedTransfer.id}
          userBranch="ADMIN"
          userId="admin"
          userName="Administrador"
          onStatusChange={fetchTransfers}
        />
      )}
    </div>
  );
};

export default AdminTransfersView;
