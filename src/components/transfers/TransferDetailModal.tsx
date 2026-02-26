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
import { Loader2, Clock, User, ArrowRight, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TransferDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string;
  userBranch: string;
  userId: string;
  userName: string;
  onStatusChange: () => void;
}

const DESTINATION_LABELS: Record<string, string> = {
  stock: 'Stock',
  cliente: 'Cliente',
  ambos: 'Ambos',
};

const TransferDetailModal = ({ isOpen, onClose, transferId, userBranch, userId, userName, onStatusChange }: TransferDetailModalProps) => {
  const [transfer, setTransfer] = useState<any>(null);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionObservation, setActionObservation] = useState('');
  const [actionQuantity, setActionQuantity] = useState('');
  // Invoice fields for receiving
  const [isInvoiced, setIsInvoiced] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notInvoicedReason, setNotInvoicedReason] = useState('');

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

  const needsInvoiceData = (status: string) => {
    if (status !== 'Recibida' || !transfer) return false;
    return transfer.transfer_destination === 'cliente' || transfer.transfer_destination === 'ambos';
  };

  const handleStatusChange = async (newStatus: string) => {
    // Validate invoice data if needed
    if (needsInvoiceData(newStatus)) {
      if (!isInvoiced) {
        toast.error('Indique si fue facturado');
        return;
      }
      if (isInvoiced === 'si' && !invoiceNumber.trim()) {
        toast.error('Ingrese el número de factura');
        return;
      }
      if (isInvoiced === 'no' && !notInvoicedReason.trim()) {
        toast.error('Ingrese el motivo de no facturación');
        return;
      }
    }

    setUpdating(true);
    const bodyData: any = {
      action: 'updateTransferStatus',
      transferId,
      newStatus,
      userId,
      userName,
      observation: actionObservation || null,
      quantity: actionQuantity ? parseInt(actionQuantity) : undefined,
    };

    if (needsInvoiceData(newStatus)) {
      bodyData.isInvoiced = isInvoiced === 'si';
      bodyData.invoiceNumber = isInvoiced === 'si' ? invoiceNumber : null;
      bodyData.notInvoicedReason = isInvoiced === 'no' ? notInvoicedReason : null;
    }

    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: bodyData,
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Error al actualizar');
    } else {
      toast.success(`Estado actualizado a ${data.newStatus}`);
      setActionObservation('');
      setActionQuantity('');
      setIsInvoiced('');
      setInvoiceNumber('');
      setNotInvoicedReason('');
      fetchDetail();
      onStatusChange();
    }
    setUpdating(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'deleteTransfer', transferId, userId },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Error al eliminar');
    } else {
      toast.success('Transferencia eliminada');
      onStatusChange();
      onClose();
    }
    setDeleting(false);
  };

  const canDelete = transfer?.status === 'Pendiente' && transfer?.requester_user_id === userId;

  const getAvailableActions = () => {
    if (!transfer) return [];
    const currentStatus = transfer.status as string;
    const transitions = VALID_TRANSITIONS[currentStatus] || [];

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
        return true;
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
  const showInvoiceFields = actions.includes('Recibida') && needsInvoiceData('Recibida');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto my-4">
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
            {/* New fields */}
            <div>
              <span className="text-muted-foreground">Destino pedido:</span>
              <p className="font-medium">{DESTINATION_LABELS[transfer.transfer_destination] || transfer.transfer_destination || 'Stock'}</p>
            </div>
            {transfer.client_name && (
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{transfer.client_name}</p>
              </div>
            )}
            {transfer.remission_number && (
              <div>
                <span className="text-muted-foreground">Nro. Remisión:</span>
                <p className="font-medium">{transfer.remission_number}</p>
              </div>
            )}
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
            {transfer.is_invoiced !== null && transfer.is_invoiced !== undefined && (
              <div>
                <span className="text-muted-foreground">Facturado:</span>
                <p className="font-medium">{transfer.is_invoiced ? 'Sí' : 'No'}</p>
              </div>
            )}
            {transfer.invoice_number && (
              <div>
                <span className="text-muted-foreground">Nro. Factura:</span>
                <p className="font-medium">{transfer.invoice_number}</p>
              </div>
            )}
            {transfer.not_invoiced_reason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Motivo no facturado:</span>
                <p className="font-medium">{transfer.not_invoiced_reason}</p>
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

            {/* Invoice fields when receiving client/ambos transfers */}
            {showInvoiceFields && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase">Facturación</h5>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">¿Se facturó?</label>
                  <Select value={isInvoiced} onValueChange={setIsInvoiced}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isInvoiced === 'si' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Nro. de Factura <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Número de factura"
                      className="h-9"
                    />
                  </div>
                )}
                {isInvoiced === 'no' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Motivo <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={notInvoicedReason}
                      onChange={(e) => setNotInvoicedReason(e.target.value)}
                      placeholder="¿Por qué no se facturó?"
                      className="h-9"
                    />
                  </div>
                )}
              </div>
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
                  {status === 'Aceptada' ? 'Aceptar y Despachar' : status}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Delete button - only for creator when Pendiente */}
        {canDelete && (
          <div className="mt-4 border-t border-border pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar transferencia
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta transferencia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud de transferencia.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransferDetailModal;
