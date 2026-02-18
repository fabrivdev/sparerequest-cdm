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

  useEffect(() => {
    fetchTransfers();
  }, []);

  const transfers = subTab === 'sent' ? sentTransfers : receivedTransfers;

  const pendingSentCount = sentTransfers.filter(t => t.status === 'Pendiente').length;
  const pendingReceivedCount = receivedTransfers.filter(t => t.status === 'Pendiente').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="sent" className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Enviadas
                {pendingSentCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingSentCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="received" className="gap-1.5">
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
            <TransferTable transfers={sentTransfers} onSelect={setSelectedTransfer} type="sent" />
          </TabsContent>
          <TabsContent value="received">
            <TransferTable transfers={receivedTransfers} onSelect={setSelectedTransfer} type="received" />
          </TabsContent>
        </Tabs>
      </div>

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

const TransferTable = ({ transfers, onSelect, type }: { transfers: any[]; onSelect: (t: any) => void; type: string }) => {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay transferencias {type === 'sent' ? 'enviadas' : 'recibidas'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Fecha</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>{type === 'sent' ? 'Origen' : 'Destino'}</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onSelect(t)}>
              <TableCell className="text-sm">
                {format(new Date(t.created_at), 'dd/MM/yy', { locale: es })}
              </TableCell>
              <TableCell className="font-medium">{t.brand}</TableCell>
              <TableCell>{t.product_code}</TableCell>
              <TableCell>{t.requested_quantity}</TableCell>
              <TableCell className="text-sm">{type === 'sent' ? t.source_branch : t.requester_branch}</TableCell>
              <TableCell>
                <Badge variant={t.priority === 'urgente' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {t.priority}
                </Badge>
              </TableCell>
              <TableCell>
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
