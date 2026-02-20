import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Clock, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TransferRequestModal from './TransferRequestModal';

interface StockItem {
  brand: string;
  product_code: string;
  product_name: string;
  branch: string;
  quantity: number;
}

interface StockConsultViewProps {
  userBranch: string;
  userId: string;
  userName: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 100;

const StockConsultView = ({ userBranch, userId, userName }: StockConsultViewProps) => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ brand: string; product_code: string; product_name: string } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'total', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'getStock', productCode: searchCode || undefined },
    });

    if (!error && data) {
      setStock(data.stock || []);
      setLastUpdate(data.lastUpdate || null);
    }

    setLoading(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Group stock by product (brand + code)
  const groupedStock = stock.reduce((acc, item) => {
    const key = `${item.brand}|${item.product_code}`;
    if (!acc[key]) {
      acc[key] = { brand: item.brand, product_code: item.product_code, product_name: item.product_name, branches: {} };
    }
    acc[key].branches[item.branch] = (acc[key].branches[item.branch] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, { brand: string; product_code: string; product_name: string; branches: Record<string, number> }>);

  const products = Object.values(groupedStock);

  // Dynamic branches: only show branches that have stock > 0 for at least one product
  const activeBranches = Array.from(
    new Set(stock.filter(s => s.quantity > 0).map(s => s.branch))
  ).sort();

  // Sorted products
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortConfig.key === 'total') {
        aVal = activeBranches.reduce((sum, br) => sum + (a.branches[br] ?? 0), 0);
        bVal = activeBranches.reduce((sum, br) => sum + (b.branches[br] ?? 0), 0);
      } else if (sortConfig.key === 'product_code') {
        aVal = a.product_code.toLowerCase();
        bVal = b.product_code.toLowerCase();
      } else if (sortConfig.key === 'product_name') {
        aVal = a.product_name.toLowerCase();
        bVal = b.product_name.toLowerCase();
      } else {
        // Branch column
        aVal = a.branches[sortConfig.key] ?? 0;
        bVal = b.branches[sortConfig.key] ?? 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortConfig, activeBranches]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
    setCurrentPage(1);
  };

  const SortableHeader = ({ sortKey, children, className = '' }: { sortKey: string; children: React.ReactNode; className?: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <TableHead
        className={`cursor-pointer select-none hover:bg-muted/80 transition-colors ${className}`}
        onClick={() => requestSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            sortConfig.direction === 'asc'
              ? <ArrowUp className="w-3 h-3 flex-shrink-0" />
              : <ArrowDown className="w-3 h-3 flex-shrink-0" />
          )}
        </div>
      </TableHead>
    );
  };

  const handleRowClick = (product: { brand: string; product_code: string; product_name: string }) => {
    setSelectedItem(product);
    setShowTransferModal(true);
  };

  const getStockForItem = (brand: string, productCode: string) => {
    return stock.filter(s => s.brand === brand && s.product_code === productCode);
  };

  // Page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-3">
      {lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Última actualización: {format(new Date(lastUpdate), "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            placeholder="Buscar código..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <Button onClick={fetchStock} disabled={loading} size="sm" className="gap-1.5 h-9">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="hidden sm:inline">Buscar</span>
        </Button>
      </div>

      {/* Stock Table */}
      {sortedProducts.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron resultados. Intenta buscar por código.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{sortedProducts.length} productos encontrados</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>

          <div className="rounded-xl border border-border overflow-x-auto -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHeader sortKey="product_code" className="font-semibold">Código</SortableHeader>
                  <SortableHeader sortKey="product_name" className="font-semibold">Nombre</SortableHeader>
                  {activeBranches.map(branch => (
                    <SortableHeader key={branch} sortKey={branch} className="font-semibold text-center text-xs">
                      {branch}
                    </SortableHeader>
                  ))}
                  <SortableHeader sortKey="total" className="font-semibold text-center">Total</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const key = `${product.brand}|${product.product_code}`;
                  const total = activeBranches.reduce((sum, branch) => sum + (product.branches[branch] ?? 0), 0);

                  return (
                    <TableRow
                      key={key}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleRowClick(product)}
                    >
                      <TableCell className="font-medium">{product.product_code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.product_name}</TableCell>
                      {activeBranches.map(branch => {
                        const qty = product.branches[branch] ?? 0;
                        return (
                          <TableCell key={branch} className="text-center">
                            <Badge variant={qty > 0 ? 'default' : 'secondary'} className="text-xs min-w-[32px]">
                              {qty}
                            </Badge>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge variant={total > 0 ? 'outline' : 'secondary'} className="text-xs min-w-[40px] font-bold">
                          {total}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Transfer Request Modal */}
      {selectedItem && (
        <TransferRequestModal
          isOpen={showTransferModal}
          onClose={() => { setShowTransferModal(false); setSelectedItem(null); }}
          brand={selectedItem.brand}
          productCode={selectedItem.product_code}
          productName={selectedItem.product_name}
          stockByBranch={getStockForItem(selectedItem.brand, selectedItem.product_code)}
          userBranch={userBranch}
          userId={userId}
          userName={userName}
          onSuccess={fetchStock}
        />
      )}
    </div>
  );
};

export default StockConsultView;
