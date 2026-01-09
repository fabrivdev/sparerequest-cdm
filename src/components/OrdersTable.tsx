import { useState } from 'react';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Trash2, Loader2, Download, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import OrderDetailModal from './OrderDetailModal';
import OrderEditModal from './OrderEditModal';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: string;
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  order_number?: string | null;
  requested_at?: string | null;
  delivered_at?: string | null;
}

interface Product {
  code: string;
  name: string;
  price: number;
}

interface OrdersTableProps {
  orders: Order[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (orderId: string, data: {
    brand: string;
    product_code: string;
    quantity: number;
    branch_destination: string;
    observation: string | null;
  }) => Promise<void>;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onOrderNumberChange?: (orderId: string, orderNumber: string) => void;
  onBulkStatusChange?: (orderIds: string[], newStatus: string) => Promise<void>;
  onBulkDelete?: (orderIds: string[]) => Promise<void>;
  updatingOrderId?: string | null;
  showExport?: boolean;
  showUserColumn?: boolean;
  selectable?: boolean;
  selectedOrders?: string[];
  onSelectionChange?: (selected: string[]) => void;
  currentUserId?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
];

// Brand colors
const BRAND_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  'CLAAS': { bg: 'bg-[#B4C618]', text: 'text-black', hex: '#B4C618' },
  'HORSCH': { bg: 'bg-[#A01B1B]', text: 'text-white', hex: '#A01B1B' },
};

const getBrandBadge = (brand: string) => {
  const brandColor = BRAND_COLORS[brand] || { bg: 'bg-muted', text: 'text-foreground' };
  return (
    <Badge 
      className={`${brandColor.bg} ${brandColor.text} font-semibold text-xs border-0 hover:opacity-90`}
    >
      {brand}
    </Badge>
  );
};

// Check if order can be edited/deleted (within 24h, still pending, and owned by current user)
const canModifyOrder = (order: Order, currentUserId?: string): boolean => {
  // Must be the owner of the order
  if (currentUserId && order.user_id !== currentUserId) {
    return false;
  }
  const hoursSinceCreation = differenceInHours(new Date(), new Date(order.created_at));
  return hoursSinceCreation <= 24 && order.status === 'pending';
};

// Get reason why order cannot be modified
const getModifyBlockReason = (order: Order, currentUserId?: string): string => {
  if (currentUserId && order.user_id !== currentUserId) {
    return 'Solo puedes modificar tus propios pedidos';
  }
  if (order.status !== 'pending') {
    return 'No se puede modificar: el estado cambió';
  }
  return 'No se puede modificar: pasaron más de 24h';
};

const OrdersTable = ({ 
  orders, 
  isAdmin = false, 
  onDelete,
  onUpdate,
  onStatusChange,
  onOrderNumberChange,
  onBulkStatusChange,
  onBulkDelete,
  updatingOrderId,
  showExport = false,
  showUserColumn = false,
  selectable = false,
  selectedOrders = [],
  onSelectionChange,
  currentUserId,
}: OrdersTableProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrderNumber, setEditingOrderNumber] = useState<string | null>(null);
  const [orderNumberValue, setOrderNumberValue] = useState('');

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

  const getUserDisplay = (order: Order) => {
    if (order.user_name) return order.user_name;
    if (order.user_email) return order.user_email.split('@')[0];
    return '-';
  };

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrder(order);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    onDelete?.(orderId);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(orders.map(o => o.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedOrders, orderId]);
    } else {
      onSelectionChange?.(selectedOrders.filter(id => id !== orderId));
    }
  };

  const exportToExcel = async () => {
    // Fetch product catalog for enriching export
    const productCodes = [...new Set(orders.map(o => o.product_code))];
    const { data: products } = await supabase
      .from('products')
      .select('code, name, price')
      .in('code', productCodes);
    
    // Create a map for quick lookup (case-insensitive)
    const productMap = new Map<string, Product>();
    products?.forEach(p => {
      productMap.set(p.code.toLowerCase(), p);
    });

    const exportData = orders.map((order) => {
      const product = productMap.get(order.product_code.toLowerCase());
      return {
        'Fecha': format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
        ...((isAdmin || showUserColumn) && { 'Solicitante': getUserDisplay(order) }),
        'Marca': order.brand,
        'Código': order.product_code,
        'Nombre': product?.name || '',
        'Cantidad': order.quantity,
        'Precio Unitario': product?.price || '',
        'Precio Total': product?.price ? product.price * order.quantity : '',
        'Sucursal': order.branch_destination,
        'Estado': STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status,
        ...(isAdmin && { 'Nro. Pedido': order.order_number || '' }),
        ...(isAdmin && { 'F. Solicitud': order.requested_at ? format(new Date(order.requested_at), "dd/MM/yyyy HH:mm", { locale: es }) : '' }),
        ...(isAdmin && { 'F. Entrega': order.delivered_at ? format(new Date(order.delivered_at), "dd/MM/yyyy HH:mm", { locale: es }) : '' }),
        'Observación': order.observation || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    
    const colWidths = [
      { wch: 18 },
      ...((isAdmin || showUserColumn) ? [{ wch: 15 }] : []),
      { wch: 10 },
      { wch: 20 },
      { wch: 25 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 12 },
      ...(isAdmin ? [{ wch: 15 }, { wch: 18 }, { wch: 18 }] : []),
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

  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  return (
    <>
      <div className="bg-card ios-shadow rounded-xl overflow-hidden">
        {/* Table Header with Export */}
        {showExport && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {selectedOrders.length > 0 
                ? `${selectedOrders.length} seleccionado${selectedOrders.length > 1 ? 's' : ''}`
                : `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}`
              }
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
              {selectable && (
                <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium text-foreground truncate">
                    {order.product_code}
                  </span>
                  {getBrandBadge(order.brand)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {showUserColumn && <span className="truncate">{getUserDisplay(order)}</span>}
                  {showUserColumn && <span>•</span>}
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
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-foreground text-xs">Fecha</TableHead>
                {(isAdmin || showUserColumn) && <TableHead className="font-semibold text-foreground text-xs">Solicitante</TableHead>}
                <TableHead className="font-semibold text-foreground text-xs">Marca</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Código</TableHead>
                <TableHead className="font-semibold text-foreground text-xs text-center">Cant.</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Sucursal</TableHead>
                <TableHead className="font-semibold text-foreground text-xs">Estado</TableHead>
                {!isAdmin && <TableHead className="font-semibold text-foreground text-xs">Actualización</TableHead>}
                {isAdmin && <TableHead className="font-semibold text-foreground text-xs">Nro. Pedido</TableHead>}
                {isAdmin && <TableHead className="font-semibold text-foreground text-xs">F. Solicitud</TableHead>}
                {isAdmin && <TableHead className="font-semibold text-foreground text-xs">F. Entrega</TableHead>}
                <TableHead className="font-semibold text-foreground text-xs">Observación</TableHead>
                {!isAdmin && <TableHead className="font-semibold text-foreground text-xs text-right pr-4">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => {
                const canModify = canModifyOrder(order, currentUserId);
                const blockReason = !canModify ? getModifyBlockReason(order, currentUserId) : '';
                return (
                  <TableRow 
                    key={order.id} 
                    className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                        />
                      </TableCell>
                    )}
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
                    {(isAdmin || showUserColumn) && (
                      <TableCell className="text-xs font-medium text-foreground">
                        {getUserDisplay(order)}
                      </TableCell>
                    )}
                    <TableCell>
                      {getBrandBadge(order.brand)}
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
                    {/* User view: Update date column */}
                    {!isAdmin && (
                      <TableCell className="text-xs">
                        {order.updated_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {format(new Date(order.updated_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(order.updated_at), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {/* Admin view: Order number editable field */}
                    {isAdmin && (
                      <TableCell className="text-xs">
                        {editingOrderNumber === order.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={orderNumberValue}
                              onChange={(e) => setOrderNumberValue(e.target.value)}
                              className="h-7 w-24 text-xs"
                              placeholder="Nro..."
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                onOrderNumberChange?.(order.id, orderNumberValue);
                                setEditingOrderNumber(null);
                              }}
                            >
                              <Check className="w-3 h-3 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingOrderNumber(null)}
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary font-mono"
                            onClick={() => {
                              setEditingOrderNumber(order.id);
                              setOrderNumberValue(order.order_number || '');
                            }}
                          >
                            {order.order_number || <span className="text-muted-foreground italic">Agregar...</span>}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {/* Admin view: Requested at date */}
                    {isAdmin && (
                      <TableCell className="text-xs">
                        {order.requested_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {format(new Date(order.requested_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(order.requested_at), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {/* Admin view: Delivered at date */}
                    {isAdmin && (
                      <TableCell className="text-xs">
                        {order.delivered_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {format(new Date(order.delivered_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(order.delivered_at), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {order.observation || '-'}
                    </TableCell>
                    {!isAdmin && (
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleEditClick(e, order)}
                                  disabled={!canModify}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {canModify ? 'Editar pedido' : blockReason}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {onDelete && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleDeleteClick(e, order.id)}
                                    disabled={!canModify}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {canModify ? 'Eliminar pedido' : blockReason}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
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

      {/* Order Edit Modal */}
      {onUpdate && (
        <OrderEditModal
          order={editingOrder}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingOrder(null);
          }}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

export default OrdersTable;
