import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '@/hooks/useSortableTable';

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableTableHead = ({
  children,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: SortableTableHeadProps) => {
  const isActive = currentSort?.key === sortKey;
  const isAsc = isActive && currentSort?.direction === 'asc';

  return (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-muted/80 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && (
          isAsc ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : <ArrowDown className="w-3 h-3 flex-shrink-0" />
        )}
      </div>
    </TableHead>
  );
};
