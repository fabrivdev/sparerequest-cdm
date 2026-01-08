import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OrderFiltersState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  brand: string;
  productCode: string;
  branch: string;
  status: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onFiltersChange: (filters: OrderFiltersState) => void;
  branches: string[];
}

const BRAND_OPTIONS = ['CLAAS', 'HORSCH'];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'entregado', label: 'Entregado' },
];

const OrderFilters = ({ filters, onFiltersChange, branches }: OrderFiltersProps) => {
  const updateFilter = (key: keyof OrderFiltersState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: undefined,
      dateTo: undefined,
      brand: '',
      productCode: '',
      branch: '',
      status: '',
    });
  };

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.brand || 
    filters.productCode || 
    filters.branch || 
    filters.status;

  return (
    <div className="bg-card ios-shadow rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="w-3 h-3 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Código</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={filters.productCode}
              onChange={(e) => updateFilter('productCode', e.target.value)}
              className="h-9 bg-secondary/50 border-0 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Date From */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left font-normal bg-secondary/50 border-0 text-sm",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => updateFilter('dateFrom', date)}
                locale={es}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left font-normal bg-secondary/50 border-0 text-sm",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => updateFilter('dateTo', date)}
                locale={es}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Brand */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Marca</Label>
          <Select value={filters.brand || 'all'} onValueChange={(v) => updateFilter('brand', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 bg-secondary/50 border-0 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BRAND_OPTIONS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Branch */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Sucursal</Label>
          <Select value={filters.branch || 'all'} onValueChange={(v) => updateFilter('branch', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 bg-secondary/50 border-0 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Estado</Label>
          <Select value={filters.status || 'all'} onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 bg-secondary/50 border-0 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default OrderFilters;
