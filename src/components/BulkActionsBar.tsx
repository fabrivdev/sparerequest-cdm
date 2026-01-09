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
  onClearSelection 
}: BulkActionsBarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');

  const handleStatusSelect = (status: string) => {
    if (status === 'solicitado') {
      // Show order number input for solicitado
      setPendingStatus(status);
    } else {
      // For other statuses, apply directly
      handleStatusChange(status);
    }
  };

  const handleStatusChange = async (status: string, number?: string) => {
    setIsUpdating(true);
    await onStatusChange(status, number);
    setIsUpdating(false);
    setPendingStatus(null);
    setOrderNumber('');
  };

  const handleConfirmSolicitado = async () => {
    await handleStatusChange('solicitado', orderNumber || undefined);
  };

  const handleCancelSolicitado = () => {
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
        {pendingStatus === 'solicitado' ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nro. Pedido (opcional)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-40 h-9"
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmSolicitado}
              disabled={isUpdating}
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
              onClick={handleCancelSolicitado}
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