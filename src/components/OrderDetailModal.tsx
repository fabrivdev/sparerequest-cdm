import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Warehouse, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Order } from './OrdersTable';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'pte_envio', label: 'Pte. de envío', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
];

const DESTINATION_OPTIONS = [
  { value: 'cliente', label: 'Cliente', icon: User, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'stock', label: 'Stock', icon: Warehouse, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'ambos', label: 'Ambos', icon: Users, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
];

const OrderDetailModal = ({ order, isOpen, onClose, onDelete, isAdmin }: OrderDetailModalProps) => {
  if (!order) return null;

  const statusOption = STATUS_OPTIONS.find((s) => s.value === order.status);
  const destinationOption = DESTINATION_OPTIONS.find((d) => d.value === (order as any).order_destination);
  const DestIcon = destinationOption?.icon || User;
  const getEmailUsername = (email?: string) => {
    if (!email) return '-';
    return email.split('@')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 border-0 ios-shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Detalle del Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline"
              className={`${statusOption?.color || 'bg-muted text-muted-foreground'} font-medium text-sm px-4 py-1`}
            >
              {statusOption?.label || order.status}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Fecha</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Marca</p>
              <p className="text-sm font-medium text-foreground">{order.brand}</p>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Código</p>
              <p className="text-sm font-mono font-medium text-foreground">{order.product_code}</p>
            </div>

            {order.order_number && (
              <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Nro. Pedido</p>
                <p className="text-sm font-mono font-semibold text-primary">{order.order_number}</p>
              </div>
            )}

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Cantidad</p>
              <p className="text-sm font-semibold text-primary">{order.quantity}</p>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Sucursal</p>
              <p className="text-sm font-medium text-foreground">{order.branch_destination}</p>
            </div>

            {destinationOption && (
              <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Destino</p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={`${destinationOption.color} font-medium text-xs gap-1`}
                  >
                    <DestIcon className="w-3 h-3" />
                    {destinationOption.label}
                  </Badge>
                </div>
              </div>
            )}

            {isAdmin && order.user_email && (
              <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Solicitante</p>
                <p className="text-sm font-medium text-foreground">{getEmailUsername(order.user_email)}</p>
              </div>
            )}

            {order.observation && (
              <div className="bg-secondary/30 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Observación</p>
                <p className="text-sm text-foreground">{order.observation}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-11"
            >
              Cerrar
            </Button>
            {!isAdmin && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(order.id);
                  onClose();
                }}
                className="flex-1 h-11"
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;
