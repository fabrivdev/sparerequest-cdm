import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, RefreshCw, Loader2, X, Check, AlertTriangle, Link, Plane, Ship, Truck, CalendarIcon } from 'lucide-react';
import { cn, formatLocalDate } from '@/lib/utils';

interface Order {
  id: string;
  status: string;
  order_number?: string | null;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onStatusChange: (status: string, orderNumber?: string, estimatedDeliveryDate?: string) => Promise<void>;
  onShippingMethodChange?: (shippingMethod: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  selectedOrdersNeedOrderNumber?: boolean;
  selectedOrdersNeedEstimatedDate?: boolean;
  orders?: Order[];
  selectedOrders?: string[];
  onSelectByOrderNumber?: (orderNumber: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'pte_envio', label: 'Pte. de envío' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const BulkActionsBar = ({ 
  selectedCount, 
  onStatusChange,
  onShippingMethodChange,
  onDelete,
  onClearSelection,
  selectedOrdersNeedOrderNumber = true,
  selectedOrdersNeedEstimatedDate = false,
  orders = [],
  selectedOrders = [],
  onSelectByOrderNumber
}: BulkActionsBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [estimatedDate, setEstimatedDate] = useState<Date | undefined>(undefined);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Find order numbers from selected orders
  const selectedOrderNumbers = orders
    .filter(o => selectedOrders.includes(o.id) && o.order_number)
    .map(o => o.order_number!)
    .filter((value, index, self) => self.indexOf(value) === index);

  // Check if any selected order has been processed (solicitado or entregado)
  const hasProcessedOrders = orders.some(
    o => selectedOrders.includes(o.id) && (o.status === 'solicitado' || o.status === 'entregado')
  );

  // Count how many orders have the same order_number
  const getOrderCountByNumber = (orderNum: string) => 
    orders.filter(o => o.order_number === orderNum).length;

  // Check if there are more orders with the same order_number that aren't selected
  const canSelectMore = selectedOrderNumbers.some(
    num => getOrderCountByNumber(num) > selectedOrders.filter(id => orders.find(o => o.id === id)?.order_number === num).length
  );

  const handleStatusSelect = (status: string) => {
    if (status === 'pending' || status === 'cancelado') {
      // For pending and cancelado, apply directly (no order number needed)
      handleStatusChange(status);
    } else if (status === 'solicitado' || status === 'pte_envio' || status === 'entregado') {
      // For solicitado, pte_envio and entregado, check if we need order number OR estimated date
      if (selectedOrdersNeedOrderNumber || selectedOrdersNeedEstimatedDate) {
        setPendingStatus(status);
      } else {
        // All orders already have order_number and estimated_delivery_date, proceed directly
        handleStatusChange(status);
      }
    }
  };

  const handleStatusChange = async (status: string, number?: string, estDate?: string) => {
    setIsUpdating(true);
    await onStatusChange(status, number, estDate);
    setIsUpdating(false);
    setPendingStatus(null);
    setOrderNumber('');
    setEstimatedDate(undefined);
  };

  const handleConfirmStatus = async () => {
    if (!orderNumber.trim()) {
      return; // Don't allow empty order number
    }
    if (!estimatedDate) {
      return; // Don't allow empty estimated date
    }
    const estDateStr = formatLocalDate(estimatedDate);
    await handleStatusChange(pendingStatus!, orderNumber, estDateStr);
  };

  const handleCancelStatus = () => {
    setPendingStatus(null);
    setOrderNumber('');
    setEstimatedDate(undefined);
  };

  const handleShippingMethodChange = async (method: string) => {
    if (!onShippingMethodChange) return;
    setIsUpdatingShipping(true);
    await onShippingMethodChange(method);
    setIsUpdatingShipping(false);
  };

  const handleDelete = async () => {
    if (hasProcessedOrders) {
      setShowDeleteWarning(true);
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar ${selectedCount} pedido${selectedCount > 1 ? 's' : ''}?`)) {
      return;
    }
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  const handleConfirmDeleteProcessed = async () => {
    setShowDeleteWarning(false);
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} pedido{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Deseleccionar
          </Button>
          
          {/* Suggestion to select all orders with same order_number */}
          {canSelectMore && selectedOrderNumbers.length > 0 && onSelectByOrderNumber && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
              <Link className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-700 dark:text-blue-400">
                Hay más pedidos con el mismo Nro.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedOrderNumbers.forEach(num => onSelectByOrderNumber(num))}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/20"
              >
                Seleccionar todos
              </Button>
            </div>
          )}
        </div>

      <div className="flex items-center gap-3">
        {/* Bulk Status Change */}
        {pendingStatus ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {pendingStatus === 'solicitado' ? 'Solicitado' : pendingStatus === 'pte_envio' ? 'Pte. de envío' : 'Entregado'}:
            </span>
            <Input
              placeholder="Nro. Pedido (obligatorio)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-44 h-9"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 w-40 justify-start text-left font-normal",
                    !estimatedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {estimatedDate ? format(estimatedDate, "dd/MM/yyyy", { locale: es }) : "F. Estimada *"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={estimatedDate}
                  onSelect={setEstimatedDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmStatus}
              disabled={isUpdating || !orderNumber.trim() || !estimatedDate}
              className="h-9 gap-1"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelStatus}
              disabled={isUpdating}
              className="h-9"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <Select onValueChange={handleStatusSelect} disabled={isUpdating}>
              <SelectTrigger className="w-36 h-9">
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SelectValue placeholder="Cambiar estado" />
                )}
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Shipping Method Change */}
        {onShippingMethodChange && (
          <div className="flex items-center gap-1 border-l border-border pl-3">
            <span className="text-xs text-muted-foreground mr-1">Envío:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShippingMethodChange('aereo')}
              disabled={isUpdatingShipping}
              className="h-9 px-2 gap-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            >
              {isUpdatingShipping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plane className="w-4 h-4" />
              )}
              Aéreo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShippingMethodChange('maritimo')}
              disabled={isUpdatingShipping}
              className="h-9 px-2 gap-1 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-500/10"
            >
              {isUpdatingShipping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
              <Ship className="w-4 h-4" />
            )}
            Marítimo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShippingMethodChange('terrestre')}
            disabled={isUpdatingShipping}
            className="h-9 px-2 gap-1 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
          >
            {isUpdatingShipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            Terrestre
          </Button>
        </div>
        )}

        {/* Bulk Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-9 gap-2"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Eliminar
        </Button>
      </div>
    </div>

    {/* Delete Warning Dialog for processed orders */}
    <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Advertencia: Pedidos con movimientos
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Algunos de los pedidos seleccionados ya tienen cambios de estado 
              (<strong>Solicitado</strong> o <strong>Entregado</strong>).
            </p>
            <p className="text-destructive font-medium">
              Esta acción es irreversible y se perderán todos los datos asociados 
              incluyendo fechas de solicitud y entrega.
            </p>
            <p>¿Estás seguro de que deseas continuar?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDeleteProcessed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sí, eliminar definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

export default BulkActionsBar;