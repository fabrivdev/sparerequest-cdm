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
import { Loader2, Package, Check, AlertCircle, Trash2, Plane, Ship, Truck, User, Warehouse, Users } from 'lucide-react';
import { z } from 'zod';
// Branches are now fetched dynamically from database
import { supabase } from '@/integrations/supabase/client';

const orderSchema = z.object({
  brand: z.string().min(1, 'La marca es requerida').max(100),
  productCode: z.string().min(1, 'El código es requerido').max(100),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  branchDestination: z.string().min(1, 'Selecciona una sucursal'),
  shippingMethod: z.enum(['aereo', 'maritimo', 'terrestre']),
  orderDestination: z.enum(['cliente', 'stock', 'ambos']),
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
    shippingMethod: string;
    orderDestination: string;
    observation: string;
  }) => Promise<void>;
  defaultBranch?: string;
}

interface Provider {
  id: string;
  name: string;
  color: string;
  text_color: string;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

const OrderForm = ({ isOpen, onClose, onSubmit, defaultBranch = '' }: OrderFormProps) => {
  const [brand, setBrand] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productNotFound, setProductNotFound] = useState(false);
  const [quantity, setQuantity] = useState<string>('1');
  const [branchDestination, setBranchDestination] = useState(defaultBranch);
  const [shippingMethod, setShippingMethod] = useState<'aereo' | 'maritimo' | 'terrestre'>('aereo');
  const [orderDestination, setOrderDestination] = useState<'cliente' | 'stock' | 'ambos'>('cliente');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [closeAnimation, setCloseAnimation] = useState<'pack' | 'trash' | null>(null);
  const [notificationSent, setNotificationSent] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState<number>(0);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Fetch providers and branches from database
  useEffect(() => {
    const fetchData = async () => {
      const [providersRes, branchesRes] = await Promise.all([
        supabase
          .from('providers')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);
      
      if (providersRes.data && !providersRes.error) {
        setProviders(providersRes.data);
      }
      if (branchesRes.data && !branchesRes.error) {
        setBranches(branchesRes.data);
      }
    };
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

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
      setProductPrice(0);
      return;
    }

    setIsSearching(true);
    setProductNotFound(false);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price_aereo, price_maritimo, price_terrestre')
        .ilike('code', code.trim())
        .ilike('brand', selectedBrand)
        .maybeSingle();

      if (data && !error) {
        setProductName(data.name);
        setProductNotFound(false);
        // Set price based on current shipping method
        const priceByMethod = shippingMethod === 'maritimo' 
          ? Number(data.price_maritimo) 
          : shippingMethod === 'terrestre'
            ? Number(data.price_terrestre)
            : Number(data.price_aereo);
        setProductPrice(priceByMethod || 0);
        setNotificationSent(null); // Reset notification flag when product found
      } else {
        // Allow CLAAS-ARG products not in catalog with price 0
        if (selectedBrand === 'CLAAS-ARG') {
          setProductName(`Producto ${code.trim()} (sin precio)`);
          setProductNotFound(false);
          setProductPrice(0);
          setNotificationSent(null);
        } else {
          setProductName('');
          setProductNotFound(true);
          setProductPrice(0);
        }
      }
    } catch {
      // Allow CLAAS-ARG products not in catalog with price 0
      if (selectedBrand === 'CLAAS-ARG') {
        setProductName(`Producto ${code.trim()} (sin precio)`);
        setProductNotFound(false);
        setProductPrice(0);
      } else {
        setProductName('');
        setProductNotFound(true);
        setProductPrice(0);
      }
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

  // Send notification for product not found (debounced)
  useEffect(() => {
    if (!productNotFound || !brand || !productCode || productCode.length < 3) return;
    
    const notificationKey = `${brand}|${productCode}`;
    if (notificationSent === notificationKey) return;

    const timer = setTimeout(async () => {
      try {
        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        await supabase.functions.invoke('admin-orders', {
          body: {
            action: 'createNotification',
            type: 'product_not_found',
            userId: user.id,
            userName: profile?.full_name || user.email || 'Usuario',
            brand,
            productCode,
            message: `${profile?.full_name || 'Un usuario'} buscó el código "${productCode}" para ${brand} (no existe en el catálogo)`,
          },
        });

        setNotificationSent(notificationKey);
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [productNotFound, brand, productCode, notificationSent]);

  const resetForm = () => {
    setBrand('');
    setProductCode('');
    setProductName('');
    setProductNotFound(false);
    setQuantity('1');
    setBranchDestination(defaultBranch);
    setShippingMethod('aereo');
    setOrderDestination('cliente');
    setObservation('');
    setError(null);
    setIsLoading(false);
    setNotificationSent(null);
    setProductPrice(0);
    setCloseAnimation(null);
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
      shippingMethod,
      orderDestination,
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
        shippingMethod,
        orderDestination,
        observation: observation || '',
      });

      // Send notification if product has price 0
      if (productPrice === 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', user.id)
              .maybeSingle();

            await supabase.functions.invoke('admin-orders', {
              body: {
                action: 'createNotification',
                type: 'zero_price_order',
                userId: user.id,
                userName: profile?.full_name || user.email || 'Usuario',
                brand,
                productCode,
                message: `${profile?.full_name || 'Un usuario'} creó un pedido para ${brand} código "${productCode}" con precio $0`,
              },
            });
          }
        } catch (err) {
          console.error('Error sending zero price notification:', err);
        }
      }
      
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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto border-0 ios-shadow-lg rounded-2xl p-4 sm:p-6">
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
              <Select value={brand} onValueChange={setBrand} required>
                <SelectTrigger className="h-10 bg-secondary/50 border-0 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Method */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Método de Envío <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShippingMethod('aereo')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    shippingMethod === 'aereo' 
                      ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-offset-2 ring-blue-500 scale-[1.02] shadow-md' 
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span>Aéreo</span>
                    <span className="text-[9px] opacity-75 font-normal">Urgente</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethod('maritimo')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    shippingMethod === 'maritimo' 
                      ? 'bg-cyan-600 text-white border-cyan-600 ring-2 ring-offset-2 ring-cyan-600 scale-[1.02] shadow-md' 
                      : 'bg-cyan-600/10 text-cyan-600 border-cyan-600/30 hover:bg-cyan-600/20'
                  }`}
                >
                  <Ship className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span>Marítimo</span>
                    <span className="text-[9px] opacity-75 font-normal">Espera</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethod('terrestre')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    shippingMethod === 'terrestre' 
                      ? 'bg-orange-500 text-white border-orange-500 ring-2 ring-offset-2 ring-orange-500 scale-[1.02] shadow-md' 
                      : 'bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span>Terrestre</span>
                    <span className="text-[9px] opacity-75 font-normal">Local</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Order Destination */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Destino del Pedido <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderDestination('cliente')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    orderDestination === 'cliente' 
                      ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-offset-2 ring-blue-500 scale-[1.02] shadow-md' 
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDestination('stock')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    orderDestination === 'stock' 
                      ? 'bg-green-500 text-white border-green-500 ring-2 ring-offset-2 ring-green-500 scale-[1.02] shadow-md' 
                      : 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20'
                  }`}
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDestination('ambos')}
                  className={`h-12 rounded-xl font-semibold text-xs transition-all duration-200 border-2 flex items-center justify-center gap-1.5 ${
                    orderDestination === 'ambos' 
                      ? 'bg-purple-500 text-white border-purple-500 ring-2 ring-offset-2 ring-purple-500 scale-[1.02] shadow-md' 
                      : 'bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Ambos</span>
                </button>
              </div>
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