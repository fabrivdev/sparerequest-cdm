export const DESARME_STATUS_LABELS: Record<string, string> = {
  pendiente_cotizacion: 'Pendiente Cotización',
  pendiente_autorizacion: 'Pendiente Autorización',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pedido_generado: 'Pedido Generado',
  recibido: 'Recibido',
  maquina_rearmada: 'Máquina Rearmada',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export const DESARME_STATUS_COLORS: Record<string, string> = {
  pendiente_cotizacion: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pendiente_autorizacion: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  aprobado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rechazado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pedido_generado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  recibido: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  maquina_rearmada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  cerrado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export const DESARME_ALL_STATUSES = Object.keys(DESARME_STATUS_LABELS);
