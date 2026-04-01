import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Branch {
  name: string;
  is_active: boolean;
}

type ViewType = 'my-orders' | 'branch-orders' | 'delivered' | 'prices';

interface ViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
  userBranch?: string;
  branches?: Branch[];
  pendingInvoiceCount?: number;
}

const ViewToggle = ({ 
  view, 
  onViewChange, 
  selectedBranch = '',
  onBranchChange,
  userBranch = '',
  branches = [],
  pendingInvoiceCount = 0,
}: ViewToggleProps) => {
  const activeBranches = branches.filter(b => b.is_active);
  
  const getBranchLabel = () => {
    if (selectedBranch === 'all') return 'Todas las Sucursales';
    if (selectedBranch) return selectedBranch;
    return 'En Sucursal';
  };

  return (
    <div className="inline-flex bg-secondary/50 rounded-lg p-0.5 sm:p-1 max-w-full flex-wrap mt-1 mr-1">
      <button
        onClick={() => onViewChange('my-orders')}
        className={cn(
          'px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap',
          view === 'my-orders'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="sm:hidden">Mis</span>
        <span className="hidden sm:inline">Mis Pedidos</span>
      </button>

      {/* Branch orders with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center gap-1 whitespace-nowrap',
              view === 'branch-orders'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="sm:hidden">{selectedBranch === 'all' ? 'Todas' : 'Sucursal'}</span>
            <span className="hidden sm:inline">{getBranchLabel()}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* User's branch first */}
          {userBranch && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  onViewChange('branch-orders');
                  onBranchChange?.(userBranch);
                }}
                className={selectedBranch === userBranch && view === 'branch-orders' ? 'bg-accent' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{userBranch}</span>
                  {selectedBranch === userBranch && view === 'branch-orders' && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Other branches */}
          {activeBranches
            .filter(b => b.name !== userBranch)
            .map((branch) => (
              <DropdownMenuItem
                key={branch.name}
                onClick={() => {
                  onViewChange('branch-orders');
                  onBranchChange?.(branch.name);
                }}
                className={selectedBranch === branch.name && view === 'branch-orders' ? 'bg-accent' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{branch.name}</span>
                  {selectedBranch === branch.name && view === 'branch-orders' && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          
          <DropdownMenuSeparator />
          
          {/* All branches option */}
          <DropdownMenuItem
            onClick={() => {
              onViewChange('branch-orders');
              onBranchChange?.('all');
            }}
            className={selectedBranch === 'all' && view === 'branch-orders' ? 'bg-accent' : ''}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">Todas las Sucursales</span>
              {selectedBranch === 'all' && view === 'branch-orders' && (
                <Check className="w-4 h-4" />
              )}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={() => onViewChange('delivered')}
        className={cn(
          'px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all relative whitespace-nowrap',
          view === 'delivered'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Entregados
        {pendingInvoiceCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {pendingInvoiceCount > 99 ? '99+' : pendingInvoiceCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onViewChange('prices')}
        className={cn(
          'px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap',
          view === 'prices'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Precios
      </button>
    </div>
  );
};

export { type ViewType };
export default ViewToggle;
