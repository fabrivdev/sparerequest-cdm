
# Plan de Implementación: Nuevas Funcionalidades del Sistema de Pedidos

## Resumen de los Cambios Solicitados

1. **Agregar opción de envío terrestre** con icono de camión
2. **Adaptar todos los informes** a este nuevo dato
3. **Agregar configuración de admin** para proveedores (ej: CLAAS-ARG)
4. **Agregar dos nuevos estados**: "Pte. de envío" y "Cancelado"
5. **Actualizar flujo de estados**: Solicitado → Pte. de envío → Entregado (Cancelado desde cualquier estado)
6. **Mostrar número de pedido a usuarios** una vez asignado por admin
7. **Vista de pedidos entregados** con opción de facturación para usuarios

---

## Cambios en Base de Datos

### Migración SQL
```sql
-- 1. Agregar columnas de facturación a la tabla orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invoiced boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoiced_quantity integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_observation text;

-- 2. Crear tabla de configuración de proveedores
CREATE TABLE IF NOT EXISTS providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#888888',
  text_color text NOT NULL DEFAULT 'text-white',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insertar proveedores existentes
INSERT INTO providers (name, color, text_color) VALUES 
  ('CLAAS', '#B4C618', 'text-black'),
  ('HORSCH', '#A01B1B', 'text-white')
ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS en providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos los usuarios autenticados
CREATE POLICY "Authenticated users can view providers" ON providers
FOR SELECT USING (true);

-- Política para admin (via service role)
CREATE POLICY "Service role can manage providers" ON providers
FOR ALL USING (true) WITH CHECK (true);
```

---

## Arquitectura de Cambios

### 1. Nuevo Método de Envío: Terrestre

**Archivos a modificar:**
- `src/components/OrderForm.tsx` - Agregar botón "Terrestre" con icono de camión
- `src/components/OrdersTable.tsx` - Mostrar icono de camión para envío terrestre
- `src/components/OrderEditModal.tsx` - Incluir opción terrestre en edición
- `src/components/BulkActionsBar.tsx` - Agregar opción de envío terrestre en acciones masivas
- `src/components/AdminDashboard.tsx` - Agregar estadísticas de envío terrestre
- `supabase/functions/admin-orders/index.ts` - Validar nuevo método de envío

**Cambios visuales:**
- Usar icono `Truck` de lucide-react
- Color: Naranja (#F97316) para diferenciarlo de aéreo (azul) y marítimo (cian)

### 2. Nuevos Estados del Pedido

**Estados actuales:** `pending` → `solicitado` → `entregado`

**Estados nuevos:** 
- `pending` (Pendiente)
- `solicitado` (Solicitado)
- `pte_envio` (Pte. de envío) - NUEVO
- `entregado` (Entregado)
- `cancelado` (Cancelado) - NUEVO

**Flujo:**
```text
pending → solicitado → pte_envio → entregado
           ↓            ↓           ↓
        cancelado    cancelado   cancelado
```

**Archivos a modificar:**
- `src/components/OrdersTable.tsx` - Agregar colores para nuevos estados
- `src/components/OrderFilters.tsx` - Agregar filtros para nuevos estados
- `src/components/BulkActionsBar.tsx` - Agregar opciones de estado
- `src/components/OrderDetailModal.tsx` - Mostrar nuevos estados
- `src/pages/Admin.tsx` - Actualizar estadísticas con nuevos estados
- `supabase/functions/admin-orders/index.ts` - Validar transiciones de estado

**Colores propuestos:**
- `pte_envio`: Azul (bg-blue-500/10 text-blue-600)
- `cancelado`: Gris (bg-gray-500/10 text-gray-600)

### 3. Panel de Configuración Admin

**Nuevo componente:** `src/components/AdminSettings.tsx`

**Funcionalidades:**
- CRUD de proveedores (agregar, editar, eliminar)
- Cada proveedor tiene: nombre, color, color de texto, estado activo

**Integración:**
- Nueva pestaña "Configuración" en Admin.tsx
- Los proveedores se cargan dinámicamente en OrderForm y OrdersTable

**Edge function updates:**
- Agregar acciones: `getProviders`, `createProvider`, `updateProvider`, `deleteProvider`

### 4. Mostrar Número de Pedido a Usuarios

**Archivos a modificar:**
- `src/components/OrdersTable.tsx` - Agregar columna "Nro. Pedido" para usuarios (solo lectura)
- `src/components/OrderDetailModal.tsx` - Mostrar número de pedido en modal de detalle

### 5. Vista de Pedidos Entregados con Facturación

**Nuevo componente:** `src/components/DeliveredOrdersView.tsx`

**Funcionalidades:**
- Tabla de pedidos con status `entregado`
- Checkbox "¿Facturado al cliente?"
- Campos condicionales: número de factura, cantidad facturada, observación
- Botón guardar cambios de facturación

**Integración en Dashboard:**
- Nueva opción en ViewToggle: "Entregados"
- Filtro automático para mostrar solo pedidos entregados

**Edge function updates:**
- Nueva acción: `updateInvoiceInfo` - Para guardar datos de facturación

---

## Detalles Técnicos

### Constantes de Estados
```typescript
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'solicitado', label: 'Solicitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'pte_envio', label: 'Pte. de envío', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
];
```

### Constantes de Métodos de Envío
```typescript
const SHIPPING_METHODS = [
  { value: 'aereo', label: 'Aéreo', icon: Plane, color: 'blue-500' },
  { value: 'maritimo', label: 'Marítimo', icon: Ship, color: 'cyan-600' },
  { value: 'terrestre', label: 'Terrestre', icon: Truck, color: 'orange-500' },
];
```

### Interface de Facturación
```typescript
interface InvoiceData {
  is_invoiced: boolean;
  invoice_number: string | null;
  invoiced_quantity: number | null;
  invoice_observation: string | null;
}
```

---

## Orden de Implementación

1. **Fase 1: Base de Datos**
   - Ejecutar migración SQL para nuevas columnas y tabla de proveedores

2. **Fase 2: Envío Terrestre**
   - Actualizar OrderForm, OrdersTable, OrderEditModal
   - Actualizar BulkActionsBar y AdminDashboard
   - Actualizar edge function

3. **Fase 3: Nuevos Estados**
   - Actualizar todas las constantes de estado
   - Modificar validaciones de transición en edge function
   - Actualizar UI en todos los componentes afectados

4. **Fase 4: Configuración de Proveedores**
   - Crear AdminSettings component
   - Agregar acciones en edge function
   - Integrar en Admin.tsx

5. **Fase 5: Número de Pedido para Usuarios**
   - Actualizar OrdersTable para mostrar columna
   - Actualizar OrderDetailModal

6. **Fase 6: Vista de Facturación**
   - Crear DeliveredOrdersView component
   - Agregar nueva vista en Dashboard
   - Implementar lógica de guardado de facturación

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/AdminSettings.tsx` | Panel de configuración para proveedores |
| `src/components/DeliveredOrdersView.tsx` | Vista de pedidos entregados con facturación |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/OrderForm.tsx` | Agregar envío terrestre, cargar proveedores dinámicos |
| `src/components/OrdersTable.tsx` | Nuevos estados, icono terrestre, columna nro pedido |
| `src/components/OrderEditModal.tsx` | Agregar opción terrestre |
| `src/components/OrderFilters.tsx` | Agregar filtros para nuevos estados |
| `src/components/OrderDetailModal.tsx` | Mostrar nuevos estados y nro pedido |
| `src/components/BulkActionsBar.tsx` | Nuevos estados y envío terrestre |
| `src/components/AdminDashboard.tsx` | Estadísticas de terrestre y nuevos estados |
| `src/pages/Admin.tsx` | Nueva pestaña configuración, stats nuevos estados |
| `src/pages/Dashboard.tsx` | Nueva vista "Entregados" |
| `supabase/functions/admin-orders/index.ts` | Nuevas acciones y validaciones |
