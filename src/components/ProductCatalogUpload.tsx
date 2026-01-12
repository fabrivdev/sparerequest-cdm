import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Product {
  brand: string;
  code: string;
  name: string;
  price_aereo: number;
  price_maritimo: number;
}

interface ParseResult {
  products: Product[];
  productsWithMissingPrices: string[]; // codes with missing/invalid prices
}

interface ProductCatalogUploadProps {
  onUploadSuccess?: () => void;
}

interface CatalogInfo {
  fileName: string;
  uploadedAt: string;
}

const BATCH_SIZE = 2000;
const MAX_CONCURRENT_BATCHES = 3;
const CATALOG_INFO_KEY = 'product_catalog_info';

const ProductCatalogUpload = ({ onUploadSuccess }: ProductCatalogUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load catalog info from localStorage on mount
  useEffect(() => {
    const savedInfo = localStorage.getItem(CATALOG_INFO_KEY);
    if (savedInfo) {
      try {
        setCatalogInfo(JSON.parse(savedInfo));
      } catch {
        localStorage.removeItem(CATALOG_INFO_KEY);
      }
    }
  }, []);

  const parseExcel = (file: File): Promise<ParseResult> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          setStatusMessage('Procesando archivo Excel...');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          // Skip header row - expects 5 columns: Marca, Código, Nombre, AEREO, MARITIMO
          const products: Product[] = [];
          const productsWithMissingPrices: string[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 3) {
              const brand = String(row[0] || '').trim();
              const code = String(row[1] || '').trim();
              const name = String(row[2] || '').trim();
              
              // Parse prices - treat invalid/empty as 0
              const rawAereo = row[3];
              const rawMaritimo = row[4];
              const price_aereo = typeof rawAereo === 'number' ? rawAereo : parseFloat(String(rawAereo || '0')) || 0;
              const price_maritimo = typeof rawMaritimo === 'number' ? rawMaritimo : parseFloat(String(rawMaritimo || '0')) || 0;
              
              // Track products with missing/zero prices
              const hasMissingPrice = price_aereo === 0 || price_maritimo === 0 || 
                rawAereo === '' || rawAereo === null || rawAereo === undefined ||
                rawMaritimo === '' || rawMaritimo === null || rawMaritimo === undefined ||
                (typeof rawAereo === 'string' && rawAereo.includes('#')) ||
                (typeof rawMaritimo === 'string' && rawMaritimo.includes('#'));

              if (brand && code && name) {
                products.push({ brand, code, name, price_aereo, price_maritimo });
                if (hasMissingPrice) {
                  productsWithMissingPrices.push(code);
                }
              }
            }
          }

          resolve({ products, productsWithMissingPrices });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const insertInBatches = async (products: Product[]) => {
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    let completedBatches = 0;
    let successCount = 0;
    let errorCount = 0;

    // Divide into batches
    const batches: Product[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    // Process batches with limited concurrency
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);

      const results = await Promise.allSettled(
        concurrentBatches.map(batch =>
          supabase.from('products').upsert(batch, {
            onConflict: 'code',
            ignoreDuplicates: false
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successCount += concurrentBatches[idx].length;
        } else {
          errorCount += concurrentBatches[idx].length;
          console.error('Batch error:', result.status === 'rejected' ? result.reason : result.value.error);
        }
      });

      completedBatches += concurrentBatches.length;
      const progressPercent = Math.round((completedBatches / totalBatches) * 100);
      setProgress(progressPercent);
      setStatusMessage(`Cargando ${Math.min(completedBatches * BATCH_SIZE, products.length).toLocaleString()} de ${products.length.toLocaleString()} productos...`);
    }

    return { successCount, errorCount };
  };

  const checkProductsWithOrders = async (productCodes: string[]): Promise<string[]> => {
    if (productCodes.length === 0) return [];
    
    // Get distinct product codes from orders
    const { data: ordersWithProducts } = await supabase
      .from('orders')
      .select('product_code')
      .in('product_code', productCodes);
    
    if (!ordersWithProducts) return [];
    
    const codesWithOrders = [...new Set(ordersWithProducts.map(o => o.product_code))];
    return codesWithOrders;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor sube un archivo Excel (.xlsx o .xls)');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatusMessage('Leyendo archivo...');

    try {
      const { products, productsWithMissingPrices } = await parseExcel(file);

      if (products.length === 0) {
        toast.error('No se encontraron productos válidos en el archivo');
        setIsUploading(false);
        setStatusMessage('');
        return;
      }

      setStatusMessage(`Encontrados ${products.length.toLocaleString()} productos. Iniciando carga...`);

      const { successCount, errorCount } = await insertInBatches(products);

      if (errorCount === 0) {
        toast.success(`Se cargaron ${successCount.toLocaleString()} productos correctamente`);
      } else {
        toast.warning(`Cargados ${successCount.toLocaleString()} productos. ${errorCount.toLocaleString()} fallaron.`);
      }

      // Check for products with missing prices that have orders
      if (productsWithMissingPrices.length > 0) {
        setStatusMessage('Verificando productos con precios faltantes...');
        const codesWithOrders = await checkProductsWithOrders(productsWithMissingPrices);
        
        if (codesWithOrders.length > 0) {
          toast.warning(
            `⚠️ ${codesWithOrders.length} producto(s) con precio faltante tienen pedidos: ${codesWithOrders.slice(0, 5).join(', ')}${codesWithOrders.length > 5 ? ` y ${codesWithOrders.length - 5} más` : ''}`,
            { duration: 10000 }
          );
        } else if (productsWithMissingPrices.length > 0) {
          toast.info(
            `ℹ️ ${productsWithMissingPrices.length} producto(s) con precio vacío/error (sin pedidos aún)`,
            { duration: 5000 }
          );
        }
      }

      // Save catalog info to localStorage
      const newCatalogInfo: CatalogInfo = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      localStorage.setItem(CATALOG_INFO_KEY, JSON.stringify(newCatalogInfo));
      setCatalogInfo(newCatalogInfo);

      setStatusMessage('');
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al procesar el archivo');
      setStatusMessage('');
    }

    setIsUploading(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-card ios-shadow rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Catálogo de Productos</h3>
            <p className="text-xs text-muted-foreground">
              {catalogInfo && !isUploading ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  {catalogInfo.fileName} • {format(new Date(catalogInfo.uploadedAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </span>
              ) : (
                'Sube un archivo XLSX con marca, código, nombre, precio aéreo y precio marítimo'
              )}
            </p>
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={isUploading}
            className="h-9 gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {catalogInfo ? 'Reemplazar' : 'Subir Catálogo'}
              </>
            )}
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{statusMessage}</p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogUpload;
