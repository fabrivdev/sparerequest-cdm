import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Product {
  brand: string;
  code: string;
  name: string;
  price: number;
}

interface ProductCatalogUploadProps {
  onUploadSuccess?: () => void;
}

const ProductCatalogUpload = ({ onUploadSuccess }: ProductCatalogUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcel = (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          // Skip header row
          const products: Product[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 4) {
              const brand = String(row[0] || '').trim();
              const code = String(row[1] || '').trim();
              const name = String(row[2] || '').trim();
              const price = parseFloat(String(row[3] || '0'));

              if (brand && code && name && !isNaN(price)) {
                products.push({ brand, code, name, price });
              }
            }
          }

          resolve(products);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor sube un archivo Excel (.xlsx o .xls)');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      const products = await parseExcel(file);

      if (products.length === 0) {
        toast.error('No se encontraron productos válidos en el archivo');
        setIsUploading(false);
        return;
      }

      // Delete existing products and insert new ones
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('Error deleting products:', deleteError);
        toast.error('Error al reemplazar el catálogo');
        setIsUploading(false);
        return;
      }

      // Insert new products
      const { error: insertError } = await supabase
        .from('products')
        .insert(products);

      if (insertError) {
        console.error('Error inserting products:', insertError);
        toast.error('Error al cargar los productos');
        setIsUploading(false);
        return;
      }

      toast.success(`Se cargaron ${products.length} productos correctamente`);
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error al procesar el archivo');
    }

    setIsUploading(false);
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
              {fileName ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  {fileName}
                </span>
              ) : (
                'Sube un archivo XLSX con marca, código, nombre y precio'
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
                {fileName ? 'Reemplazar' : 'Subir Catálogo'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalogUpload;
