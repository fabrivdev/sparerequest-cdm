import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, MapPin, Clock, Hash, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Order {
  id: string;
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
}

interface OrderCardProps {
  order: Order;
  onDelete: (id: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'entregado':
      return <Badge className="bg-primary/10 text-primary border-0 font-medium">Entregado</Badge>;
    case 'solicitado':
      return <Badge className="bg-blue-500/10 text-blue-600 border-0 font-medium">Solicitado</Badge>;
    default:
      return <Badge className="bg-warning/10 text-warning border-0 font-medium">Pendiente</Badge>;
  }
};

const OrderCard = ({ order, onDelete }: OrderCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="bg-card ios-shadow rounded-2xl p-4 sm:p-5 animate-fade-in transition-ios hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {order.brand}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Hash className="w-3 h-3" />
              <span className="truncate">{order.product_code}</span>
            </div>
          </div>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">Cantidad</p>
          <p className="font-semibold text-foreground">{order.quantity} unidades</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            <span>Destino</span>
          </div>
          <p className="font-medium text-foreground text-sm truncate">
            {order.branch_destination}
          </p>
        </div>
      </div>

      {/* Observation */}
      {order.observation && (
        <div className="bg-accent/50 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <FileText className="w-3 h-3" />
            <span>Observación</span>
          </div>
          <p className="text-sm text-foreground">{order.observation}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
          </div>
          <span className="text-muted-foreground/70">{timeAgo}</span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="ios-shadow border-0">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-0 bg-secondary">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(order.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default OrderCard;
