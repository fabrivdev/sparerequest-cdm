
# Plan: Facturación Masiva y Mejoras en Vista de Entregados

## Resumen
Agregar funcionalidad de selección múltiple y facturación masiva para pedidos entregados, mostrar la observación del pedido, y añadir un panel de filtros a la sección de entregados.

---

## Cambios a Implementar

### 1. Agregar Panel de Filtros a Pedidos Entregados

**Archivo:** `src/components/DeliveredOrdersView.tsx`

- Crear un componente de filtros específico para entregados (más simple que OrderFilters) con:
  - Filtro por fecha de entrega (desde/hasta)
  - Filtro por marca (dropdown desde providers)
  - Filtro por código de producto (búsqueda texto)
  - Filtro por estado de facturación (Todos, Pendiente, Facturado, N/A)
  - Filtro por observación (búsqueda texto)

---

### 2. Agregar Columna de Observación a la Tabla

**Archivo:** `src/components/DeliveredOrdersView.tsx`

- Agregar columna "Observación" en la tabla entre "Destino" y "Facturado"
- Mostrar texto truncado con Tooltip para observaciones largas (igual que en AdminDeliveredView)
- Esto permite al usuario ver a qué cliente va el pedido

---

### 3. Implementar Selección Múltiple de Pedidos

**Archivo:** `src/components/DeliveredOrdersView.tsx`

- Agregar estado `selectedOrders: string[]` para gestionar los pedidos seleccionados
- Agregar checkboxes en cada fila (como en OrdersTable)
- Agregar checkbox "seleccionar todos" en el header
- Solo permitir seleccionar pedidos que no sean "stock only" (ya que esos no requieren facturación)

---

### 4. Crear Barra de Acciones Masivas para Facturación

**Archivo nuevo:** `src/components/BulkInvoiceBar.tsx`

Crear una barra de acciones similar a BulkActionsBar pero específica para facturación:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 5 pedidos seleccionados   [X Deseleccionar]                         │
│                                                                     │
│ ¿Facturado?  [Sí] [No]                                             │
│                                                                     │
│ [Si "Sí"]:  Nro. Factura: [__________]  Cant. total: [info]        │
│                                                                     │
│ [Si "No"]:  Motivo: [__________________________]                   │
│                                                                     │
│                                          [Confirmar Facturación]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- Toggle Sí/No para facturación
- Si "Sí": campo obligatorio para número de factura (se aplicará a todos los seleccionados)
- Si "No": campo obligatorio para motivo de no facturación
- Mostrar resumen de cantidad total de ítems a facturar
- Al confirmar, actualizar todos los pedidos seleccionados con el mismo número de factura

---

### 5. Actualizar DeliveredOrdersView para Integrar Todo

**Archivo:** `src/components/DeliveredOrdersView.tsx`

Cambios principales:

1. **Importar** nuevos componentes (BulkInvoiceBar, Checkbox, filtros)

2. **Nuevo estado:**
   ```typescript
   // Selección múltiple
   const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
   
   // Filtros
   const [filters, setFilters] = useState({
     dateFrom: undefined,
     dateTo: undefined,
     brand: '',
     productCode: '',
     invoiceStatus: '', // 'pending', 'invoiced', 'na'
     observation: '',
   });
   ```

3. **Función de facturación masiva:**
   ```typescript
   const handleBulkInvoice = async (data: {
     invoiceChoice: 'yes' | 'no';
     invoiceNumber?: string;
     notInvoicedReason?: string;
   }) => {
     // Actualizar todos los pedidos seleccionados en la BD
     // Limpiar selección al completar
   };
   ```

4. **Renderizado actualizado:**
   - Mostrar panel de filtros arriba de la tabla
   - Mostrar BulkInvoiceBar cuando hay selección
   - Agregar checkboxes en cada fila
   - Agregar columna de observación

---

## Detalles Técnicos

### Estructura de Filtros para Entregados

```typescript
interface DeliveredFiltersState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  brand: string;
  productCode: string;
  invoiceStatus: '' | 'pending' | 'invoiced' | 'na';
  observation: string;
}
```

### Lógica de Facturación Masiva

```typescript
const handleBulkInvoice = async (data) => {
  const updateData = data.invoiceChoice === 'yes'
    ? {
        is_invoiced: true,
        invoice_number: data.invoiceNumber,
        // invoiced_quantity se calculará por pedido (igual a quantity)
        not_invoiced_reason: null,
      }
    : {
        is_invoiced: false,
        invoice_number: null,
        invoiced_quantity: null,
        not_invoiced_reason: data.notInvoicedReason,
      };

  // Actualizar cada pedido seleccionado
  for (const orderId of selectedOrders) {
    const order = deliveredOrders.find(o => o.id === orderId);
    await supabase.from('orders').update({
      ...updateData,
      invoiced_quantity: data.invoiceChoice === 'yes' ? order.quantity : null,
    }).eq('id', orderId);
  }
};
```

### Restricciones de Selección

- Solo se pueden seleccionar pedidos donde `order_destination !== 'stock'`
- Los pedidos "stock" muestran el checkbox deshabilitado o sin checkbox
- Esto evita intentar facturar pedidos que no lo requieren

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/DeliveredOrdersView.tsx` | Agregar filtros, selección múltiple, columna observación, integrar barra de acciones |
| `src/components/BulkInvoiceBar.tsx` | **NUEVO** - Componente para acciones masivas de facturación |

---

## Flujo de Usuario

1. Usuario navega a "Pedidos Entregados"
2. Ve un panel de filtros para buscar pedidos específicos
3. Puede filtrar por fecha, marca, código, estado de facturación, observación
4. Marca uno o varios pedidos con checkboxes
5. Aparece la barra de acciones masivas
6. Selecciona "Sí" para facturar
7. Ingresa el número de factura común
8. Confirma y todos los pedidos se actualizan con ese número
