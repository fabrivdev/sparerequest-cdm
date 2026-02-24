import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Package, Search, TruckIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ANNOUNCEMENT_KEY = 'transfers_announcement_seen';

interface TransferAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferAnnouncementModal = ({ isOpen, onClose }: TransferAnnouncementModalProps) => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
    onClose();
  };

  const handleGoToTransfers = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
    onClose();
    navigate('/transfers');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">¡Nueva sección disponible!</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Ahora podés gestionar <strong className="text-foreground">transferencias de repuestos</strong> entre sucursales directamente desde la app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Search className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Consultá stock de otras sucursales</p>
              <p className="text-xs text-muted-foreground">Buscá disponibilidad de productos en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Solicitá transferencias</p>
              <p className="text-xs text-muted-foreground">Pedí repuestos a otra sucursal y seguí el estado en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <TruckIcon className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gestioná envíos y recepciones</p>
              <p className="text-xs text-muted-foreground">Aprobá, despachá y confirmá la recepción de transferencias.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Ahora no
          </Button>
          <Button onClick={handleGoToTransfers} className="flex-1">
            Ir a Transferencias
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { ANNOUNCEMENT_KEY };
export default TransferAnnouncementModal;
