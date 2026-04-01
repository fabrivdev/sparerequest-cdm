import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  brand: string;
  code: string;
  name: string;
  price_aereo: number;
  price_maritimo: number;
  price_terrestre: number;
}

type SearchMode = 'contains' | 'starts' | 'ends' | 'equals';

const ITEMS_PER_PAGE = 200;

const formatPrice = (value: number) =>
  value > 0 ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

const PriceConsultView = () => {
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('contains');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase.rpc('get_distinct_brands');
      if (data) {
        setBrands(data.map((d: { brand: string }) => d.brand));
      }
      setLoadingBrands(false);
    };
    fetchBrands();
  }, []);

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, searchMode, selectedBrand]);

  // Fetch products server-side
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);

    const buildQuery = (countOnly: boolean) => {
      let q = countOnly
        ? supabase.from('products').select('*', { count: 'exact', head: true })
        : supabase.from('products').select('id, brand, code, name, price_aereo, price_maritimo, price_terrestre');

      if (selectedBrand !== 'all') {
        q = q.eq('brand', selectedBrand);
      }

      const term = debouncedSearch.trim();
      if (term) {
        const pattern = searchMode === 'contains' ? `%${term}%`
          : searchMode === 'starts' ? `${term}%`
          : searchMode === 'ends' ? `%${term}`
          : term;

        if (searchMode === 'equals') {
          q = q.or(`code.ilike.${pattern},name.ilike.${pattern},brand.ilike.${pattern}`);
        } else {
          q = q.or(`code.ilike.${pattern},name.ilike.${pattern},brand.ilike.${pattern}`);
        }
      }

      return q;
    };

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const [countRes, dataRes] = await Promise.all([
      buildQuery(true),
      buildQuery(false).order('brand').order('code').range(from, to),
    ]);

    setTotalCount(countRes.count ?? 0);
    setProducts((dataRes.data as Product[]) ?? []);
    setLoadingProducts(false);
  }, [selectedBrand, debouncedSearch, searchMode, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  

  return (
    <div className="space-y-4">
      {/* Search bar + mode selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={searchMode} onValueChange={v => setSearchMode(v as SearchMode)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Contiene</SelectItem>
            <SelectItem value="starts">Empieza con</SelectItem>
            <SelectItem value="ends">Termina con</SelectItem>
            <SelectItem value="equals">Es igual a</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brand filter chips */}
      {loadingBrands ? (
        <p className="text-xs text-muted-foreground">Cargando marcas...</p>
      ) : brands.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={selectedBrand === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedBrand('all')}
            className="h-7 text-xs"
          >
            Todas
          </Button>
          {brands.map(b => (
            <Button
              key={b}
              size="sm"
              variant={selectedBrand === b ? 'default' : 'outline'}
              onClick={() => setSelectedBrand(selectedBrand === b ? 'all' : b)}
              className="h-7 text-xs"
            >
              {b}
            </Button>
          ))}
        </div>
      )}

      {loadingProducts ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No se encontraron productos con esos filtros
        </p>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Aéreo</TableHead>
                <TableHead className="text-right">Marítimo</TableHead>
                <TableHead className="text-right">Terrestre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.brand}</TableCell>
                  <TableCell>{p.code}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price_aereo)}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price_maritimo)}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price_terrestre)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer: count + pagination */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {totalCount} producto{totalCount !== 1 ? 's' : ''}
            {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
          </p>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {pageNumbers.map(n => (
                  <PaginationItem key={n}>
                    <PaginationLink
                      isActive={n === page}
                      onClick={() => setPage(n)}
                      className="cursor-pointer"
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceConsultView;
