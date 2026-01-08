import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Trash2, Loader2, FileText, Download } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-primary/10 text-primary border-primary/20' },
];

const OrdersTable = ({ 
  orders, 
  isAdmin = false, 
  onDelete, 
  onStatusChange, 
  updatingOrderId,
  showExport = false 
}: OrdersTableProps) => {
  
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

  const exportToExcel = () => {
    const exportData = orders.map((order) => ({
      'Fecha': format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
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
    
    // Auto-size columns
    const colWidths = [
      { wch: 18 }, // Fecha
      { wch: 10 }, // Marca
      { wch: 20 }, // Código
      { wch: 10 }, // Cantidad
      { wch: 20 }, // Sucursal
      { wch: 12 }, // Estado
      { wch: 40 }, // Observación
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `pedidos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (orders.length === 0) {
    return (
      <div className="bg-card ios-shadow rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay pedidos que coincidan con los filtros</p>
      </div>
    );
  }

  return (
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

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-foreground min-w-[140px]">Fecha</TableHead>
              <TableHead className="font-semibold text-foreground">Marca</TableHead>
              <TableHead className="font-semibold text-foreground min-w-[150px]">Código</TableHead>
              <TableHead className="font-semibold text-foreground text-center">Cant.</TableHead>
              <TableHead className="font-semibold text-foreground min-w-[120px]">Sucursal</TableHead>
              <TableHead className="font-semibold text-foreground min-w-[110px]">Estado</TableHead>
              <TableHead className="font-semibold text-foreground">Obs.</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => (
              <TableRow 
                key={order.id} 
                className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
              >
                <TableCell className="text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: es })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "HH:mm", { locale: es })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-medium">
                    {order.brand}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{order.product_code}</TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-primary">{order.quantity}</span>
                </TableCell>
                <TableCell className="text-sm">{order.branch_destination}</TableCell>
                <TableCell>
                  {isAdmin && onStatusChange ? (
                    <Select
                      value={order.status}
                      onValueChange={(value) => onStatusChange(order.id, value)}
                      disabled={updatingOrderId === order.id}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs bg-secondary/50 border-0">
                        {updatingOrderId === order.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <SelectValue />
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
                  ) : (
                    getStatusBadge(order.status)
                  )}
                </TableCell>
                <TableCell>
                  {order.observation ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <FileText className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-sm">{order.observation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!isAdmin && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(order.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersTable;
