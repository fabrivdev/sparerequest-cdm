import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X } from 'lucide-react';
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
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-primary/10 text-primary border-primary/20' },
];

const OrderDetailModal = ({ order, isOpen, onClose, onDelete, isAdmin }: OrderDetailModalProps) => {
  if (!order) return null;

  const statusOption = STATUS_OPTIONS.find((s) => s.value === order.status);
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

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Cantidad</p>
              <p className="text-sm font-semibold text-primary">{order.quantity}</p>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Sucursal</p>
              <p className="text-sm font-medium text-foreground">{order.branch_destination}</p>
            </div>

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
