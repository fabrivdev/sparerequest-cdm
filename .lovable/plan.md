
# Plan: Mejoras en la Gestión de Pedidos

## Resumen de Cambios Solicitados

1. **Mostrar Nro. Pedido en "Mis Pedidos"** - No solo en Entregados
2. **Validar cantidad facturada** - No puede superar la cantidad pedida
3. **Nuevo campo "Destino del pedido"** al crear - Cliente, Stock, o Ambos
4. **Lógica de facturación inteligente**:
   - Si destino = "Stock" -> se marca automáticamente como facturado
   - Si destino = "Cliente" o "Ambos" -> mostrar icono de alerta (!) hasta que se complete la facturación

---

## Cambios en Base de Datos

### Migración SQL
```sql
-- Agregar columna para tipo de destino del pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_destination text 
NOT NULL DEFAULT 'cliente'
CHECK (order_destination IN ('cliente', 'stock', 'ambos'));
```

---

## Arquitectura de Cambios

### 1. Mostrar Número de Pedido en Vista de Usuario

**Archivo:** `src/components/OrdersTable.tsx`

Cambios:
- Agregar columna "Nro. Pedido" en la vista de usuario (no admin)
- Mostrar el valor de `order_number` cuando exista, o "-" si no
- Agregar la columna en la vista móvil también

**Ubicación en el código:**
- Línea ~376: Agregar `<TableHead>` para "Nro. Pedido" (cuando `!isAdmin`)
- Agregar la celda correspondiente en el body de la tabla

---

### 2. Validación de Cantidad Facturada

**Archivo:** `src/components/DeliveredOrdersView.tsx`

Cambios en `handleSaveInvoice`:
- Validar que `invoicedQuantity` no sea mayor que `order.quantity`
- Mostrar mensaje de error si se excede

```typescript
if (modalData.isInvoiced) {
  const qty = parseInt(modalData.invoicedQuantity) || 0;
  if (qty > modalData.order.quantity) {
    toast.error(`La cantidad facturada no puede superar ${modalData.order.quantity}`);
    return;
  }
}
```

---

### 3. Nuevo Campo "Destino del Pedido" en OrderForm

**Archivo:** `src/components/OrderForm.tsx`

Cambios:
- Agregar estado `orderDestination` con valores: `'cliente' | 'stock' | 'ambos'`
- Agregar selector visual con 3 botones (similar al método de envío)
- Incluir iconos: `User` (Cliente), `Warehouse` (Stock), `Users` (Ambos)
- Actualizar la interfaz `OrderFormProps` para incluir el nuevo campo
- Actualizar el schema de validación

Diseño visual (3 botones):
| Cliente | Stock | Ambos |
|---------|-------|-------|
| Usuario | Almacén | Ambos iconos |

---

### 4. Actualizar Dashboard para Pasar el Nuevo Campo

**Archivo:** `src/pages/Dashboard.tsx`

Cambios en `handleCreateOrder`:
- Incluir `orderDestination` en el insert a la base de datos

---

### 5. Lógica de Facturación Automática para Stock

**Archivo:** `src/components/DeliveredOrdersView.tsx`

Cambios:
- Agregar lógica para determinar si necesita facturación:
  - `order_destination = 'stock'` -> automáticamente "facturado" (sin necesidad de acción)
  - `order_destination = 'cliente' | 'ambos'` -> requiere que el usuario complete la facturación

Indicador visual:
- Si `order_destination` es 'cliente' o 'ambos' Y `is_invoiced` es false:
  - Mostrar icono `AlertTriangle` (!) en amarillo junto a "No" en columna Facturado
- Si `order_destination` es 'stock':
  - Mostrar Badge "N/A" o "Stock" en gris (no requiere facturación)

---

### 6. Actualizar Tipo Order

**Archivo:** `src/components/OrdersTable.tsx` (interfaz Order)

Agregar:
```typescript
order_destination?: 'cliente' | 'stock' | 'ambos';
```

---

### 7. Mostrar Destino en Vista de Entregados

**Archivo:** `src/components/DeliveredOrdersView.tsx`

- Agregar columna "Destino" que muestre Cliente/Stock/Ambos
- Usar badges con colores distintivos:
  - Cliente: Azul
  - Stock: Verde
  - Ambos: Púrpura

---

### 8. Actualizar Modal de Detalle de Pedido

**Archivo:** `src/components/OrderDetailModal.tsx`

- Mostrar el campo "Nro. Pedido" cuando exista
- Mostrar el campo "Destino" (Cliente/Stock/Ambos)

---

## Flujo de Usuario Actualizado

```text
CREAR PEDIDO:
Usuario → Selecciona Marca, Código, Cantidad, Sucursal, Envío
       → Nuevo: Selecciona Destino (Cliente/Stock/Ambos)
       → Guarda pedido

VER MIS PEDIDOS:
Usuario → Ve tabla con nueva columna "Nro. Pedido" (solo lectura)
       → Puede ver el número asignado por admin

PEDIDOS ENTREGADOS:
Si Destino = Stock:
  → Se muestra como "N/A" en facturación (no requiere acción)
  
Si Destino = Cliente o Ambos:
  → Si is_invoiced = false: Icono de alerta (!) amarillo
  → Usuario debe completar datos de factura
  → Validación: cantidad facturada <= cantidad pedida
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/OrderForm.tsx` | Agregar selector de destino (Cliente/Stock/Ambos) |
| `src/components/OrdersTable.tsx` | Mostrar columna "Nro. Pedido" para usuarios |
| `src/components/DeliveredOrdersView.tsx` | Validar cantidad, lógica stock vs cliente, icono alerta |
| `src/components/OrderDetailModal.tsx` | Mostrar Nro. Pedido y Destino |
| `src/components/OrderEditModal.tsx` | Agregar edición del campo Destino |
| `src/pages/Dashboard.tsx` | Pasar orderDestination al crear pedido |

---

## Constantes de Destino

```typescript
const ORDER_DESTINATIONS = [
  { value: 'cliente', label: 'Cliente', icon: User, color: 'blue-500' },
  { value: 'stock', label: 'Stock', icon: Warehouse, color: 'green-500' },
  { value: 'ambos', label: 'Ambos', icon: Users, color: 'purple-500' },
];
```

---

## Resumen Visual

### Vista "Mis Pedidos" - Nueva columna

| Fecha | Marca | Código | Cant. | Sucursal | Estado | **Nro. Pedido** | Actualización |
|-------|-------|--------|-------|----------|--------|-----------------|---------------|

### Vista "Entregados" - Indicadores

| Entrega | Nro. Pedido | Marca | Código | Cant. | **Destino** | Facturado | Nro. Factura |
|---------|-------------|-------|--------|-------|-------------|-----------|--------------|
| 25/01   | ORD-001     | CLAAS | ABC    | 10    | Cliente     | ⚠️ No     | -            |
| 24/01   | ORD-002     | HORSCH| XYZ    | 5     | Stock       | N/A       | -            |

### Formulario Nuevo Pedido - Nuevo campo

```
┌──────────────────────────────────────────┐
│  Destino del Pedido *                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 👤       │ │ 🏭       │ │ 👥       │ │
│  │ Cliente  │ │ Stock    │ │ Ambos    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────────────────┘
```

