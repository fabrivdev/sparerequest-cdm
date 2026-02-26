import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wrench, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewDesarmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranch?: string;
  onCreated: () => void;
}

const NewDesarmeModal = ({ isOpen, onClose, defaultBranch = '', onCreated }: NewDesarmeModalProps) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [branch, setBranch] = useState(defaultBranch);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string; color: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      const [pRes, bRes] = await Promise.all([
        supabase.from('providers').select('id, name, color').eq('is_active', true).order('name'),
        supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
      ]);
      if (pRes.data) setProviders(pRes.data);
      if (bRes.data) setBranches(bRes.data);
    };
    fetchData();
    if (defaultBranch) setBranch(defaultBranch);
  }, [isOpen, defaultBranch]);

  // Search product
  const searchProduct = useCallback(async (code: string, b: string) => {
    if (!code.trim() || !b) { setProductName(''); return; }
    setIsSearching(true);
    const { data } = await supabase.from('products').select('name').ilike('code', code.trim()).ilike('brand', b).maybeSingle();
    setProductName(data?.name || '');
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProduct(productCode, brand), 300);
    return () => clearTimeout(t);
  }, [productCode, brand, searchProduct]);

  const resetForm = () => {
    setBrand(''); setModel(''); setSerialNumber(''); setClientName('');
    setBranch(defaultBranch); setProductCode(''); setProductName('');
    setQuantity('1'); setReason(''); setIsUrgent(false);
    setError(null); setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brand || !model || !serialNumber || !clientName || !branch || !productCode || !reason) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('desarme-operations', {
        body: {
          action: 'createDesarme',
          brand, model, serial_number: serialNumber, client_name: clientName,
          branch, product_code: productCode, product_name: productName || null,
          quantity: parseInt(quantity) || 1, reason, is_urgent: isUrgent,
        },
      });

      if (fnError || data?.error) {
        setError(data?.error || 'Error al crear desarme');
        setIsLoading(false);
        return;
      }

      toast.success(`Desarme ${data.desarme?.desarme_number} creado`);
      resetForm();
      onCreated();
      onClose();
    } catch {
      setError('Error de conexión');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nuevo Desarme</DialogTitle>
              <DialogDescription className="text-xs">Registrar solicitud de desarme de máquina</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs">{error}</div>}

          {/* Brand */}
          <div className="space-y-1.5">
            <Label className="text-xs">Marca Máquina <span className="text-destructive">*</span></Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.name}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model + Serial */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo <span className="text-destructive">*</span></Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ej: Tucano 570" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nº Serie <span className="text-destructive">*</span></Label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Ej: C5700001" className="h-9 text-sm" />
            </div>
          </div>

          {/* Client + Branch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente <span className="text-destructive">*</span></Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sucursal <span className="text-destructive">*</span></Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sucursal" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Code + Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Código Repuesto <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="Código" className="h-9 text-sm pr-8" />
                {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                {productName && !isSearching && <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />}
              </div>
              {productName && <p className="text-[11px] text-green-600">{productName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cantidad <span className="text-destructive">*</span></Label>
              <Input type="text" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))} className="h-9 text-sm" />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo del Desarme <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describir motivo..." className="text-sm min-h-[60px]" />
          </div>

          {/* Urgent */}
          <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl">
            <div>
              <p className="text-sm font-medium">¿Máquina parada?</p>
              <p className="text-[11px] text-muted-foreground">Marcar si la máquina no puede operar</p>
            </div>
            <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>

          <Button type="submit" className="w-full h-10" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : 'Crear Desarme'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewDesarmeModal;
