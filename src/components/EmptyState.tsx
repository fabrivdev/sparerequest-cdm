import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onNewOrder: () => void;
}

const EmptyState = ({ onNewOrder }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
        <Package className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No hay pedidos
      </h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Aún no has registrado ningún pedido de repuestos. Crea tu primer pedido para comenzar.
      </p>
      <Button onClick={onNewOrder} className="gap-2">
        <Plus className="w-4 h-4" />
        Crear Primer Pedido
      </Button>
    </div>
  );
};

export default EmptyState;
