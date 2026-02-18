import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TRANSFER_STATUS_COLORS, TransferStatus } from '@/constants/transferStatuses';

interface ClosedTransfersViewProps {
  userBranch: string;
  userId: string;
}

const ClosedTransfersView = ({ userBranch, userId }: ClosedTransfersViewProps) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'getTransfers', type: 'closed' },
    });
    if (data) setTransfers(data.transfers || []);
    setLoading(false);
  };

  useEffect(() => { fetchTransfers(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{transfers.length} transferencias cerradas</p>
        <Button variant="ghost" size="sm" onClick={fetchTransfers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay transferencias cerradas</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Fecha</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cant. Solicitada</TableHead>
                <TableHead>Cant. Recibida</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}</TableCell>
                  <TableCell className="font-medium">{t.brand}</TableCell>
                  <TableCell>{t.product_code}</TableCell>
                  <TableCell>{t.requested_quantity}</TableCell>
                  <TableCell>{t.received_quantity ?? '-'}</TableCell>
                  <TableCell className="text-sm">{t.source_branch} → {t.requester_branch}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${TRANSFER_STATUS_COLORS[t.status as TransferStatus] || ''}`}>{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ClosedTransfersView;
