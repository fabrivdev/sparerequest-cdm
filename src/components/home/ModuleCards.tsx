import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeftRight, Wrench, Plus, Filter, Pencil, Clock, Truck, CheckCircle, FileText, Search, Shield, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface ModuleDetail {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  details: ModuleDetail[];
}

const ModuleCards = () => {
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const modules: Module[] = [
    {
      id: 'compras',
      title: 'Compras',
      description: 'Gestiona solicitudes de repuestos, seguimiento de pedidos y facturación',
      icon: Package,
      path: '/dashboard',
      details: [
        { icon: Plus, title: 'Crear Nuevo Pedido', desc: 'Selecciona proveedor/marca, ingresa código, cantidad, sucursal de destino y observación.' },
        { icon: Clock, title: 'Estados de Pedidos', desc: 'Pendiente → Solicitado → Pte. Envío → Entregado. También puede ser Cancelado.' },
        { icon: Filter, title: 'Filtrar Pedidos', desc: 'Filtra por fecha, marca, código, sucursal, estado u observación.' },
        { icon: Pencil, title: 'Editar o Eliminar', desc: 'Editar solo en estado Pendiente. Eliminar si está Pendiente y pasaron menos de 24h.' },
        { icon: FileText, title: 'Facturación', desc: 'Al entregar, indica si fue facturado (nro. factura) o no facturado (motivo).' },
      ],
    },
    {
      id: 'transferencias',
      title: 'Transferencias',
      description: 'Consulta stock entre sucursales y solicita transferencias',
      icon: ArrowLeftRight,
      path: '/transfers',
      details: [
        { icon: Search, title: 'Consulta de Stock', desc: 'Busca productos disponibles en otras sucursales y solicita transferencia directamente.' },
        { icon: ArrowLeftRight, title: 'Mis Transferencias', desc: 'Ve las transferencias que solicitaste y las que te solicitaron. Aprueba, rechaza o despacha.' },
        { icon: Truck, title: 'En Tránsito', desc: 'Repuestos despachados hacia tu sucursal. Confirma recepción indicando cantidad recibida.' },
        { icon: CheckCircle, title: 'Cerradas', desc: 'Historial de transferencias completadas o rechazadas.' },
      ],
    },
    ...(hasPermission('ver_desarmes') ? [{
      id: 'desarmes',
      title: 'Desarmes',
      description: 'Solicita desarmes, cotiza y autoriza repuestos',
      icon: Wrench,
      path: '/desarmes',
      details: [
        { icon: Plus, title: 'Nuevo Desarme', desc: 'Crea solicitud con datos del equipo, repuesto necesario y motivo.' },
        { icon: FileText, title: 'Cotización', desc: 'El cotizador asigna valor, plazo de entrega y método de envío al desarme.' },
        { icon: Shield, title: 'Autorización', desc: 'El autorizante aprueba o rechaza la cotización para generar el pedido.' },
        { icon: Truck, title: 'Seguimiento', desc: 'El pedido vinculado se actualiza automáticamente al entregar el repuesto.' },
      ],
    }] : []),
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {modules.map((mod) => (
          <Card
            key={mod.id}
            className={cn(
              'h-full flex flex-col transition-all duration-300 border cursor-default',
              'hover:shadow-lg hover:-translate-y-1 hover:border-primary/30'
            )}
          >
            <CardContent className="p-6 flex flex-col flex-1 items-center text-center gap-4 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <mod.icon className="w-7 h-7 text-primary transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 animate-[pulse_3s_ease-in-out_infinite]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-foreground">{mod.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
              </div>
              <div className="flex gap-2 mt-auto pt-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedModule(mod)}
                >
                  <Info className="w-3.5 h-3.5 mr-1.5" />
                  Ver más
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(mod.path)}
                >
                  Ir al módulo
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
        <DialogContent className="max-w-md">
          {selectedModule && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                    <selectedModule.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle>{selectedModule.title}</DialogTitle>
                    <DialogDescription className="text-xs">{selectedModule.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {selectedModule.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <detail.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{detail.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{detail.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-2" onClick={() => { setSelectedModule(null); navigate(selectedModule.path); }}>
                Ir a {selectedModule.title}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ModuleCards;
