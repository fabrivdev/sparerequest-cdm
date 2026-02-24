export const TRANSFER_STATUSES = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  DESPACHADA: 'Despachada',
  RECIBIDA: 'Recibida',
  CERRADA: 'Cerrada',
  INCIDENCIA: 'Incidencia',
} as const;

export type TransferStatus = typeof TRANSFER_STATUSES[keyof typeof TRANSFER_STATUSES];

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  'Pendiente': 'bg-yellow-500/10 text-yellow-600',
  'Aceptada': 'bg-blue-500/10 text-blue-600',
  'Rechazada': 'bg-red-500/10 text-red-600',
  'Cancelada': 'bg-muted text-muted-foreground',
  'Despachada': 'bg-purple-500/10 text-purple-600',
  'Recibida': 'bg-teal-500/10 text-teal-600',
  'Cerrada': 'bg-green-500/10 text-green-600',
  'Incidencia': 'bg-orange-500/10 text-orange-600',
};

// Valid transitions: fromStatus -> [allowed next statuses]
export const VALID_TRANSITIONS: Record<string, string[]> = {
  'Pendiente': ['Aceptada', 'Rechazada', 'Cancelada'],
  'Despachada': ['Recibida'],
  'Recibida': ['Cerrada', 'Incidencia'],
  'Incidencia': ['Cerrada'],
};

export const TRANSFER_PRIORITIES = ['normal', 'urgente'] as const;
export type TransferPriority = typeof TRANSFER_PRIORITIES[number];
