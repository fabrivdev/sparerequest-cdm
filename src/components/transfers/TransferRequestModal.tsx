import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeftRight, User, Warehouse, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StockItem {
  brand: string;
  product_code: string;
  product_name: string;
  branch: string;
  quantity: number;
}

interface TransferRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: string;
  productCode: string;
  productName: string;
  stockByBranch: StockItem[];
  userBranch: string;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

const DESTINATION_OPTIONS = [
  { value: 'stock', label: 'Stock', icon: Warehouse },
  { value: 'cliente', label: 'Cliente', icon: User },
  { value: 'ambos', label: 'Ambos', icon: Users },
];

const TransferRequestModal = ({
  isOpen, onClose, brand, productCode, productName,
  stockByBranch, userBranch, userId, userName, onSuccess,
}: TransferRequestModalProps) => {
  const [sourceBranch, setSourceBranch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priority, setPriority] = useState('normal');
  const [destination, setDestination] = useState('stock');
  const [clientName, setClientName] = useState('');
  const [remissionNumber, setRemissionNumber] = useState('');
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableBranches = stockByBranch.filter(s => s.branch !== userBranch && s.quantity > 0);
  const selectedStock = stockByBranch.find(s => s.branch === sourceBranch);
  const maxQuantity = selectedStock?.quantity || 0;
  const needsClientName = destination === 'cliente' || destination === 'ambos';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);

    if (!sourceBranch || !qty || qty <= 0) {
      toast.error('Complete todos los campos');
      return;
    }

    if (qty > maxQuantity) {
      toast.error(`Stock disponible: ${maxQuantity}`);
      return;
    }

    if (!remissionNumber.trim()) {
      toast.error('Ingrese el número de remisión');
      return;
    }

    if (needsClientName && !clientName.trim()) {
      toast.error('Ingrese el nombre del cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-operations', {
        body: {
          action: 'createTransfer',
          transfer: {
            requester_user_id: userId,
            requester_branch: userBranch,
            source_branch: sourceBranch,
            brand,
            product_code: productCode,
            product_name: productName,
            requested_quantity: qty,
            priority,
            transfer_destination: destination,
            client_name: needsClientName ? clientName : null,
            remission_number: remissionNumber,
            observation: observation || null,
          },
          userName,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Error al crear transferencia');
      } else {
        toast.success('Transferencia solicitada correctamente');
        onSuccess();
        onClose();
        setSourceBranch('');
        setQuantity('');
        setPriority('normal');
        setDestination('stock');
        setClientName('');
        setRemissionNumber('');
        setObservation('');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto my-4">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Solicitar Transferencia</DialogTitle>
              <p className="text-sm text-muted-foreground">{brand} - {productCode}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">{productName}</div>

        {/* Stock by branch */}
        <div className="flex flex-wrap gap-2 mb-4">
          {stockByBranch.map(s => (
            <Badge
              key={s.branch}
              variant={s.branch === userBranch ? 'default' : s.quantity > 0 ? 'outline' : 'secondary'}
              className="text-xs"
            >
              {s.branch}: {s.quantity}
            </Badge>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sucursal Origen</label>
            <Select value={sourceBranch} onValueChange={setSourceBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map(s => (
                  <SelectItem key={s.branch} value={s.branch}>
                    {s.branch} (Stock: {s.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Cantidad {maxQuantity > 0 && <span className="text-muted-foreground font-normal">(máx: {maxQuantity})</span>}
            </label>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Cantidad a solicitar"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Destino</label>
            <div className="grid grid-cols-3 gap-2">
              {DESTINATION_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = destination === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDestination(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {needsClientName && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Nombre del Cliente <span className="text-destructive">*</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Prioridad</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Nro. de Remisión <span className="text-destructive">*</span>
            </label>
            <Input
              value={remissionNumber}
              onChange={(e) => setRemissionNumber(e.target.value)}
              placeholder="Número de remisión"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Observación</label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Observaciones opcionales..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !sourceBranch || !quantity || !remissionNumber.trim() || (needsClientName && !clientName.trim())}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Solicitar Transferencia'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferRequestModal;
