import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package } from 'lucide-react';
import { z } from 'zod';

const orderSchema = z.object({
  brand: z.string().min(1, 'La marca es requerida').max(100),
  productCode: z.string().min(1, 'El código es requerido').max(100),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  branchDestination: z.string().min(1, 'Selecciona una sucursal'),
  observation: z.string().max(500).optional(),
});

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: {
    brand: string;
    productCode: string;
    quantity: number;
    branchDestination: string;
    observation: string;
  }) => Promise<void>;
}

const BRANCHES = [
  'Sucursal Central',
  'Sucursal Norte',
  'Sucursal Sur',
  'Sucursal Este',
  'Sucursal Oeste',
];

const OrderForm = ({ isOpen, onClose, onSubmit }: OrderFormProps) => {
  const [brand, setBrand] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [branchDestination, setBranchDestination] = useState('');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setBrand('');
    setProductCode('');
    setQuantity(1);
    setBranchDestination('');
    setObservation('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = orderSchema.safeParse({
      brand,
      productCode,
      quantity,
      branchDestination,
      observation,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        brand,
        productCode,
        quantity,
        branchDestination,
        observation: observation || '',
      });
      resetForm();
      onClose();
    } catch (err) {
      setError('Error al crear el pedido');
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 ios-shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Nuevo Pedido</DialogTitle>
              <DialogDescription className="text-sm">
                Completa los datos del repuesto
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              placeholder="Ej: Toyota, Ford, Chevrolet"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-11 bg-secondary/50 border-0"
              required
            />
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="productCode">Código de Mercadería</Label>
            <Input
              id="productCode"
              placeholder="Ej: ABC-12345"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="h-11 bg-secondary/50 border-0"
              required
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="h-11 bg-secondary/50 border-0"
              required
            />
          </div>

          {/* Branch Destination */}
          <div className="space-y-2">
            <Label htmlFor="branch">Destino Sucursal</Label>
            <Select value={branchDestination} onValueChange={setBranchDestination}>
              <SelectTrigger className="h-11 bg-secondary/50 border-0">
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observation">Observación (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Notas adicionales sobre el pedido..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="bg-secondary/50 border-0 min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1 h-11"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando
                </>
              ) : (
                'Guardar Pedido'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderForm;
