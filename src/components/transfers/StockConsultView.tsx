import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Clock } from 'lucide-react';

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

const StockConsultView = ({ userBranch, userId, userName }: StockConsultViewProps) => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ brand: string; product_code: string; product_name: string } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

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
    acc[key].branches[item.branch] = item.quantity;
    return acc;
  }, {} as Record<string, { brand: string; product_code: string; product_name: string; branches: Record<string, number> }>);

  const products = Object.values(groupedStock);

  // Dynamic branches: only show branches that have stock > 0 for at least one product
  const activeBranches = Array.from(
    new Set(stock.filter(s => s.quantity > 0).map(s => s.branch))
  ).sort();

  const handleRowClick = (product: { brand: string; product_code: string; product_name: string }) => {
    setSelectedItem(product);
    setShowTransferModal(true);
  };

  const getStockForItem = (brand: string, productCode: string) => {
    return stock.filter(s => s.brand === brand && s.product_code === productCode);
  };

  return (
    <div className="space-y-4">
      {lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Última actualización: {format(new Date(lastUpdate), "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar código de producto..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="h-10"
          />
        </div>
        <Button onClick={fetchStock} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </Button>
      </div>

      {/* Stock Table */}
      {products.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron resultados. Intenta buscar por código.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Código</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                {activeBranches.map(branch => (
                  <TableHead key={branch} className="font-semibold text-center text-xs">
                    {branch}
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
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
