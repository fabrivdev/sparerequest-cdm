import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TRANSFER_STATUS_COLORS, VALID_TRANSITIONS, TransferStatus } from '@/constants/transferStatuses';
import { Loader2, Clock, User, ArrowRight } from 'lucide-react';

interface TransferDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string;
  userBranch: string;
  userId: string;
  userName: string;
  onStatusChange: () => void;
}

const TransferDetailModal = ({ isOpen, onClose, transferId, userBranch, userId, userName, onStatusChange }: TransferDetailModalProps) => {
  const [transfer, setTransfer] = useState<any>(null);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [actionObservation, setActionObservation] = useState('');
  const [actionQuantity, setActionQuantity] = useState('');

  useEffect(() => {
    if (isOpen && transferId) fetchDetail();
  }, [isOpen, transferId]);

  const fetchDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'getTransferDetail', transferId },
    });
    if (data) {
      setTransfer(data.transfer);
      setStatusLog(data.statusLog || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: {
        action: 'updateTransferStatus',
        transferId,
        newStatus,
        userId,
        userName,
        observation: actionObservation || null,
        quantity: actionQuantity ? parseInt(actionQuantity) : undefined,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Error al actualizar');
    } else {
      toast.success(`Estado actualizado a ${data.newStatus}`);
      setActionObservation('');
      setActionQuantity('');
      fetchDetail();
      onStatusChange();
    }
    setUpdating(false);
  };

  // Determine available actions based on role
  const getAvailableActions = () => {
    if (!transfer) return [];
    const currentStatus = transfer.status as string;
    const transitions = VALID_TRANSITIONS[currentStatus] || [];

    // Source branch can: Accept, Reject, Dispatch
    // Requester branch can: Receive, Cancel (before accepted)
    return transitions.filter(nextStatus => {
      if (['Aceptada', 'Rechazada', 'Despachada'].includes(nextStatus)) {
        return userBranch === transfer.source_branch;
      }
      if (nextStatus === 'Cancelada') {
        return transfer.requester_user_id === userId;
      }
      if (nextStatus === 'Recibida') {
        return userBranch === transfer.requester_branch;
      }
      if (nextStatus === 'Cerrada') {
        return true; // Both can close incidents
      }
      return false;
    });
  };

  const needsQuantity = (status: string) => ['Aceptada', 'Despachada', 'Recibida'].includes(status);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!transfer) return null;

  const actions = getAvailableActions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Detalle de Transferencia</DialogTitle>
        </DialogHeader>

        {/* Transfer info */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Producto:</span>
              <p className="font-medium">{transfer.brand} - {transfer.product_code}</p>
              <p className="text-xs text-muted-foreground">{transfer.product_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>
              <div className="mt-0.5">
                <Badge className={TRANSFER_STATUS_COLORS[transfer.status as TransferStatus] || ''}>{transfer.status}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Origen:</span>
              <p className="font-medium">{transfer.source_branch}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Destino:</span>
              <p className="font-medium">{transfer.requester_branch}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cantidad solicitada:</span>
              <p className="font-medium">{transfer.requested_quantity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Prioridad:</span>
              <Badge variant={transfer.priority === 'urgente' ? 'destructive' : 'secondary'} className="text-xs">
                {transfer.priority}
              </Badge>
            </div>
            {transfer.approved_quantity && (
              <div>
                <span className="text-muted-foreground">Cant. aprobada:</span>
                <p className="font-medium">{transfer.approved_quantity}</p>
              </div>
            )}
            {transfer.dispatched_quantity && (
              <div>
                <span className="text-muted-foreground">Cant. despachada:</span>
                <p className="font-medium">{transfer.dispatched_quantity}</p>
              </div>
            )}
            {transfer.received_quantity != null && (
              <div>
                <span className="text-muted-foreground">Cant. recibida:</span>
                <p className="font-medium">{transfer.received_quantity}</p>
              </div>
            )}
          </div>

          {transfer.observation && (
            <div className="text-sm">
              <span className="text-muted-foreground">Observación:</span>
              <p>{transfer.observation}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-3">Historial</h4>
          <div className="space-y-3">
            {statusLog.map((log, i) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {i < statusLog.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    {log.from_status && (
                      <>
                        <Badge variant="secondary" className="text-[10px]">{log.from_status}</Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={`text-[10px] ${TRANSFER_STATUS_COLORS[log.to_status as TransferStatus] || ''}`}>
                      {log.to_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {log.changed_by_name}
                    <Clock className="w-3 h-3 ml-1" />
                    {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: es })}
                  </div>
                  {log.observation && <p className="text-xs mt-0.5">{log.observation}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mt-4 border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-semibold">Acciones</h4>

            {actions.some(a => needsQuantity(a)) && (
              <Input
                type="number"
                placeholder="Cantidad"
                value={actionQuantity}
                onChange={(e) => setActionQuantity(e.target.value)}
                className="h-9"
              />
            )}

            <Textarea
              placeholder="Observación (opcional)"
              value={actionObservation}
              onChange={(e) => setActionObservation(e.target.value)}
              rows={2}
            />

            <div className="flex flex-wrap gap-2">
              {actions.map(status => (
                <Button
                  key={status}
                  size="sm"
                  variant={['Rechazada', 'Cancelada'].includes(status) ? 'destructive' : 'default'}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {status}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransferDetailModal;
