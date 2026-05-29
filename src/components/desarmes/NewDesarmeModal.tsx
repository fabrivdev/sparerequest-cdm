import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wrench, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewDesarmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranch?: string;
  onCreated: () => void;
}

interface ItemRow {
  product_code: string;
  product_name: string;
  quantity: string;
  searching: boolean;
}

const emptyItem = (): ItemRow => ({ product_code: '', product_name: '', quantity: '1', searching: false });

const NewDesarmeModal = ({ isOpen, onClose, defaultBranch = '', onCreated }: NewDesarmeModalProps) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [branch, setBranch] = useState(defaultBranch);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ id: string; name: string; color: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

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

  const updateItem = (idx: number, patch: Partial<ItemRow>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const searchProduct = useCallback(async (idx: number, code: string, b: string) => {
    if (!code.trim() || !b) { updateItem(idx, { product_name: '', searching: false }); return; }
    updateItem(idx, { searching: true });
    const { data } = await supabase.from('products').select('name').ilike('code', code.trim()).ilike('brand', b).maybeSingle();
    updateItem(idx, { product_name: data?.name || '', searching: false });
  }, []);

  // Debounced search per item / brand change
  useEffect(() => {
    const timeouts = items.map((it, idx) =>
      setTimeout(() => searchProduct(idx, it.product_code, brand), 300)
    );
    return () => { timeouts.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.product_code).join('|'), brand]);

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setBrand(''); setModel(''); setSerialNumber(''); setClientName(''); setSalesperson('');
    setBranch(defaultBranch); setItems([emptyItem()]);
    setReason(''); setIsUrgent(false); setError(null); setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanItems = items
      .map(it => ({ product_code: it.product_code.trim(), product_name: it.product_name || null, quantity: parseInt(it.quantity) || 0 }))
      .filter(it => it.product_code);

    if (!brand || !model || !serialNumber || !clientName || !branch || !reason || cleanItems.length === 0) {
      setError('Completa todos los campos obligatorios y al menos un repuesto');
      return;
    }
    if (cleanItems.some(it => it.quantity <= 0)) {
      setError('La cantidad de cada repuesto debe ser mayor a 0');
      return;
    }
    const codes = cleanItems.map(it => it.product_code.toUpperCase());
    if (new Set(codes).size !== codes.length) {
      setError('Hay códigos repetidos. Eliminá duplicados antes de enviar.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('desarme-operations', {
        body: {
          action: 'createDesarme',
          brand, model, serial_number: serialNumber, client_name: clientName,
          branch, reason, is_urgent: isUrgent,
          salesperson: salesperson || null,
          items: cleanItems,
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente <span className="text-destructive">*</span></Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendedor</Label>
              <Input value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="Nombre del vendedor" className="h-9 text-sm" />
            </div>
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

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Repuestos <span className="text-destructive">*</span></Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Agregar repuesto
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_72px_32px] gap-2 items-start">
                  <div className="space-y-1">
                    <div className="relative">
                      <Input
                        value={it.product_code}
                        onChange={e => updateItem(idx, { product_code: e.target.value })}
                        placeholder="Código"
                        className="h-9 text-sm pr-8 font-mono"
                      />
                      {it.searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                      {it.product_name && !it.searching && <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />}
                    </div>
                    {it.product_name && <p className="text-[11px] text-green-600 leading-tight">{it.product_name}</p>}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={it.quantity}
                    onChange={e => updateItem(idx, { quantity: e.target.value.replace(/[^0-9]/g, '') })}
                    className="h-9 text-sm text-center"
                    placeholder="Cant."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            {!brand && <p className="text-[11px] text-muted-foreground">Seleccioná la marca para autocompletar nombres de repuesto.</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Motivo del Desarme <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describir motivo..." className="text-sm min-h-[60px]" />
          </div>

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
