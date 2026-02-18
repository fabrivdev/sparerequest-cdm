import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Clock } from 'lucide-react';
import { BRANCHES } from '@/constants/branches';
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
  const [searchBrand, setSearchBrand] = useState('');
  const [salesPeriod, setSalesPeriod] = useState('12');
  const [sales, setSales] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ brand: string; product_code: string; product_name: string } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'getStock', brand: searchBrand || undefined, productCode: searchCode || undefined },
    });

    if (!error && data) {
      setStock(data.stock || []);
      setLastUpdate(data.lastUpdate || null);
    }

    // Fetch sales too
    const { data: salesData } = await supabase.functions.invoke('transfer-operations', {
      body: { action: 'getSales', brand: searchBrand || undefined, productCode: searchCode || undefined, months: parseInt(salesPeriod) },
    });

    if (salesData) {
      setSales(salesData.sales || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStock();
  }, [salesPeriod]);

  // Group stock by product (brand + code)
  const groupedStock = stock.reduce((acc, item) => {
    const key = `${item.brand}|${item.product_code}`;
    if (!acc[key]) {
      acc[key] = { brand: item.brand, product_code: item.product_code, product_name: item.product_name, branches: {} };
    }
    acc[key].branches[item.branch] = item.quantity;
    return acc;
  }, {} as Record<string, { brand: string; product_code: string; product_name: string; branches: Record<string, number> }>);

  // Calculate total sales per product
  const salesByProduct = sales.reduce((acc, s) => {
    const key = `${s.brand}|${s.product_code}`;
    acc[key] = (acc[key] || 0) + s.quantity_sold;
    return acc;
  }, {} as Record<string, number>);

  const products = Object.values(groupedStock);

  const handleRowClick = (product: { brand: string; product_code: string; product_name: string }) => {
    setSelectedItem(product);
    setShowTransferModal(true);
  };

  // Get stock per branch for the selected item
  const getStockForItem = (brand: string, productCode: string) => {
    return stock.filter(s => s.brand === brand && s.product_code === productCode);
  };

  return (
    <div className="space-y-4">
      {/* Last update indicator */}
      {lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Última actualización: {format(new Date(lastUpdate), "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Buscar código..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Buscar marca..."
            value={searchBrand}
            onChange={(e) => setSearchBrand(e.target.value)}
            className="h-10"
          />
        </div>
        <Select value={salesPeriod} onValueChange={setSalesPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12 meses</SelectItem>
            <SelectItem value="24">24 meses</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchStock} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </Button>
      </div>

      {/* Stock Table */}
      {products.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron resultados. Intenta buscar por código o marca.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Marca</TableHead>
                <TableHead className="font-semibold">Código</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                {BRANCHES.map(branch => (
                  <TableHead key={branch} className="font-semibold text-center text-xs">
                    {branch}
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-center">
                  Ventas ({salesPeriod}m)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const key = `${product.brand}|${product.product_code}`;
                const totalSales = salesByProduct[key] || 0;

                return (
                  <TableRow
                    key={key}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleRowClick(product)}
                  >
                    <TableCell className="font-medium">{product.brand}</TableCell>
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{product.product_name}</TableCell>
                    {BRANCHES.map(branch => {
                      const qty = product.branches[branch] ?? 0;
                      return (
                        <TableCell key={branch} className="text-center">
                          <Badge variant={qty > 0 ? 'default' : 'secondary'} className="text-xs min-w-[32px]">
                            {qty}
                          </Badge>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-medium">
                      {totalSales}
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
