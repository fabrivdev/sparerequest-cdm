import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, DollarSign, AlertTriangle, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface QuoteDesarmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  desarme: any;
  onQuoted: () => void;
}

const QuoteDesarmeModal = ({ isOpen, onClose, desarme, onQuoted }: QuoteDesarmeModalProps) => {
  const [quotedValue, setQuotedValue] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
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
        quoted_deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
        quoted_shipping_method: shippingMethod || null,
        quote_observations: observations || null,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Error al cotizar');
    } else {
      toast.success('Cotización registrada');
      setQuotedValue(''); setDeadline(undefined); setShippingMethod(''); setObservations('');
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
          <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Repuesto{(desarme.items_count || 1) > 1 ? 's' : ''}:</span><span className="font-mono text-right break-all">{desarme.items_summary || `${desarme.product_code} × ${desarme.quantity}`}</span></div>
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
            <Label className="text-xs">Plazo Estimado de Entrega</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-9 justify-start text-left text-sm font-normal", !deadline && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "dd/MM/yyyy", { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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
