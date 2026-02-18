
# Plan: Modulo de Transferencias entre Sucursales

## Resumen

Agregar un nuevo modulo completo de "Transferencias entre Sucursales" a la aplicacion existente de Solicitud de Repuestos. Incluye consulta de stock, ventas historicas, solicitud de transferencias con flujo de estados, y panel admin con metricas.

---

## Fase 1: Base de Datos (6 tablas nuevas)

### Tablas a crear

| Tabla | Proposito |
|-------|-----------|
| `branch_stock` | Stock actual por item y sucursal (carga diaria) |
| `branch_sales` | Ventas historicas por item, sucursal y mes (carga diaria) |
| `stock_upload_log` | Registro de ultima carga de archivo (fecha visible) |
| `transfers` | Solicitudes de transferencia entre sucursales |
| `transfer_status_log` | Historial de cambios de estado con timestamps |
| `transfer_alerts` | Alertas por transferencias demoradas |

### Esquema detallado

```text
branch_stock:
  id (uuid PK), brand (text), product_code (text), product_name (text),
  branch (text), quantity (integer), updated_at (timestamptz)
  UNIQUE(brand, product_code, branch)

branch_sales:
  id (uuid PK), brand (text), product_code (text),
  branch (text), year_month (text, formato '2025-01'),
  quantity_sold (integer), updated_at (timestamptz)
  UNIQUE(brand, product_code, branch, year_month)

stock_upload_log:
  id (uuid PK), uploaded_by (uuid), file_name (text),
  upload_type (text: 'stock' | 'sales'), records_count (integer),
  created_at (timestamptz)

transfers:
  id (uuid PK), requester_user_id (uuid), requester_branch (text),
  source_branch (text), brand (text), product_code (text),
  product_name (text), requested_quantity (integer),
  approved_quantity (integer nullable), dispatched_quantity (integer nullable),
  received_quantity (integer nullable), priority (text: 'normal' | 'urgente'),
  observation (text nullable), status (text), created_at (timestamptz),
  updated_at (timestamptz)

transfer_status_log:
  id (uuid PK), transfer_id (uuid FK), from_status (text nullable),
  to_status (text), changed_by (uuid), changed_by_name (text),
  observation (text nullable), created_at (timestamptz)

transfer_alerts:
  id (uuid PK), transfer_id (uuid FK), alert_type (text),
  message (text), is_read (boolean), created_at (timestamptz)
```

### Politicas RLS

- `branch_stock` y `branch_sales`: SELECT para usuarios autenticados; ALL para service role (carga via edge function)
- `transfers`: SELECT para autenticados; INSERT donde requester_user_id = auth.uid(); UPDATE para usuarios cuya sucursal sea source_branch o requester_branch
- `transfer_status_log`: SELECT para autenticados; INSERT via edge function (service role)
- `transfer_alerts`: SELECT/UPDATE para autenticados
- `stock_upload_log`: SELECT para autenticados; INSERT via service role
- Habilitar realtime en `transfers` y `transfer_alerts`

---

## Fase 2: Edge Function - `transfer-operations`

Nueva edge function que manejara todas las operaciones de transferencias, similar a `admin-orders`.

### Acciones

| Accion | Descripcion |
|--------|-------------|
| `uploadStock` | Recibe datos del Excel de stock, hace upsert en `branch_stock` |
| `uploadSales` | Recibe datos del Excel de ventas, hace upsert en `branch_sales` |
| `createTransfer` | Crea solicitud + primer registro en status_log |
| `updateTransferStatus` | Cambia estado, valida transiciones, registra en status_log, calcula tiempos |
| `getTransfers` | Obtiene transferencias con filtros |
| `getStockByProduct` | Consulta stock de un producto en todas las sucursales |
| `checkDelayedTransfers` | Verifica transferencias demoradas y genera alertas |

### Flujo de estados

```text
Pendiente -> Aceptada -> Despachada -> Recibida -> Cerrada
Pendiente -> Rechazada
Pendiente -> Cancelada
Despachada -> Recibida -> Incidencia (si cantidades difieren)
Incidencia -> Cerrada (cuando se resuelve)
```

### Validaciones de transicion

- Solo la sucursal origen puede: Aceptar, Rechazar, Despachar
- Solo la sucursal destino puede: Recibir, Cancelar (antes de aceptada)
- Al Recibir: si received_quantity != dispatched_quantity -> Incidencia
- Al Recibir: si cantidades coinciden -> Cerrada automaticamente

---

## Fase 3: Componentes de Frontend

### Nuevos archivos

| Archivo | Proposito |
|---------|-----------|
| `src/pages/Transfers.tsx` | Pagina principal del modulo |
| `src/components/transfers/StockConsultView.tsx` | Vista de consulta de stock con filtros y tabla |
| `src/components/transfers/StockFilters.tsx` | Filtros adaptados (codigo, marca, sucursal, periodo ventas) |
| `src/components/transfers/StockTable.tsx` | Tabla con stock por sucursal y ventas del periodo |
| `src/components/transfers/TransferRequestModal.tsx` | Modal popup para solicitar transferencia |
| `src/components/transfers/MyTransfersView.tsx` | Vista "Mis Transferencias" (enviadas y recibidas) |
| `src/components/transfers/InTransitView.tsx` | Vista de transferencias en transito |
| `src/components/transfers/ClosedTransfersView.tsx` | Vista de transferencias cerradas |
| `src/components/transfers/TransferDetailModal.tsx` | Detalle de transferencia con timeline de estados |
| `src/components/transfers/TransferStatusActions.tsx` | Botones de accion segun estado y rol |
| `src/components/transfers/StockUpload.tsx` | Carga de archivo de stock/ventas (similar a ProductCatalogUpload) |
| `src/components/transfers/TransferAdminPanel.tsx` | Panel admin con metricas de tiempos |

### Integracion en la app existente

1. **Navegacion**: Agregar boton "Transferencias" en el `Header.tsx` junto al boton "Nuevo Pedido"
2. **Ruta**: Agregar `/transfers` en `App.tsx`
3. **ViewToggle en Transfers**: Tabs similares a los existentes (Consulta Stock | Mis Transferencias | En Transito | Cerradas)
4. **Admin**: Agregar tab "Transferencias" en el panel admin con metricas

### Vista de Consulta de Stock

- Filtros: Codigo, Marca, Sucursal (para ver stock especifico)
- Selector de periodo de ventas: 12 o 24 meses
- Indicador de "Ultima actualizacion: DD/MM/YYYY HH:mm"
- Tabla con columnas: Marca, Codigo, Nombre, y una columna por sucursal con stock
- Columna adicional: Ventas (periodo seleccionado)
- Click en fila -> abre TransferRequestModal

### TransferRequestModal

- Campos: Sucursal Origen (select), Cantidad (input), Prioridad (normal/urgente), Observacion (textarea)
- Muestra stock disponible en sucursal origen seleccionada
- Valida que cantidad <= stock disponible
- Al enviar: crea transferencia en estado "Pendiente"

### Mis Transferencias

- Dos sub-tabs: "Enviadas" (donde soy requester) y "Recibidas" (donde mi sucursal es source)
- Filtros consistentes con el resto de la app
- Acciones contextuales segun estado y rol
- Badge con conteo de pendientes de accion

### Carga de Archivos

- Componente StockUpload similar a ProductCatalogUpload existente
- Acepta Excel con estructura definida
- Para Stock: columnas Marca, Codigo, Nombre, y una columna por sucursal
- Para Ventas: columnas Marca, Codigo, Sucursal, Mes, Cantidad
- Muestra progreso y fecha de ultima carga
- Solo accesible desde Admin

### Panel Admin de Transferencias

- Metricas: Tiempo promedio de aceptacion, preparacion, transito y cierre
- Lista de transferencias demoradas (mas de X horas en un estado)
- Filtros por sucursal, estado, fechas
- Exportar a Excel

---

## Fase 4: Alertas por Demoras

- Funcion en edge function `checkDelayedTransfers` que evalua transferencias con mas de X horas en un estado
- Umbrales configurables: Pendiente > 24h, Aceptada > 48h, Despachada > 72h
- Genera registros en `transfer_alerts`
- Se puede invocar manualmente desde admin o via cron job futuro

---

## Formato de Archivos Excel

### Stock (carga diaria)
```text
| Marca | Codigo | Nombre | CAMPO 9 | ITAPUA | KATUETE | ... |
|-------|--------|--------|---------|--------|---------|-----|
| MARCA1| COD001 | Filtro | 15      | 8      | 3       | ... |
```

### Ventas (carga diaria)
```text
| Marca | Codigo | Sucursal | 2025-01 | 2025-02 | ... |
|-------|--------|----------|---------|---------|-----|
| MARCA1| COD001 | CAMPO 9  | 5       | 3       | ... |
```

---

## Orden de Implementacion

Dado el tamano de este modulo, se recomienda implementar en etapas:

1. **Etapa 1**: Tablas de base de datos + edge function basica + ruta + pagina esqueleto
2. **Etapa 2**: Carga de stock/ventas + vista de consulta de stock
3. **Etapa 3**: Solicitud de transferencia + flujo de estados
4. **Etapa 4**: Vistas de Mis Transferencias, En Transito, Cerradas
5. **Etapa 5**: Panel Admin con metricas + alertas

Cada etapa es funcional por si sola y se puede probar independientemente.

---

## Resumen de Cambios por Archivo

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | 6 tablas nuevas + RLS + realtime |
| `supabase/functions/transfer-operations/index.ts` | Nueva edge function |
| `supabase/config.toml` | (automatico) |
| `src/App.tsx` | Agregar ruta `/transfers` |
| `src/pages/Transfers.tsx` | Pagina principal nueva |
| `src/components/Header.tsx` | Agregar boton "Transferencias" |
| `src/components/transfers/*.tsx` | ~12 componentes nuevos |
| `src/pages/Admin.tsx` | Agregar tab de Transferencias |
| `src/constants/transferStatuses.ts` | Constantes de estados |

