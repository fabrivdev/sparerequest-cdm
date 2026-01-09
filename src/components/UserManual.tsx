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
  Download, 
  Pencil, 
  Trash2, 
  Clock, 
  Truck, 
  CheckCircle,
  Users,
  Shield,
  FileSpreadsheet,
  Eye
} from 'lucide-react';

interface UserManualProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManual = ({ isOpen, onClose }: UserManualProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Manual de Usuario</DialogTitle>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
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
                  Selecciona la <strong>marca</strong> del repuesto (CLAAS o HORSCH).
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
                    <p className="text-xs text-muted-foreground">El pedido fue solicitado al proveedor y está en camino.</p>
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
                <li>• <strong>Marca:</strong> CLAAS o HORSCH</li>
                <li>• <strong>Código:</strong> Buscar por código de producto</li>
                <li>• <strong>Sucursal:</strong> Filtrar por destino</li>
                <li>• <strong>Estado:</strong> Pendiente, Solicitado o Entregado</li>
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
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-start gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground mt-0.5" />
                  Puedes <strong>editar</strong> un pedido mientras esté en estado <strong>Pendiente</strong>.
                </p>
                <p className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                  Puedes <strong>eliminar</strong> un pedido solo si está en estado <strong>Pendiente</strong> y 
                  han pasado menos de <strong>24 horas</strong> desde su creación.
                </p>
              </div>
            </section>

            {/* Exportar */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Exportar a Excel
              </h3>
              <p className="text-sm text-muted-foreground">
                Haz clic en el botón de <strong>descarga</strong> en la tabla de pedidos para exportar 
                todos los pedidos filtrados a un archivo Excel (.xlsx).
              </p>
            </section>

            {/* Separador Admin */}
            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Funciones de Administrador
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                El panel de administrador permite gestionar y monitorear todos los pedidos del sistema.
                Accede haciendo clic en el ícono de escudo en la barra superior.
              </p>
            </div>

            {/* Admin - Catálogo */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Catálogo de Productos
              </h3>
              <p className="text-sm text-muted-foreground">
                El administrador puede subir un archivo Excel con el catálogo de productos (marca, código, 
                nombre y precio). Esto permite mostrar precios y nombres de productos en los pedidos.
              </p>
            </section>

            {/* Admin - Cambiar estados */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Cambiar Estado de Pedidos
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  El administrador puede cambiar el estado de los pedidos de forma individual o masiva:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Pendiente → Solicitado:</strong> Cuando se hace el pedido al proveedor.</li>
                  <li>• <strong>Solicitado → Entregado:</strong> Cuando el repuesto llega a destino.</li>
                </ul>
                <p className="mt-2">
                  <strong>Nota:</strong> Para marcar como "Entregado", primero debe asignar un número de pedido.
                </p>
              </div>
            </section>

            {/* Admin - Dashboard */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Dashboard de Métricas
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                El administrador tiene acceso a un dashboard con estadísticas en tiempo real:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Tiempos promedio:</strong> De pendiente a solicitado, de solicitado a entregado.</li>
                <li>• <strong>Top SKUs:</strong> Los productos más solicitados.</li>
                <li>• <strong>Pedidos por sucursal:</strong> Distribución geográfica.</li>
                <li>• <strong>Distribución por marca:</strong> Porcentaje CLAAS vs HORSCH.</li>
                <li>• <strong>Valores totales:</strong> Suma de precios por estado.</li>
                <li>• <strong>Pedidos por usuario:</strong> Ranking de solicitantes.</li>
              </ul>
            </section>

            {/* Admin - Acciones masivas */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Acciones Masivas
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecciona múltiples pedidos usando las casillas de verificación para:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 mt-2">
                <li>• Cambiar el estado de varios pedidos a la vez.</li>
                <li>• Asignar el mismo número de pedido a un grupo.</li>
                <li>• Eliminar pedidos seleccionados.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManual;
