// Status options for orders
export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'pte_envio', label: 'Pte. de envío', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
];

// Shipping methods
export const SHIPPING_METHODS = [
  { value: 'aereo', label: 'Aéreo', sublabel: 'Urgente', colorClass: 'blue-500' },
  { value: 'maritimo', label: 'Marítimo', sublabel: 'Puede esperar', colorClass: 'cyan-600' },
  { value: 'terrestre', label: 'Terrestre', sublabel: 'Local', colorClass: 'orange-500' },
];
