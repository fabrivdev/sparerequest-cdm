import { User, Warehouse, Users } from 'lucide-react';

// Order destination options
export const ORDER_DESTINATIONS = [
  { value: 'cliente', label: 'Cliente', icon: User, colorClass: 'blue-500' },
  { value: 'stock', label: 'Stock', icon: Warehouse, colorClass: 'green-500' },
  { value: 'ambos', label: 'Ambos', icon: Users, colorClass: 'purple-500' },
] as const;

export type OrderDestination = typeof ORDER_DESTINATIONS[number]['value'];
