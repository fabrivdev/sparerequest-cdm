import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuoteDesarmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  desarme: any;
  onQuoted: () => void;
}

const QuoteDesarmeModal = ({ isOpen, onClose, desarme, onQuoted }: QuoteDesarmeModalProps) => {
  const [quotedValue, setQuotedValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [observations, setObservations] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!desarme) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotedValue) { toast.error('El valor cotizado es obligatorio'); return; }

    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('desarme-operations', {
      body: {
        action: 'quoteDesarme',
        desarmeId: desarme.id,
        quoted_value: quotedValue,
        quoted_deadline: deadline || null,
        quoted_shipping_method: shippingMethod || null,
        quote_observations: observations || null,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Error al cotizar');
    } else {
      toast.success('Cotización registrada');
      setQuotedValue(''); setDeadline(''); setShippingMethod(''); setObservations('');
      onQuoted();
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Cotizar Desarme {desarme.desarme_number}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Desarme info summary */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-medium">{desarme.client_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Máquina:</span><span>{desarme.brand} {desarme.model} – {desarme.serial_number}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Repuesto:</span><span className="font-mono">{desarme.product_code} × {desarme.quantity}</span></div>
          {desarme.is_urgent && (
            <div className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="w-3 h-3" /> Máquina parada
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor Cotizado (USD) <span className="text-destructive">*</span></Label>
            <Input type="number" step="0.01" min="0" value={quotedValue} onChange={e => setQuotedValue(e.target.value)} placeholder="0.00" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Plazo Estimado</Label>
            <Input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Ej: 15 días" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Método de Envío Sugerido</Label>
            <Select value={shippingMethod} onValueChange={setShippingMethod}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aereo">Aéreo</SelectItem>
                <SelectItem value="maritimo">Marítimo</SelectItem>
                <SelectItem value="terrestre">Terrestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Notas adicionales..." className="text-sm min-h-[50px]" />
          </div>
          <Button type="submit" className="w-full h-10" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Cotización'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteDesarmeModal;
