import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveredFiltersState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  brand: string;
  productCode: string;
  invoiceStatus: '' | 'pending' | 'invoiced' | 'na';
  observation: string;
}

interface DeliveredFiltersProps {
  filters: DeliveredFiltersState;
  onFiltersChange: (filters: DeliveredFiltersState) => void;
}

interface Provider {
  id: string;
  name: string;
  is_active: boolean;
}

const DeliveredFilters = ({ filters, onFiltersChange }: DeliveredFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (data && !error) {
        setProviders(data);
      }
    };

    fetchProviders();
  }, []);

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.brand ||
    filters.productCode ||
    filters.invoiceStatus ||
    filters.observation;

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: undefined,
      dateTo: undefined,
      brand: '',
      productCode: '',
      invoiceStatus: '',
      observation: '',
    });
  };

  const activeFilterCount = [
    filters.dateFrom || filters.dateTo,
    filters.brand,
    filters.productCode,
    filters.invoiceStatus,
    filters.observation,
  ].filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" />
            Limpiar
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-muted/30 rounded-lg border">
          {/* Date From */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha Desde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal h-9',
                    !filters.dateFrom && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha Hasta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal h-9',
                    !filters.dateTo && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {filters.dateTo ? (
                    format(filters.dateTo, 'dd/MM/yyyy', { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Marca</Label>
            <Select
              value={filters.brand}
              onValueChange={(value) => onFiltersChange({ ...filters, brand: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.name}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Code */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Código</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={filters.productCode}
                onChange={(e) => onFiltersChange({ ...filters, productCode: e.target.value })}
                placeholder="Buscar..."
                className="h-9 text-sm pl-8"
              />
            </div>
          </div>

          {/* Invoice Status */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Facturación</Label>
            <Select
              value={filters.invoiceStatus}
              onValueChange={(value) => onFiltersChange({ ...filters, invoiceStatus: value as DeliveredFiltersState['invoiceStatus'] })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="invoiced">Facturado</SelectItem>
                <SelectItem value="na">N/A (Stock)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observation */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Observación</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={filters.observation}
                onChange={(e) => onFiltersChange({ ...filters, observation: e.target.value })}
                placeholder="Buscar..."
                className="h-9 text-sm pl-8"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DeliveredFilters;
