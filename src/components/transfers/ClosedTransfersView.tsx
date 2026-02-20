import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TRANSFER_STATUS_COLORS, TransferStatus } from '@/constants/transferStatuses';
import { useIsMobile } from '@/hooks/use-mobile';

interface ClosedTransfersViewProps {
  userBranch: string;
  userId: string;
}

const ClosedTransfersView = ({ userBranch, userId }: ClosedTransfersViewProps) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{transfers.length} cerradas</p>
        <Button variant="ghost" size="sm" onClick={fetchTransfers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No hay transferencias cerradas
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {transfers.map(t => (
            <div key={t.id} className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{t.brand} - {t.product_code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.source_branch} → {t.requester_branch}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solicitadas: {t.requested_quantity} · Recibidas: {t.received_quantity ?? '-'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`text-[10px] ${TRANSFER_STATUS_COLORS[t.status as TransferStatus] || ''}`}>
                    {t.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Solicitada</TableHead>
                <TableHead className="text-xs">Recibida</TableHead>
                <TableHead className="text-xs">Origen → Destino</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs py-2">{format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}</TableCell>
                  <TableCell className="font-medium text-xs py-2">{t.product_code}</TableCell>
                  <TableCell className="text-xs py-2">{t.requested_quantity}</TableCell>
                  <TableCell className="text-xs py-2">{t.received_quantity ?? '-'}</TableCell>
                  <TableCell className="text-xs py-2">{t.source_branch} → {t.requester_branch}</TableCell>
                  <TableCell className="py-2">
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
