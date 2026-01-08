import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Trash2, Loader2, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import OrderDetailModal from './OrderDetailModal';
import * as XLSX from 'xlsx';

export interface Order {
  id: string;
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
  user_id?: string;
  user_email?: string;
}

interface OrdersTableProps {
  orders: Order[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  updatingOrderId?: string | null;
  showExport?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
];

const OrdersTable = ({ 
  orders, 
  isAdmin = false, 
  onDelete, 
  onStatusChange, 
  updatingOrderId,
  showExport = false 
}: OrdersTableProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge 
        variant="outline"
        className={`${statusOption?.color || 'bg-muted text-muted-foreground'} font-medium text-xs`}
      >
        {statusOption?.label || status}
      </Badge>
    );
  };

  const getEmailUsername = (email?: string) => {
    if (!email) return '-';
    return email.split('@')[0];
  };

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const exportToExcel = () => {
    const exportData = orders.map((order) => ({
      'Fecha': format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
      ...(isAdmin && { 'Solicitante': getEmailUsername(order.user_email) }),
      'Marca': order.brand,
      'Código': order.product_code,
      'Cantidad': order.quantity,
      'Sucursal': order.branch_destination,
      'Estado': STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status,
      'Observación': order.observation || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    
    const colWidths = [
      { wch: 18 },
      ...(isAdmin ? [{ wch: 15 }] : []),
      { wch: 10 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 40 },
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `pedidos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (orders.length === 0) {
    return (
      <div className="bg-card ios-shadow rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">No hay pedidos que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card ios-shadow rounded-xl overflow-hidden">
        {/* Table Header with Export */}
        {showExport && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="h-8 gap-2">
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>
        )}

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleRowClick(order)}
              className="flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium text-foreground truncate">
                    {order.product_code}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {order.brand}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(order.created_at), "dd/MM/yy", { locale: es })}</span>
                  <span>•</span>
                  <span className="truncate">{order.branch_destination}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {getStatusBadge(order.status)}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground text-xs">Fecha</TableHead>
                {isAdmin && <TableHead className="font-semibold text-foreground text-xs">Solicitante</TableHead>}
                <TableHead className="font-semibold text-foreground text-xs">Marca</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Código</TableHead>
                <TableHead className="font-semibold text-foreground text-xs text-center">Cant.</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Sucursal</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Estado</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Observación</TableHead>
                {!isAdmin && <TableHead className="font-semibold text-foreground text-xs text-right pr-4">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => (
                <TableRow 
                  key={order.id} 
                  className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <TableCell className="text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: es })}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(order.created_at), "HH:mm", { locale: es })}
                      </span>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-xs font-medium text-foreground">
                      {getEmailUsername(order.user_email)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary" className="font-medium text-xs">
                      {order.brand}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{order.product_code}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-xs text-primary">{order.quantity}</span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">{order.branch_destination}</TableCell>
                  <TableCell>
                    {isAdmin && onStatusChange ? (
                      <Select
                        value={order.status}
                        onValueChange={(value) => onStatusChange(order.id, value)}
                        disabled={updatingOrderId === order.id}
                      >
                        <SelectTrigger className={`w-28 h-7 text-xs border ${STATUS_OPTIONS.find(s => s.value === order.status)?.color || 'bg-muted'}`}>
                          {updatingOrderId === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value} className={status.color}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(order.status)
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {order.observation || '-'}
                  </TableCell>
                  {!isAdmin && (
                    <TableCell className="text-right pr-4">
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(order.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Detail Modal for Mobile */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onDelete={onDelete}
        isAdmin={isAdmin}
      />
    </>
  );
};

export default OrdersTable;
