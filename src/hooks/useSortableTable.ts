import { useState, useMemo } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function useSortableTable<T extends Record<string, any>>(
  data: T[],
  defaultSort?: SortConfig
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle nulls - push to end
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle booleans
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        const aNum = aVal ? 1 : 0;
        const bNum = bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Handle dates (ISO strings)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const dateA = Date.parse(aVal);
        const dateB = Date.parse(bVal);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' }; // Default: mayor a menor primero
    });
  };

  return { sortedData, sortConfig, requestSort };
}
