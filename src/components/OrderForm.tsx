import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Package, Check, AlertCircle, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { BRANCHES } from '@/constants/branches';
import { supabase } from '@/integrations/supabase/client';

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
  defaultBranch?: string;
}

const BRANDS = [
  { value: 'CLAAS', label: 'CLAAS', color: '#B4C618', textColor: 'text-black' },
  { value: 'HORSCH', label: 'HORSCH', color: '#A01B1B', textColor: 'text-white' },
];

const OrderForm = ({ isOpen, onClose, onSubmit, defaultBranch = '' }: OrderFormProps) => {
  const [brand, setBrand] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productNotFound, setProductNotFound] = useState(false);
  const [quantity, setQuantity] = useState<string>('1');
  const [branchDestination, setBranchDestination] = useState(defaultBranch);
  const [observation, setObservation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [closeAnimation, setCloseAnimation] = useState<'pack' | 'trash' | null>(null);

  // Update default branch when form opens
  useEffect(() => {
    if (isOpen && defaultBranch) {
      setBranchDestination(defaultBranch);
    }
    if (isOpen) {
      setCloseAnimation(null);
    }
  }, [isOpen, defaultBranch]);

  // Search for product name when code or brand changes
  const searchProductByCodeAndBrand = useCallback(async (code: string, selectedBrand: string) => {
    if (!code.trim() || !selectedBrand) {
      setProductName('');
      setProductNotFound(false);
      return;
    }

    setIsSearching(true);
    setProductNotFound(false);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .ilike('code', code.trim())
        .ilike('brand', selectedBrand)
        .maybeSingle();

      if (data && !error) {
        setProductName(data.name);
        setProductNotFound(false);
      } else {
        setProductName('');
        setProductNotFound(true);
      }
    } catch {
      setProductName('');
      setProductNotFound(true);
    }
    setIsSearching(false);
  }, []);

  // Debounce product code search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProductByCodeAndBrand(productCode, brand);
    }, 300);

    return () => clearTimeout(timer);
  }, [productCode, brand, searchProductByCodeAndBrand]);

  const resetForm = () => {
    setBrand('');
    setProductCode('');
    setProductName('');
    setProductNotFound(false);
    setQuantity('1');
    setBranchDestination(defaultBranch);
    setObservation('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const quantityNum = parseInt(quantity) || 0;
    
    const validation = orderSchema.safeParse({
      brand,
      productCode,
      quantity: quantityNum,
      branchDestination,
      observation,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    // Validate product exists in catalog with matching brand
    if (!productName) {
      setError('El producto no existe en el catálogo para la marca seleccionada');
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        brand,
        productCode,
        quantity: quantityNum,
        branchDestination,
        observation: observation || '',
      });
      
      // Trigger pack animation
      setCloseAnimation('pack');
      setTimeout(() => {
        resetForm();
        onClose();
      }, 600);
    } catch (err) {
      setError('Error al crear el pedido');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Trigger trash animation
    setCloseAnimation('trash');
    setTimeout(() => {
      resetForm();
      onClose();
    }, 500);
  };

  // Animation classes
  const getAnimationClass = () => {
    if (closeAnimation === 'pack') {
      return 'animate-pack-box';
    }
    if (closeAnimation === 'trash') {
      return 'animate-trash';
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 border-0 ios-shadow-lg rounded-2xl p-6">
        {/* Animation overlay */}
        {closeAnimation && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
            {closeAnimation === 'pack' ? (
              <div className="flex flex-col items-center gap-3 animate-scale-in">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center animate-bounce">
                  <Package className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary">¡Pedido guardado!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 animate-scale-in">
                <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-10 h-10 text-destructive animate-wiggle" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Descartado</p>
              </div>
            )}
          </div>
        )}

        <div className={`transition-all duration-300 ${closeAnimation ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Nuevo Pedido</DialogTitle>
                <DialogDescription className="text-xs">
                  Completa los datos del repuesto
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Brand */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Marca <span className="text-destructive">*</span></Label>
              <div className="flex gap-3">
                {BRANDS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBrand(b.value)}
                    className={`flex-1 h-10 rounded-xl font-semibold text-xs transition-all duration-200 border-2 ${
                      brand === b.value 
                        ? 'ring-2 ring-offset-2 ring-primary scale-[1.02] shadow-md' 
                        : 'opacity-60 hover:opacity-100'
                    } ${b.textColor}`}
                    style={{ 
                      backgroundColor: b.color,
                      borderColor: brand === b.value ? b.color : 'transparent'
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Code */}
            <div className="space-y-2">
              <Label htmlFor="productCode" className="text-xs font-medium">Código de Mercadería <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="productCode"
                  placeholder="Ej: ABC-12345"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="h-10 bg-secondary/50 border-0 rounded-xl text-sm pr-10"
                  required
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {productName && !isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
                {productNotFound && !isSearching && productCode && brand && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                )}
              </div>
              {productName && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {productName}
                </p>
              )}
              {productNotFound && !isSearching && productCode && brand && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Producto no encontrado para {brand}
                </p>
              )}
              {!brand && productCode && (
                <p className="text-xs text-muted-foreground">
                  Selecciona una marca para validar el código
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs font-medium">Cantidad <span className="text-destructive">*</span></Label>
              <Input
                id="quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                className="h-10 bg-secondary/50 border-0 rounded-xl text-sm"
                required
              />
            </div>

            {/* Branch Destination */}
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-xs font-medium">Destino Sucursal <span className="text-destructive">*</span></Label>
              <Select value={branchDestination} onValueChange={setBranchDestination} required>
                <SelectTrigger className="h-10 bg-secondary/50 border-0 rounded-xl text-sm">
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
              <Label htmlFor="observation" className="text-xs font-medium">Observación (opcional)</Label>
              <Textarea
                id="observation"
                placeholder="Notas adicionales sobre el pedido..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="bg-secondary/50 border-0 rounded-xl min-h-[70px] resize-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                className="flex-1 h-10 rounded-xl text-sm gap-2"
                disabled={isLoading || closeAnimation !== null}
              >
                <Trash2 className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10 rounded-xl text-sm gap-2"
                disabled={isLoading || (productNotFound && !!productCode && !!brand) || closeAnimation !== null}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Guardar Pedido
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(-10deg); }
        }
        
        @keyframes pack-bounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.1); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out;
        }
        
        .animate-pack-box {
          animation: pack-bounce 0.6s ease-in-out;
        }
      `}</style>
    </Dialog>
  );
};

export default OrderForm;