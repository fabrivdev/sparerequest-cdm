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
  XCircle,
  ArrowLeftRight,
  Search,
  Bell,
  MessageCircle,
  BarChart3,
  User
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
                Esta aplicación te permite gestionar solicitudes de repuestos y transferencias entre sucursales. 
                Navega entre las secciones <strong>Compras</strong> y <strong>Transferencias</strong> usando los botones en la barra superior.
              </p>
            </section>

            {/* ═══════ SECCIÓN COMPRAS ═══════ */}
            <div className="border-t border-border pt-4">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Sección: Compras
              </h2>
            </div>

            {/* Crear Pedido */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Crear Nuevo Pedido
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">1.</span>
                  Haz clic en <strong>"Nuevo Pedido"</strong> en la esquina superior derecha.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">2.</span>
                  Selecciona el <strong>proveedor/marca</strong>, ingresa el <strong>código</strong> y la <strong>cantidad</strong>.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">3.</span>
                  Elige la <strong>sucursal de destino</strong>, el <strong>destino</strong> (Cliente, Stock o Ambos) y opcionalmente una <strong>observación</strong>.
                </li>
              </ul>
            </section>

            {/* Estados */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Estados de los Pedidos
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10', name: 'Pendiente', desc: 'Esperando ser procesado.' },
                  { icon: Truck, color: 'text-yellow-500', bg: 'bg-yellow-500/10', name: 'Solicitado', desc: 'Solicitado al proveedor.' },
                  { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', name: 'Pte. Envío', desc: 'Llegó, pendiente de enviar a destino.' },
                  { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', name: 'Entregado', desc: 'Recibido en la sucursal de destino.' },
                  { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', name: 'Cancelado', desc: 'No se procesará.' },
                ].map(({ icon: Icon, color, bg, name, desc }) => (
                  <div key={name} className="flex items-center gap-3 p-2.5 bg-secondary/50 rounded-lg">
                    <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Vistas */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Vistas Disponibles
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>• <strong>Mis Pedidos:</strong> Tus pedidos personales.</li>
                <li>• <strong>Pedidos en mi Sucursal:</strong> Todos los pedidos destinados a tu sucursal, incluyendo los de otros usuarios.</li>
                <li>• <strong>Entregados:</strong> Pedidos entregados con datos de facturación. Si tenés pedidos pendientes de facturar, verás una alerta.</li>
              </ul>
            </section>

            {/* Filtros */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Filtrar Pedidos
              </h3>
              <p className="text-xs text-muted-foreground">
                Filtra por <strong>fecha</strong>, <strong>marca</strong>, <strong>código</strong>, <strong>sucursal</strong>, <strong>estado</strong> u <strong>observación</strong>.
              </p>
            </section>

            {/* Editar y eliminar */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                Editar o Eliminar
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs"><strong>Editar:</strong> Solo mientras el pedido esté en estado <strong>Pendiente</strong>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs"><strong>Eliminar:</strong> Solo si está <strong>Pendiente</strong> y pasaron menos de <strong>24 horas</strong>.</p>
                </div>
              </div>
            </section>

            {/* Facturación */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Facturación de Entregados
              </h3>
              <p className="text-xs text-muted-foreground">
                Cuando un pedido es entregado, se debe indicar si fue <strong>facturado</strong> (ingresando número de factura y cantidad) 
                o <strong>no facturado</strong> (seleccionando el motivo: Stock, Garantía, No corresponde, etc.). 
                El badge en "Entregados" muestra cuántos pedidos tenés pendientes de actualizar.
              </p>
            </section>

            {/* ═══════ SECCIÓN TRANSFERENCIAS ═══════ */}
            <div className="border-t border-border pt-4">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                Sección: Transferencias
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Permite solicitar repuestos entre sucursales. Accedé desde el botón <strong>"Transferencias"</strong> en la barra superior.
              </p>
            </div>

            <section>
              <div className="space-y-3">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    Consulta de Stock
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Buscá productos disponibles en otras sucursales. Si encontrás lo que necesitás, 
                    podés solicitar una transferencia directamente desde los resultados.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                    Mis Transferencias
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Acá ves las transferencias que solicitaste y las que te solicitaron. Podés 
                    <strong> aprobar, rechazar o despachar</strong> transferencias según corresponda.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    En Tránsito
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Repuestos que ya fueron despachados hacia tu sucursal. Cuando los recibas, 
                    confirmá la recepción indicando la cantidad recibida.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Cerradas
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Historial de transferencias completadas (recibidas) o rechazadas.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════ HERRAMIENTAS GENERALES ═══════ */}
            <div className="border-t border-border pt-4">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Herramientas Generales
              </h2>
            </div>

            <section>
              <div className="space-y-3">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-primary" />
                    Notificaciones
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    La campana en la barra superior te avisa en tiempo real cuando cambia el estado de un pedido, 
                    se entrega un repuesto o hay actividad en tus transferencias. Las notificaciones incluyen sonido.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    Soporte
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    El botón flotante de chat te permite comunicarte directamente con el administrador 
                    para consultas, reclamos o asistencia.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Perfil
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Editá tu nombre y sucursal desde el ícono de usuario en la barra superior.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════ ADMIN ═══════ */}
            <div className="border-t border-border pt-4">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Funciones de Administrador
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Accedé al panel con el ícono de escudo en la barra superior.
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Gestión de Estados
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Cambiar estados de pedidos, asignar números de pedido y realizar acciones masivas.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Catálogo de Productos
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Cargar y actualizar el catálogo de productos con precios (aéreo y marítimo).
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Proveedores y Sucursales
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Agregar, editar o eliminar proveedores (con colores) y sucursales desde Configuración.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Dashboard de Control
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Métricas en tiempo real: tiempos de gestión, productos más solicitados, 
                    distribución por sucursal/marca y ranking de usuarios.
                  </p>
                </div>

                <div className="p-3 bg-secondary/30 rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    Estadísticas de Uso
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Dentro de "Usuarios en línea", accedé a estadísticas de conexión: 
                    frecuencia, duración de sesiones, horarios pico y actividad por sucursal.
                  </p>
                </div>
              </div>
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
