import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'my-orders' | 'branch-orders';
  onViewChange: (view: 'my-orders' | 'branch-orders') => void;
}

const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="inline-flex bg-secondary/50 rounded-lg p-1">
      <button
        onClick={() => onViewChange('my-orders')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          view === 'my-orders'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Mis Pedidos
      </button>
      <button
        onClick={() => onViewChange('branch-orders')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          view === 'branch-orders'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Pedidos en Sucursal
      </button>
    </div>
  );
};

export default ViewToggle;
