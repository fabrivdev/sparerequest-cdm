

## Plan: Corregir consulta de stock y fecha de actualización

### Problema 1: Solo se ven 488 productos (de 14,571 únicos)

La consulta al backend tiene un limite implícito de 1000 filas. Con 32,915 registros en la tabla `branch_stock`, solo llegan ~1000 filas al frontend, que al agruparse generan ~488 productos.

**Solución**: Modificar la acción `getStock` en la función backend para paginar y devolver TODOS los registros usando `.range()` en un loop interno.

### Problema 2: La fecha de actualización no se actualiza al subir desde admin

El `stock_upload_log` solo registra cargas hechas desde el componente `StockPDFUpload`. Si el admin tiene un flujo diferente de carga, o si la carga falló silenciosamente, no se genera un nuevo log. Además, la consulta `getStock` solo busca el upload más reciente de tipo 'stock'.

**Solución**: Cambiar la fuente de la fecha de actualización para usar directamente el `MAX(updated_at)` de la tabla `branch_stock`, que siempre refleja la última modificación real de datos.

---

### Cambios técnicos

#### 1. Edge Function `transfer-operations/index.ts` - acción `getStock`

Reemplazar la consulta simple por un loop que traiga todos los registros en lotes de 1000:

```text
// Pseudocódigo
let allData = [];
let offset = 0;
while (true) {
  const batch = query.range(offset, offset + 999);
  allData.push(...batch);
  if (batch.length < 1000) break;
  offset += 1000;
}
```

Para la fecha de actualización, reemplazar la consulta a `stock_upload_log` por:

```sql
SELECT MAX(updated_at) as last_update FROM branch_stock
```

Esto se hará usando `.select('updated_at').order('updated_at', { ascending: false }).limit(1)` sobre `branch_stock`.

#### 2. No se requieren cambios en el frontend

El componente `StockConsultView.tsx` ya maneja correctamente la agrupación, paginación visual (100 por página) y ordenamiento. Solo necesita recibir todos los datos desde el backend.

