import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertTriangle, DollarSign, Clock, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthorizeDesarmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  desarme: any;
  onActioned: () => void;
}

const AuthorizeDesarmeModal = ({ isOpen, onClose, desarme, onActioned }: AuthorizeDesarmeModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!desarme) return null;

  const handleApprove = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'authorizeDesarme', desarmeId: desarme.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al aprobar');
    } else {
      toast.success('Desarme aprobado');
      onActioned();
      onClose();
    }
    setIsLoading(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { toast.error('El motivo de rechazo es obligatorio'); return; }
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: { action: 'rejectDesarme', desarmeId: desarme.id, rejection_reason: rejectionReason },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Error al rechazar');
    } else {
      toast.success('Desarme rechazado');
      setRejectionReason('');
      setShowReject(false);
      onActioned();
      onClose();
    }
    setIsLoading(false);
  };

  const shippingLabels: Record<string, string> = { aereo: 'Aéreo', maritimo: 'Marítimo', terrestre: 'Terrestre' };

  return (
    <Dialog open={isOpen} onOpenChange={() => { setShowReject(false); setRejectionReason(''); onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autorizar Desarme {desarme.desarme_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-medium">{desarme.client_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Máquina:</span><span>{desarme.brand} {desarme.model} – {desarme.serial_number}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Repuesto{(desarme.items_count || 1) > 1 ? 's' : ''}:</span><span className="font-mono text-right break-all">{desarme.items_summary || `${desarme.product_code} × ${desarme.quantity}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Motivo:</span><span>{desarme.reason}</span></div>
            {desarme.is_urgent && (
              <div className="flex items-center gap-1 text-destructive font-medium">
                <AlertTriangle className="w-3 h-3" /> Máquina parada
              </div>
            )}
          </div>

          {/* Quote info */}
          <div className="bg-primary/5 rounded-lg p-3 space-y-1.5 text-xs">
            <p className="font-medium text-sm">Cotización</p>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-base">${Number(desarme.quoted_value).toLocaleString()}</span>
            </div>
            {desarme.quoted_deadline && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3 h-3" /> Plazo: {desarme.quoted_deadline}
              </div>
            )}
            {desarme.quoted_shipping_method && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="w-3 h-3" /> Envío: {shippingLabels[desarme.quoted_shipping_method] || desarme.quoted_shipping_method}
              </div>
            )}
            {desarme.quote_observations && (
              <p className="text-muted-foreground mt-1">{desarme.quote_observations}</p>
            )}
            {desarme.quoted_by_name && (
              <p className="text-muted-foreground">Cotizado por: {desarme.quoted_by_name}</p>
            )}
          </div>

          {showReject ? (
            <div className="space-y-2">
              <Label className="text-xs">Motivo de Rechazo <span className="text-destructive">*</span></Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Indicar motivo..." className="text-sm min-h-[60px]" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReject(false)} className="flex-1" disabled={isLoading}>Cancelar</Button>
                <Button variant="destructive" onClick={handleReject} className="flex-1" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1" /> Rechazar</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowReject(true)} className="flex-1 text-destructive hover:text-destructive" disabled={isLoading}>
                <XCircle className="w-4 h-4 mr-1" /> Rechazar
              </Button>
              <Button onClick={handleApprove} className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Aprobar</>}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthorizeDesarmeModal;
