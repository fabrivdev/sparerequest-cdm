import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TRANSFER_STATUS_COLORS, TransferStatus } from '@/constants/transferStatuses';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Send, Inbox } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import TransferDetailModal from './TransferDetailModal';

interface Transfer {
  id: string;
  requester_user_id: string;
  requester_branch: string;
  source_branch: string;
  brand: string;
  product_code: string;
  product_name: string;
  requested_quantity: number;
  approved_quantity: number | null;
  dispatched_quantity: number | null;
  received_quantity: number | null;
  priority: string;
  observation: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MyTransfersViewProps {
  userBranch: string;
  userId: string;
  userName: string;
}

const MyTransfersView = ({ userBranch, userId, userName }: MyTransfersViewProps) => {
  const [sentTransfers, setSentTransfers] = useState<Transfer[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('sent');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const isMobile = useIsMobile();

  const fetchTransfers = async () => {
    setLoading(true);
    const [sentRes, receivedRes] = await Promise.all([
      supabase.functions.invoke('transfer-operations', {
        body: { action: 'getTransfers', userId, type: 'sent' },
      }),
      supabase.functions.invoke('transfer-operations', {
        body: { action: 'getTransfers', branch: userBranch, type: 'received' },
      }),
    ]);
    if (sentRes.data) setSentTransfers(sentRes.data.transfers || []);
    if (receivedRes.data) setReceivedTransfers(receivedRes.data.transfers || []);
    setLoading(false);
  };

  useEffect(() => { fetchTransfers(); }, []);

  // Realtime auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('my-transfers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.source_branch === userBranch || row?.requester_branch === userBranch || row?.requester_user_id === userId) {
            fetchTransfers();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userBranch, userId]);

  const pendingSentCount = sentTransfers.filter(t => t.status === 'Pendiente').length;
  const pendingReceivedCount = receivedTransfers.filter(t => t.status === 'Pendiente').length;

  return (
    <div className="space-y-3">
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <div className="flex items-center justify-between mb-3">
          <TabsList>
            <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
              <Send className="w-3.5 h-3.5" />
              Enviadas
              {pendingSentCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingSentCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-1.5 text-xs sm:text-sm">
              <Inbox className="w-3.5 h-3.5" />
              Recibidas
              {pendingReceivedCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingReceivedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" onClick={fetchTransfers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <TabsContent value="sent">
          <TransferList transfers={sentTransfers} onSelect={setSelectedTransfer} type="sent" isMobile={isMobile} />
        </TabsContent>
        <TabsContent value="received">
          <TransferList transfers={receivedTransfers} onSelect={setSelectedTransfer} type="received" isMobile={isMobile} />
        </TabsContent>
      </Tabs>

      {selectedTransfer && (
        <TransferDetailModal
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          transferId={selectedTransfer.id}
          userBranch={userBranch}
          userId={userId}
          userName={userName}
          onStatusChange={fetchTransfers}
        />
      )}
    </div>
  );
};

const DEST_LABELS_MAP: Record<string, string> = { stock: 'Stock', cliente: 'Cliente', ambos: 'Ambos' };

const TransferList = ({ transfers, onSelect, type, isMobile }: { transfers: any[]; onSelect: (t: any) => void; type: string; isMobile: boolean }) => {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No hay transferencias {type === 'sent' ? 'enviadas' : 'recibidas'}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {transfers.map((t) => (
          <div
            key={t.id}
            className="p-3 rounded-xl border border-border bg-card active:bg-muted/50 transition-colors"
            onClick={() => onSelect(t)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{t.brand} - {t.product_code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {type === 'sent' ? t.source_branch : t.requester_branch} · {t.requested_quantity} uds
                </p>
                <p className="text-xs text-muted-foreground">
                  {DEST_LABELS_MAP[t.transfer_destination] || 'Stock'}{t.client_name ? ` · ${t.client_name}` : ''}
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
            {t.priority === 'urgente' && (
              <Badge variant="destructive" className="text-[10px] mt-1.5">urgente</Badge>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Fecha</TableHead>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs">Cant.</TableHead>
            <TableHead className="text-xs">{type === 'sent' ? 'Origen' : 'Destino'}</TableHead>
            <TableHead className="text-xs">Destino</TableHead>
            <TableHead className="text-xs">Prior.</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onSelect(t)}>
              <TableCell className="text-xs py-2">
                {format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}
              </TableCell>
              <TableCell className="font-medium text-xs py-2">{t.product_code}</TableCell>
              <TableCell className="text-xs py-2">{t.requested_quantity}</TableCell>
              <TableCell className="text-xs py-2">{type === 'sent' ? t.source_branch : t.requester_branch}</TableCell>
              <TableCell className="text-xs py-2">{DEST_LABELS_MAP[t.transfer_destination] || 'Stock'}</TableCell>
              <TableCell className="py-2">
                <Badge variant={t.priority === 'urgente' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {t.priority}
                </Badge>
              </TableCell>
              <TableCell className="py-2">
                <Badge className={`text-[10px] ${TRANSFER_STATUS_COLORS[t.status as TransferStatus] || ''}`}>
                  {t.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MyTransfersView;
