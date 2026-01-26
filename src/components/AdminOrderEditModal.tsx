import { useState, useEffect } from 'react';
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
import { Loader2, Pencil } from 'lucide-react';
import { z } from 'zod';
import { Order } from './OrdersTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const orderSchema = z.object({
  brand: z.string().min(1, 'La marca es requerida').max(100),
  productCode: z.string().min(1, 'El código es requerido').max(100),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  branchDestination: z.string().min(1, 'Selecciona una sucursal'),
  observation: z.string().max(500).optional(),
  orderNumber: z.string().max(100).optional(),
  shippingMethod: z.string().optional(),
  orderDestination: z.string().optional(),
});

interface AdminOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  password: string;
  onUpdate: () => void;
}

interface Provider {
  id: string;
  name: string;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

const SHIPPING_METHODS = [
  { value: 'aereo', label: 'Aéreo' },
  { value: 'maritimo', label: 'Marítimo' },
  { value: 'terrestre', label: 'Terrestre' },
];

const ORDER_DESTINATIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'stock', label: 'Stock' },
  { value: 'ambos', label: 'Ambos' },
];

const AdminOrderEditModal = ({ isOpen, onClose, order, password, onUpdate }: AdminOrderEditModalProps) => {
  const [brand, setBrand] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState<string>('1');
  const [branchDestination, setBranchDestination] = useState('');
  const [observation, setObservation] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [shippingMethod, setShippingMethod] = useState('aereo');
  const [orderDestination, setOrderDestination] = useState('cliente');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Fetch providers and branches
  useEffect(() => {
    const fetchData = async () => {
      const [providersRes, branchesRes] = await Promise.all([
        supabase.from('providers').select('*').eq('is_active', true).order('name'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
      ]);
      
      if (providersRes.data) setProviders(providersRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
    };
    
    if (isOpen) fetchData();
  }, [isOpen]);

  // Populate form when order changes
  useEffect(() => {
    if (order && isOpen) {
      setBrand(order.brand);
      setProductCode(order.product_code);
      setQuantity(String(order.quantity));
      setBranchDestination(order.branch_destination);
      setObservation(order.observation || '');
      setOrderNumber(order.order_number || '');
      setShippingMethod(order.shipping_method || 'aereo');
      setOrderDestination(order.order_destination || 'cliente');
    }
  }, [order, isOpen]);

  const resetForm = () => {
    setBrand('');
    setProductCode('');
    setQuantity('1');
    setBranchDestination('');
    setObservation('');
    setOrderNumber('');
    setShippingMethod('aereo');
    setOrderDestination('cliente');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    setError(null);

    const quantityNum = parseInt(quantity) || 0;
    
    const validation = orderSchema.safeParse({
      brand,
      productCode,
      quantity: quantityNum,
      branchDestination,
      observation,
      orderNumber,
      shippingMethod,
      orderDestination,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error: fnError } = await supabase.functions.invoke('admin-orders', {
        body: {
          action: 'adminUpdateOrder',
          password,
          orderId: order.id,
          brand,
          productCode,
          quantity: quantityNum,
          branchDestination,
          observation: observation || null,
          orderNumber: orderNumber || null,
          shippingMethod,
          orderDestination,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      toast.success('Pedido actualizado correctamente');
      resetForm();
      onClose();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el pedido');
      toast.error('Error al actualizar el pedido');
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get brand names from providers or use defaults
  const brandOptions = providers.length > 0 
    ? providers.map(p => p.name) 
    : ['CLAAS', 'HORSCH'];

  // Get branch names from DB or use defaults
  const branchOptions = branches.length > 0 
    ? branches.map(b => b.name) 
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 border-0 ios-shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Editar Pedido (Admin)</DialogTitle>
              <DialogDescription className="text-sm">
                Modifica cualquier campo del pedido
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

          <div className="grid grid-cols-2 gap-4">
            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-brand">Marca <span className="text-destructive">*</span></Label>
              <Select value={brand} onValueChange={setBrand} required>
                <SelectTrigger className="h-11 bg-secondary/50 border-0">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {brandOptions.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Method */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-shipping">Método Envío</Label>
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger className="h-11 bg-secondary/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="admin-edit-productCode">Código de Mercadería <span className="text-destructive">*</span></Label>
            <Input
              id="admin-edit-productCode"
              placeholder="Ej: ABC-12345"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="h-11 bg-secondary/50 border-0"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-quantity">Cantidad <span className="text-destructive">*</span></Label>
              <Input
                id="admin-edit-quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                className="h-11 bg-secondary/50 border-0"
                required
              />
            </div>

            {/* Order Number */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-orderNumber">Nro. Pedido</Label>
              <Input
                id="admin-edit-orderNumber"
                placeholder="PED-001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-11 bg-secondary/50 border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Branch Destination */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-branch">Sucursal <span className="text-destructive">*</span></Label>
              <Select value={branchDestination} onValueChange={setBranchDestination} required>
                <SelectTrigger className="h-11 bg-secondary/50 border-0">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Destination */}
            <div className="space-y-2">
              <Label htmlFor="admin-edit-destination">Destino</Label>
              <Select value={orderDestination} onValueChange={setOrderDestination}>
                <SelectTrigger className="h-11 bg-secondary/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_DESTINATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="admin-edit-observation">Observación</Label>
            <Textarea
              id="admin-edit-observation"
              placeholder="Notas adicionales..."
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
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOrderEditModal;
