import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Package, DollarSign, Clock, Truck, FileText, Info, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DESARME_STATUS_LABELS, DESARME_STATUS_COLORS } from '@/constants/desarmeStatuses';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DesarmeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  desarmeId: string | null;
  canGenerateOrder?: boolean;
  canUpdateStatus?: boolean;
  onRefresh: () => void;
}

const DesarmeDetailModal = ({ isOpen, onClose, desarmeId, canGenerateOrder, canUpdateStatus, onRefresh }: DesarmeDetailModalProps) => {
  const { user } = useAuth();
  const [desarme, setDesarme] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [serviceOrderNumber, setServiceOrderNumber] = useState('');
  const [cancelObservation, setCancelObservation] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<string | null>(null);
  const [receiveObservation, setReceiveObservation] = useState('');
  const [showMarkAll, setShowMarkAll] = useState(false);
  const [markAllObservation, setMarkAllObservation] = useState('');
  const [showForceClose, setShowForceClose] = useState(false);
  const [forceCloseOS, setForceCloseOS] = useState('');
  const [forceCloseObs, setForceCloseObs] = useState('');

  useEffect(() => {
    if (!isOpen || !desarmeId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.functions.invoke('desarme-operations', {
        body: { action: 'getDesarmeDetail', desarmeId },
      });
      if (data?.desarme) setDesarme(data.desarme);
      if (data?.logs) setLogs(data.logs);
      if (data?.items) setItems(data.items);
      setLoading(false);
    };
    fetch();
  }, [isOpen, desarmeId]);

  const refetchDetail = async () => {
    const { data } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'getDesarmeDetail', desarmeId },
    });
    if (data?.desarme) setDesarme(data.desarme);
    if (data?.logs) setLogs(data.logs);
    if (data?.items) setItems(data.items);
  };

  const handleGenerateOrder = async () => {
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'generateOrder', desarmeId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al generar pedido');
    } else {
      toast.success('Pedido generado exitosamente');
      onRefresh();
      await refetchDetail();
    }
    setActionLoading(false);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === 'cerrado' && !serviceOrderNumber.trim()) {
      toast.error('Ingresa el Nro. de Orden de Servicio para cerrar');
      return;
    }
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: {
        action: 'updateDesarmeStatus', desarmeId, newStatus,
        ...(newStatus === 'cerrado' ? { service_order_number: serviceOrderNumber.trim() } : {}),
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al cambiar estado');
    } else {
      toast.success('Estado actualizado');
      onRefresh();
      await refetchDetail();
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!desarmeId) return;
    setDeleteLoading(true);
    try {
      // Delete status logs first, then the desarme
      await supabase.from('desarme_status_log').delete().eq('desarme_id', desarmeId);
      const { error } = await supabase.from('desarmes').delete().eq('id', desarmeId);
      if (error) {
        toast.error('Error al eliminar el desarme');
      } else {
        toast.success('Desarme eliminado correctamente');
        onRefresh();
        onClose();
      }
    } catch {
      toast.error('Error al eliminar');
    }
    setDeleteLoading(false);
  };

  const isCreator = user?.id === desarme?.created_by;
  const canCancel = isCreator && desarme && ['pendiente_cotizacion', 'pendiente_autorizacion', 'aprobado'].includes(desarme.status);

  const handleCancel = async () => {
    if (!cancelObservation.trim()) {
      toast.error('La observación es obligatoria para cancelar');
      return;
    }
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'cancelDesarme', desarmeId, observation: cancelObservation.trim() },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al cancelar');
    } else {
      toast.success('Desarme cancelado');
      setShowCancelConfirm(false);
      setCancelObservation('');
      onRefresh();
      await refetchDetail();
    }
    setActionLoading(false);
  };

  const nextStatusMap: Record<string, string> = {
    recibido: 'maquina_rearmada',
    maquina_rearmada: 'cerrado',
  };

  const nextStatusLabels: Record<string, string> = {
    maquina_rearmada: 'Confirmar máquina rearmada',
    cerrado: 'Cerrar desarme',
  };

  const shippingLabels: Record<string, string> = { aereo: 'Aéreo', maritimo: 'Marítimo', terrestre: 'Terrestre' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : desarme ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  {desarme.desarme_number}
                  {desarme.is_urgent && <AlertTriangle className="w-4 h-4 text-destructive" />}
                </DialogTitle>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${DESARME_STATUS_COLORS[desarme.status] || ''}`}>
                  {DESARME_STATUS_LABELS[desarme.status] || desarme.status}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-muted/50 rounded-lg p-3">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{desarme.client_name}</span></div>
                <div><span className="text-muted-foreground">Sucursal:</span> {desarme.branch}</div>
                {desarme.salesperson && <div><span className="text-muted-foreground">Vendedor:</span> {desarme.salesperson}</div>}
                <div><span className="text-muted-foreground">Marca:</span> {desarme.brand}</div>
                <div><span className="text-muted-foreground">Modelo:</span> {desarme.model}</div>
                <div><span className="text-muted-foreground">Serie:</span> <span className="font-mono">{desarme.serial_number}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Motivo:</span> {desarme.reason}</div>
                {desarme.service_order_number && (
                  <div className="col-span-2"><span className="text-muted-foreground">Orden de Servicio:</span> <span className="font-mono font-medium">{desarme.service_order_number}</span></div>
                )}
              </div>

              {/* Items list */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Repuestos ({items.length || 1})</p>
                <div className="border rounded-lg overflow-hidden">
                  {(items.length > 0 ? items : [{ id: 'legacy', product_code: desarme.product_code, product_name: desarme.product_name, quantity: desarme.quantity, received_at: null, linked_order: null }]).map((it: any) => (
                    <div key={it.id} className="flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-medium">{it.product_code}</span>
                          <span className="text-muted-foreground">× {it.quantity}</span>
                        </div>
                        {it.product_name && <p className="text-[11px] text-muted-foreground truncate">{it.product_name}</p>}
                      </div>
                      {it.received_at ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Recibido</span>
                      ) : it.linked_order ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Pedido {it.linked_order.order_number || it.linked_order_id?.slice(0, 6)}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>



              {/* Quote */}
              {desarme.quoted_value !== null && (
                <div className="bg-primary/5 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-sm">Cotización</p>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" /><span className="font-bold text-base">${Number(desarme.quoted_value).toLocaleString()}</span></div>
                  {desarme.quoted_deadline && <div className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {desarme.quoted_deadline}</div>}
                  {desarme.quoted_shipping_method && <div className="flex items-center gap-1 text-muted-foreground"><Truck className="w-3 h-3" /> {shippingLabels[desarme.quoted_shipping_method] || desarme.quoted_shipping_method}</div>}
                  {desarme.quote_observations && <p className="text-muted-foreground">{desarme.quote_observations}</p>}
                </div>
              )}

              {/* Rejection */}
              {desarme.status === 'rechazado' && desarme.rejection_reason && (
                <div className="bg-destructive/10 rounded-lg p-3 text-xs">
                  <p className="font-medium text-destructive">Rechazado</p>
                  <p className="text-destructive/80">{desarme.rejection_reason}</p>
                </div>
              )}

              {/* Linked order */}
              {desarme.linked_order_id && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Pedido vinculado: <span className="font-mono">{desarme.linked_order_id.slice(0, 8)}...</span></span>
                </div>
              )}

              {/* Info message for pedido_generado */}
              {desarme.status === 'pedido_generado' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Esperando recepción del repuesto. Se actualizará automáticamente al entregar el pedido vinculado.</span>
                </div>
              )}

              {/* Actions */}
              {canGenerateOrder && desarme.status === 'aprobado' && (
                <Button onClick={handleGenerateOrder} className="w-full gap-2" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Generar Pedido
                </Button>
              )}

              {canUpdateStatus && nextStatusMap[desarme.status] && (
                <div className="space-y-2">
                  {nextStatusMap[desarme.status] === 'cerrado' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        Nro. Orden de Servicio <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={serviceOrderNumber}
                        onChange={e => setServiceOrderNumber(e.target.value)}
                        placeholder="Ingrese el Nro. de O.S."
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  <Button onClick={() => handleStatusUpdate(nextStatusMap[desarme.status])} variant="outline" className="w-full text-xs" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (nextStatusLabels[nextStatusMap[desarme.status]] || `Avanzar a: ${DESARME_STATUS_LABELS[nextStatusMap[desarme.status]]}`)}
                  </Button>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-medium mb-2">Historial</p>
                <div className="space-y-0">
                  {logs.map((log, i) => (
                    <div key={log.id} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {i < logs.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="pb-3">
                        <p className="font-medium">{DESARME_STATUS_LABELS[log.to_status] || log.to_status}</p>
                        <p className="text-muted-foreground">{log.changed_by_name} · {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: es })}</p>
                        {log.observation && <p className="text-muted-foreground italic">{log.observation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Cancel operation */}
              {canCancel && (
                <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20 gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4" /> Cancelar operación
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar desarme?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se cancelará el desarme <span className="font-mono font-medium">{desarme.desarme_number}</span>. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observación <span className="text-destructive">*</span></Label>
                      <Input
                        value={cancelObservation}
                        onChange={e => setCancelObservation(e.target.value)}
                        placeholder="Motivo de la cancelación..."
                        className="h-9 text-sm"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setCancelObservation('')}>Volver</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} className="bg-orange-600 text-white hover:bg-orange-700" disabled={actionLoading || !cancelObservation.trim()}>
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cancelación'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Delete */}
              {isCreator && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 text-xs mt-2">
                      <Trash2 className="w-4 h-4" /> Eliminar desarme y su historial
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar desarme?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará el desarme <span className="font-mono font-medium">{desarme.desarme_number}</span> y todo su historial de estados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteLoading}>
                        {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">Desarme no encontrado</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DesarmeDetailModal;
