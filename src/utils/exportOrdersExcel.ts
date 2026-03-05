import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_OPTIONS, SHIPPING_METHODS } from '@/constants/statuses';

interface OrderForExport {
  brand: string;
  product_code: string;
  quantity: number;
  branch_destination: string;
  observation: string | null;
  status: string;
  created_at: string;
  order_number?: string | null;
  shipping_method?: string;
  order_destination?: string;
  user_name?: string;
  delivered_at?: string | null;
  is_invoiced?: boolean;
  invoice_number?: string | null;
}

const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;
const shippingLabel = (s: string) => SHIPPING_METHODS.find(o => o.value === s)?.label || s;

export function exportOrdersToExcel(orders: OrderForExport[], fileName: string, showUser = false) {
  const rows = orders.map(o => {
    const base: Record<string, string | number | boolean> = {};
    if (showUser) base['Usuario'] = o.user_name || '';
    base['Fecha'] = format(new Date(o.created_at), 'dd/MM/yyyy HH:mm', { locale: es });
    base['Nº Pedido'] = o.order_number || '';
    base['Marca'] = o.brand;
    base['Código'] = o.product_code;
    base['Cantidad'] = o.quantity;
    base['Sucursal'] = o.branch_destination;
    base['Envío'] = shippingLabel(o.shipping_method || '');
    base['Destino'] = o.order_destination === 'stock' ? 'Stock' : 'Cliente';
    base['Estado'] = statusLabel(o.status);
    base['Observación'] = o.observation || '';
    if (o.delivered_at) base['Entregado'] = format(new Date(o.delivered_at), 'dd/MM/yyyy', { locale: es });
    if (o.is_invoiced !== undefined) base['Facturado'] = o.is_invoiced ? 'Sí' : 'No';
    if (o.invoice_number) base['Nº Factura'] = o.invoice_number;
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
