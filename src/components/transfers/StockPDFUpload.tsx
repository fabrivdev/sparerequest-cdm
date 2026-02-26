import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BRANCH_CODE_MAP } from '@/constants/branches';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface StockPDFUploadProps {
  userId: string;
  onSuccess: () => void;
}

interface ParsedStockItem {
  brand: string;
  product_code: string;
  product_name: string;
  branch: string;
  quantity: number;
}

const StockPDFUpload = ({ userId, onSuccess }: StockPDFUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractBrandFromSubGroup = (subGroup: string): string => {
    // e.g. "(7)REPUESTOS - CLAAS" → "CLAAS"
    // e.g. "(56)REPUESTOS CLAAS - PROMOCION" → "CLAAS"
    const match = subGroup.match(/REPUESTOS\s*[-]?\s*(\w+)/i);
    if (match) return match[1].toUpperCase();
    // fallback: take last word
    const parts = subGroup.replace(/\(\d+\)/, '').trim().split(/\s+/);
    return parts[parts.length - 1]?.toUpperCase() || 'OTROS';
  };

  const parsePDFContent = async (file: File): Promise<ParsedStockItem[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const stockMap = new Map<string, ParsedStockItem>();
    let processedPages = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Get text items sorted by position (top to bottom, left to right)
      const items = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          width: item.width,
        }));

      // Group items by Y position (same row)
      const rows = new Map<number, typeof items>();
      for (const item of items) {
        // Round Y to group items on same line (within 3px tolerance)
        const roundedY = Math.round(item.y / 3) * 3;
        if (!rows.has(roundedY)) rows.set(roundedY, []);
        rows.get(roundedY)!.push(item);
      }

      // Sort rows by Y (descending = top to bottom in PDF coordinates)
      const sortedRows = [...rows.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, items]) => items.sort((a, b) => a.x - b.x));

      for (const row of sortedRows) {
        const texts = row.map(i => i.text);
        const fullLine = texts.join(' ');

        // Skip headers, totals, footers
        if (fullLine.includes('Cód. Merc') || fullLine.includes('Total') ||
            fullLine.includes('Archivo:') || fullLine.includes('Inventario de Stock') ||
            fullLine.includes('CAMPOS DEL MANANA') || fullLine.includes('Filtros:') ||
            fullLine.includes('Moneda:') || fullLine.includes('Fecha Base') ||
            fullLine.includes('Sub Grupos') || fullLine.includes('Imprimir') ||
            fullLine.includes('Detallar') || fullLine.includes('Listar') ||
            fullLine.includes('Seleccionar') || fullLine.includes('Orden:')) {
          continue;
        }

        // Try to parse a data row
        // Pattern: CodMerc | CodFabr | SubGrupo | NombreMerc | CodBarras | Embalaje | Suc/Dept | Cantidad | CostoUnit | Total
        // The Suc./Dept field has format "N - N" where first N is branch code
        const sucDeptMatch = fullLine.match(/(\d+)\s*-\s*(\d+)/);
        if (!sucDeptMatch) continue;

        const branchCode = parseInt(sucDeptMatch[1]);
        const branchName = BRANCH_CODE_MAP[branchCode];
        if (!branchName) continue; // Skip unknown branches (e.g., REPLICABI = 6)

        // Find quantity - it's the number right after the suc/dept pattern
        const afterSucDept = fullLine.substring(fullLine.indexOf(sucDeptMatch[0]) + sucDeptMatch[0].length);
        const qtyMatch = afterSucDept.match(/^\s*(\d+)/);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 0;

        // Extract product code and name from the line
        // CodFabr is typically the second field - look for it in the text items
        // SubGrupo contains brand info
        let productCode = '';
        let productName = '';
        let subGroup = '';

        // Try to find fields by position - CodFabr is usually the 2nd column
        if (texts.length >= 4) {
          // First text could be CodMerc, second CodFabr
          const codMerc = texts[0];
          if (/^\d+$/.test(codMerc)) {
            productCode = texts[1] || '';
            // SubGroup usually contains parentheses
            const subGroupIdx = texts.findIndex(t => t.startsWith('('));
            if (subGroupIdx >= 0) {
              // Collect subgroup and product name
              let sgParts: string[] = [];
              let nameParts: string[] = [];
              let pastSubGroup = false;

              for (let i = subGroupIdx; i < texts.length; i++) {
                const t = texts[i];
                if (t === sucDeptMatch[0] || t === sucDeptMatch[1] || t === sucDeptMatch[2]) break;
                if (t.match(/^\d+\s*-\s*\d+$/)) break;

                if (!pastSubGroup) {
                  if (t.startsWith('(') || sgParts.length > 0) {
                    sgParts.push(t);
                    if (t.includes('CLAAS') || t.includes('REPUESTOS')) {
                      pastSubGroup = true;
                    }
                  }
                } else {
                  // Check if this looks like a product name part (not a number, not embalaje)
                  if (t !== 'UNIDAD' && t !== '0' && !t.match(/^\d+[.,]\d+$/) && !t.match(/^\d+$/)) {
                    nameParts.push(t);
                  }
                }
              }

              subGroup = sgParts.join(' ');
              productName = nameParts.join(' ') || productCode;
            }
          }
        }

        // Skip blank codes or codes that are actually subgroup names (start with parenthesis)
        if (!productCode || productCode.startsWith('(')) continue;

        const brand = extractBrandFromSubGroup(subGroup);
        const key = `${brand}|${productCode}|${branchName}`;

        if (stockMap.has(key)) {
          // Sum quantities for same product in same branch (different departments)
          const existing = stockMap.get(key)!;
          existing.quantity += quantity;
        } else {
          stockMap.set(key, {
            brand,
            product_code: productCode,
            product_name: productName || productCode,
            branch: branchName,
            quantity,
          });
        }
      }

      processedPages++;
      if (processedPages % 50 === 0 || processedPages === totalPages) {
        setProgress(`Procesando página ${processedPages} de ${totalPages}...`);
      }
    }

    return [...stockMap.values()];
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress('Leyendo archivo PDF...');

    try {
      const stockData = await parsePDFContent(file);

      if (stockData.length === 0) {
        toast.error('No se encontraron datos de stock en el PDF');
        setIsProcessing(false);
        return;
      }

      setProgress(`Cargando ${stockData.length} registros al sistema...`);

      // Send in batches of 500
      const batchSize = 500;
      let totalUploaded = 0;

      for (let i = 0; i < stockData.length; i += batchSize) {
        const batch = stockData.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke('transfer-operations', {
          body: {
            action: 'uploadStock',
            stockData: batch,
            uploadedBy: userId,
            fileName: file.name,
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error || 'Error al cargar lote');
        }

        totalUploaded += batch.length;
        setProgress(`Cargados ${totalUploaded} de ${stockData.length} registros...`);
      }

      setResult({ success: true, count: stockData.length });
      toast.success(`Stock actualizado: ${stockData.length} registros cargados`);
      onSuccess();
    } catch (err: any) {
      console.error('PDF parse error:', err);
      toast.error(`Error procesando PDF: ${err.message}`);
      setResult({ success: false, count: 0 });
    }

    setIsProcessing(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="border border-dashed border-border rounded-xl p-3 flex items-center gap-3">
      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-foreground">Cargar Stock desde PDF</h3>
        {isProcessing ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground truncate">{progress}</p>
          </div>
        ) : result ? (
          <div className={`flex items-center gap-1.5 mt-0.5 ${result.success ? 'text-green-600' : 'text-destructive'}`}>
            {result.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">
              {result.success ? `${result.count} registros cargados` : 'Error al procesar'}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">Reporte "Inventario de Stock" - Datapar</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        className="hidden"
        id="stock-pdf-upload"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isProcessing}
        onClick={() => fileRef.current?.click()}
        className="gap-1.5 shrink-0"
      >
        <Upload className="w-3.5 h-3.5" />
        PDF
      </Button>
    </div>
  );
};

export default StockPDFUpload;
