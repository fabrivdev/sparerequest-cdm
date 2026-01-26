import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Package, 
  Plus, 
  Filter, 
  Pencil, 
  Trash2, 
  Clock, 
  Truck, 
  CheckCircle,
  Users,
  Shield,
  Check,
  FileText,
  Building2,
  MapPin,
  XCircle
} from 'lucide-react';

interface UserManualProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManual = ({ isOpen, onClose }: UserManualProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isClosing && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg sm:text-xl">Manual de Usuario</DialogTitle>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[50vh] sm:h-[55vh] px-4 sm:px-6 py-4">
          <div className="space-y-6">
            {/* Introducción */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Bienvenido
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta aplicación te permite gestionar solicitudes de repuestos de manera simple y eficiente. 
                Puedes crear pedidos, ver su estado y hacer seguimiento hasta su entrega.
              </p>
            </section>

            {/* Crear Pedido */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Crear Nuevo Pedido
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  Haz clic en el botón <strong>"Nuevo Pedido"</strong> en la esquina superior derecha.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  Selecciona el <strong>proveedor/marca</strong> del repuesto.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  Ingresa el <strong>código del producto</strong> exactamente como aparece en el catálogo.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  Indica la <strong>cantidad</strong> requerida.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">5.</span>
                  Selecciona la <strong>sucursal de destino</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">6.</span>
                  Indica el <strong>destino del pedido</strong> (Cliente, Stock o Ambos).
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">7.</span>
                  Opcionalmente, agrega una <strong>observación</strong>.
                </li>
              </ul>
            </section>

            {/* Estados */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Estados de los Pedidos
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pendiente</p>
                    <p className="text-xs text-muted-foreground">El pedido fue creado y está esperando ser procesado.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <Truck className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Solicitado</p>
                    <p className="text-xs text-muted-foreground">El pedido fue solicitado al proveedor.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pte. Envío</p>
                    <p className="text-xs text-muted-foreground">El pedido llegó y está pendiente de enviar a destino.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Entregado</p>
                    <p className="text-xs text-muted-foreground">El pedido fue recibido en la sucursal de destino.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-500/10 rounded-lg flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Cancelado</p>
                    <p className="text-xs text-muted-foreground">El pedido fue cancelado y no se procesará.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Filtros */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Filtrar Pedidos
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Puedes filtrar tus pedidos por:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Fecha:</strong> Rango de fechas de creación</li>
                <li>• <strong>Marca:</strong> Proveedor del repuesto</li>
                <li>• <strong>Código:</strong> Buscar por código de producto</li>
                <li>• <strong>Sucursal:</strong> Filtrar por destino</li>
                <li>• <strong>Estado:</strong> Pendiente, Solicitado, Pte. Envío, Entregado o Cancelado</li>
              </ul>
            </section>

            {/* Ver pedidos de sucursal */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Ver Pedidos de mi Sucursal
              </h3>
              <p className="text-sm text-muted-foreground">
                Cambia la vista a <strong>"Pedidos en mi sucursal"</strong> para ver todos los pedidos 
                destinados a tu sucursal, incluyendo los de otros usuarios. Esto te permite coordinar 
                con tu equipo y tener visibilidad completa de los repuestos en camino.
              </p>
            </section>

            {/* Editar y eliminar */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar o Eliminar Pedidos
              </h3>
              <div className="text-sm text-muted-foreground space-y-3">
                <div className="flex items-start gap-3">
                  <Pencil className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p>Puedes <strong>editar</strong> un pedido mientras esté en estado <strong>Pendiente</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p>Puedes <strong>eliminar</strong> un pedido solo si está en estado <strong>Pendiente</strong> y han pasado menos de <strong>24 horas</strong> desde su creación.</p>
                </div>
              </div>
            </section>

            {/* Separador Admin */}
            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Funciones de Administrador
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                El administrador gestiona el flujo completo de los pedidos y la configuración del sistema.
              </p>
              
              <div className="space-y-4">
                {/* Gestión de estados */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Gestión de Estados
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Cambiar estados de pedidos (Pendiente → Solicitado → Pte. Envío → Entregado), 
                    asignar números de pedido y realizar acciones masivas sobre múltiples pedidos.
                  </p>
                </div>

                {/* Facturación */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Proceso de Facturación
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Al entregar un pedido, se indica si fue facturado (Sí/No). Si fue facturado, 
                    se ingresa el número de factura y cantidad. Si no fue facturado, se selecciona 
                    el motivo (Stock, Garantía, No corresponde, etc.).
                  </p>
                </div>

                {/* Catálogo */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Catálogo de Productos
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Cargar y actualizar el catálogo de productos con precios (aéreo y marítimo).
                  </p>
                </div>

                {/* Configuración */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Proveedores y Sucursales
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    En la sección de <strong>Configuración</strong>, el administrador puede agregar, 
                    editar o eliminar <strong>proveedores/marcas</strong> (con colores personalizados) 
                    y <strong>sucursales</strong>. Las sucursales inactivas no aparecerán en los formularios.
                  </p>
                </div>

                {/* Dashboard */}
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Dashboard de Control
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Panel con métricas en tiempo real: tiempos de gestión, productos más solicitados, 
                    distribución por sucursal y marca, valores totales y ranking de usuarios.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70 mt-4">
                Accede al panel de administrador haciendo clic en el ícono de escudo en la barra superior.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-border relative overflow-hidden">
          {isClosing ? (
            <div className="flex items-center justify-center py-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                  <Check className="w-6 h-6 text-white animate-fade-in" strokeWidth={3} />
                </div>
                <div className="absolute inset-0 w-12 h-12 rounded-full bg-green-500/30 animate-ping" />
              </div>
            </div>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Entendido
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManual;
