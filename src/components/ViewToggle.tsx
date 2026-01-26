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

interface ViewToggleProps {
  view: 'my-orders' | 'branch-orders' | 'delivered';
  onViewChange: (view: 'my-orders' | 'branch-orders' | 'delivered') => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
  userBranch?: string;
  branches?: Branch[];
}

const ViewToggle = ({ 
  view, 
  onViewChange, 
  selectedBranch = '',
  onBranchChange,
  userBranch = '',
  branches = []
}: ViewToggleProps) => {
  const activeBranches = branches.filter(b => b.is_active);
  
  const getBranchLabel = () => {
    if (selectedBranch === 'all') return 'Todas las Sucursales';
    if (selectedBranch) return selectedBranch;
    return 'En Sucursal';
  };

  return (
    <div className="inline-flex bg-secondary/50 rounded-lg p-1">
      <button
        onClick={() => onViewChange('my-orders')}
        className={cn(
          'px-3 py-2 text-sm font-medium rounded-md transition-all',
          view === 'my-orders'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Mis Pedidos
      </button>

      {/* Branch orders with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1',
              view === 'branch-orders'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {getBranchLabel()}
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
          'px-3 py-2 text-sm font-medium rounded-md transition-all',
          view === 'delivered'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Entregados
      </button>
    </div>
  );
};

export default ViewToggle;
