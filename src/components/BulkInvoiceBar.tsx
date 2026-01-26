import { useState } from 'react';
import { X, Check, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface BulkInvoiceBarProps {
  selectedCount: number;
  totalQuantity: number;
  onClear: () => void;
  onConfirm: (data: {
    invoiceChoice: 'yes' | 'no';
    invoiceNumber?: string;
    notInvoicedReason?: string;
  }) => Promise<void>;
}

const BulkInvoiceBar = ({ 
  selectedCount, 
  totalQuantity, 
  onClear, 
  onConfirm 
}: BulkInvoiceBarProps) => {
  const [invoiceChoice, setInvoiceChoice] = useState<'yes' | 'no' | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notInvoicedReason, setNotInvoicedReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (invoiceChoice === null) return;
    
    if (invoiceChoice === 'yes' && !invoiceNumber.trim()) return;
    if (invoiceChoice === 'no' && !notInvoicedReason.trim()) return;

    setIsLoading(true);
    try {
      await onConfirm({
        invoiceChoice,
        invoiceNumber: invoiceChoice === 'yes' ? invoiceNumber.trim() : undefined,
        notInvoicedReason: invoiceChoice === 'no' ? notInvoicedReason.trim() : undefined,
      });
      // Reset state after successful confirm
      setInvoiceChoice(null);
      setInvoiceNumber('');
      setNotInvoicedReason('');
    } finally {
      setIsLoading(false);
    }
  };

  const canConfirm = 
    invoiceChoice !== null &&
    ((invoiceChoice === 'yes' && invoiceNumber.trim()) ||
     (invoiceChoice === 'no' && notInvoicedReason.trim()));

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {selectedCount} pedido{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground text-sm">
                ({totalQuantity} unidades en total)
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Deseleccionar
            </Button>
          </div>

          {/* Invoice Choice */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2">
              <Label className="font-medium">¿Facturado?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={invoiceChoice === 'yes' ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1 ${invoiceChoice === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setInvoiceChoice('yes')}
                  disabled={isLoading}
                >
                  <Check className="w-3.5 h-3.5" />
                  Sí
                </Button>
                <Button
                  type="button"
                  variant={invoiceChoice === 'no' ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1 ${invoiceChoice === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setInvoiceChoice('no')}
                  disabled={isLoading}
                >
                  <X className="w-3.5 h-3.5" />
                  No
                </Button>
              </div>
            </div>

            {/* Invoice Number Field */}
            {invoiceChoice === 'yes' && (
              <div className="flex-1 space-y-2 min-w-[200px]">
                <Label htmlFor="bulk-invoice-number">
                  Nro. de Factura <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bulk-invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej: FAC-001234"
                  className="h-9"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Not Invoiced Reason Field */}
            {invoiceChoice === 'no' && (
              <div className="flex-1 space-y-2 min-w-[250px]">
                <Label htmlFor="bulk-not-invoiced-reason">
                  Motivo <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="bulk-not-invoiced-reason"
                  value={notInvoicedReason}
                  onChange={(e) => setNotInvoicedReason(e.target.value)}
                  placeholder="Ej: Cliente no requiere factura, muestra gratuita, etc."
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="ml-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Confirmar Facturación
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkInvoiceBar;
