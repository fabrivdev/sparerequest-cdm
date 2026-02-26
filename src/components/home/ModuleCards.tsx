import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeftRight, Wrench, ChevronDown, Plus, Filter, Pencil, Trash2, Clock, Truck, CheckCircle, XCircle, FileText, Search, Bell, MessageCircle, User, Shield, BarChart3, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const ModuleCards = () => {
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const [openModule, setOpenModule] = useState<string | null>(null);

  const modules = [
    {
      id: 'compras',
      title: 'Compras',
      description: 'Gestiona solicitudes de repuestos, seguimiento de pedidos y facturación',
      icon: Package,
      path: '/',
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
        { icon: Shield, title: 'Autorización', desc: 'El autorizador aprueba o rechaza la cotización para generar el pedido.' },
        { icon: Truck, title: 'Seguimiento', desc: 'El pedido vinculado se actualiza automáticamente al entregar el repuesto.' },
      ],
    }] : []),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modules.map((mod) => {
        const isOpen = openModule === mod.id;
        return (
          <Collapsible
            key={mod.id}
            open={isOpen}
            onOpenChange={(open) => setOpenModule(open ? mod.id : null)}
            className="col-span-1 md:col-span-1"
          >
            <Card className={cn(
              'transition-all duration-200 border',
              isOpen ? 'ring-1 ring-primary/30 border-primary/20' : 'hover:border-primary/20'
            )}>
              <CollapsibleTrigger asChild>
                <CardContent className="p-5 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <mod.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{mod.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                    </div>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1',
                      isOpen && 'rotate-180'
                    )} />
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-2.5 border-t border-border pt-3">
                  {mod.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-secondary/30 rounded-lg">
                      <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <detail.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{detail.title}</p>
                        <p className="text-xs text-muted-foreground">{detail.desc}</p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => { e.stopPropagation(); navigate(mod.path); }}
                  >
                    Ir a {mod.title}
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default ModuleCards;
