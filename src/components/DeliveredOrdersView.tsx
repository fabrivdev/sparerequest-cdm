import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Receipt, Loader2, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from './OrdersTable';

interface DeliveredOrdersViewProps {
  orders: Order[];
  onUpdate: () => void;
}

interface InvoiceModalData {
  order: Order;
  isInvoiced: boolean;
  invoiceNumber: string;
  invoicedQuantity: string;
  invoiceObservation: string;
}

const DeliveredOrdersView = ({ orders, onUpdate }: DeliveredOrdersViewProps) => {
  const [modalData, setModalData] = useState<InvoiceModalData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter only delivered orders
  const deliveredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'entregado');
  }, [orders]);

  const openInvoiceModal = (order: Order) => {
    setModalData({
      order,
      isInvoiced: (order as any).is_invoiced || false,
      invoiceNumber: (order as any).invoice_number || '',
      invoicedQuantity: (order as any).invoiced_quantity?.toString() || order.quantity.toString(),
      invoiceObservation: (order as any).invoice_observation || '',
    });
  };

  const handleSaveInvoice = async () => {
    if (!modalData) return;

    if (modalData.isInvoiced && !modalData.invoiceNumber.trim()) {
      toast.error('Ingresa el número de factura');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          is_invoiced: modalData.isInvoiced,
          invoice_number: modalData.isInvoiced ? modalData.invoiceNumber.trim() : null,
          invoiced_quantity: modalData.isInvoiced ? parseInt(modalData.invoicedQuantity) || null : null,
          invoice_observation: modalData.isInvoiced ? modalData.invoiceObservation.trim() || null : null,
        })
        .eq('id', modalData.order.id);

      if (error) {
        toast.error('Error al guardar facturación');
        console.error(error);
      } else {
        toast.success('Facturación guardada');
        setModalData(null);
        onUpdate();
      }
    } catch (err) {
      toast.error('Error al guardar facturación');
    }

    setIsSaving(false);
  };

  if (deliveredOrders.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay pedidos entregados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Pedidos Entregados</CardTitle>
              <CardDescription>
                {deliveredOrders.length} pedido{deliveredOrders.length !== 1 ? 's' : ''} entregado{deliveredOrders.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground text-xs">Fecha Entrega</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Nro. Pedido</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Marca</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Código</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs text-center">Cant.</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Facturado</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Nro. Factura</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveredOrders.map((order, index) => {
                  const isInvoiced = (order as any).is_invoiced || false;
                  const invoiceNumber = (order as any).invoice_number || '';
                  
                  return (
                    <TableRow 
                      key={order.id}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                    >
                      <TableCell className="text-xs">
                        {order.delivered_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {format(new Date(order.delivered_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(order.delivered_at), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {order.order_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs font-semibold">
                          {order.brand}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.product_code}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-primary">
                        {order.quantity}
                      </TableCell>
                      <TableCell>
                        {isInvoiced ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <Check className="w-3 h-3 mr-1" />
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {invoiceNumber || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInvoiceModal(order)}
                          className="h-8 gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          Facturar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      <Dialog open={!!modalData} onOpenChange={() => setModalData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Datos de Facturación
            </DialogTitle>
            <DialogDescription>
              Pedido: {modalData?.order.brand} - {modalData?.order.product_code}
            </DialogDescription>
          </DialogHeader>

          {modalData && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="is-invoiced"
                  checked={modalData.isInvoiced}
                  onCheckedChange={(checked) =>
                    setModalData({ ...modalData, isInvoiced: !!checked })
                  }
                />
                <Label htmlFor="is-invoiced" className="font-medium">
                  ¿Facturado al cliente?
                </Label>
              </div>

              {modalData.isInvoiced && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-number">
                      Número de Factura <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invoice-number"
                      value={modalData.invoiceNumber}
                      onChange={(e) =>
                        setModalData({ ...modalData, invoiceNumber: e.target.value })
                      }
                      placeholder="Ej: FAC-001234"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiced-quantity">Cantidad Facturada</Label>
                    <Input
                      id="invoiced-quantity"
                      type="number"
                      value={modalData.invoicedQuantity}
                      onChange={(e) =>
                        setModalData({ ...modalData, invoicedQuantity: e.target.value })
                      }
                      placeholder={modalData.order.quantity.toString()}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cantidad original: {modalData.order.quantity}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoice-observation">Observación (opcional)</Label>
                    <Textarea
                      id="invoice-observation"
                      value={modalData.invoiceObservation}
                      onChange={(e) =>
                        setModalData({ ...modalData, invoiceObservation: e.target.value })
                      }
                      placeholder="Notas adicionales..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setModalData(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveInvoice} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveredOrdersView;
