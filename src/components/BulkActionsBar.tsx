import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, RefreshCw, Loader2, X, Check } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onStatusChange: (status: string, orderNumber?: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  selectedOrdersNeedOrderNumber?: boolean; // true if any selected order doesn't have order_number
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'entregado', label: 'Entregado' },
];

const BulkActionsBar = ({ 
  selectedCount, 
  onStatusChange, 
  onDelete,
  onClearSelection,
  selectedOrdersNeedOrderNumber = true
}: BulkActionsBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');

  const handleStatusSelect = (status: string) => {
    if (status === 'pending') {
      // For pending, apply directly (no order number needed)
      handleStatusChange(status);
    } else if (status === 'solicitado' || status === 'entregado') {
      // For solicitado and entregado, check if we need order number
      if (selectedOrdersNeedOrderNumber) {
        setPendingStatus(status);
      } else {
        // All orders already have order_number, proceed directly
        handleStatusChange(status);
      }
    }
  };

  const handleStatusChange = async (status: string, number?: string) => {
    setIsUpdating(true);
    await onStatusChange(status, number);
    setIsUpdating(false);
    setPendingStatus(null);
    setOrderNumber('');
  };

  const handleConfirmStatus = async () => {
    if (!orderNumber.trim()) {
      return; // Don't allow empty order number
    }
    await handleStatusChange(pendingStatus!, orderNumber);
  };

  const handleCancelStatus = () => {
    setPendingStatus(null);
    setOrderNumber('');
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar ${selectedCount} pedido${selectedCount > 1 ? 's' : ''}?`)) {
      return;
    }
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
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
      </div>

      <div className="flex items-center gap-3">
        {/* Bulk Status Change */}
        {pendingStatus ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pendingStatus === 'solicitado' ? 'Solicitado' : 'Entregado'}:
            </span>
            <Input
              placeholder="Nro. Pedido (obligatorio)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-44 h-9"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmStatus}
              disabled={isUpdating || !orderNumber.trim()}
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
  );
};

export default BulkActionsBar;