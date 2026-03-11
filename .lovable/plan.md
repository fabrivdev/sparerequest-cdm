

## Problema

Cuando un usuario marca un pedido entregado como "No facturado" e indica el motivo (`not_invoiced_reason`), ese pedido sigue contando como "pendiente" en el badge y el banner. Actualmente, solo los pedidos marcados como `is_invoiced = true` o con destino `stock` dejan de ser "pendientes". Falta considerar el caso donde el usuario ya respondió que NO se facturó.

## Solución

Introducir el concepto de **"respondido"**: un pedido está respondido si `is_invoiced = true` **O** si `not_invoiced_reason` tiene un valor (el usuario ya explicó por qué no se facturó). Solo los pedidos **sin responder** deben aparecer como pendientes.

## Cambios

### 1. `src/pages/Dashboard.tsx` — Actualizar `pendingInvoiceCount`

Cambiar la condición de:
```
!o.is_invoiced
```
a:
```
!o.is_invoiced && !o.not_invoiced_reason
```

### 2. `src/components/DeliveredOrdersView.tsx` — Filtro y lógica visual

- Actualizar `isInvoiced` o agregar un concepto `isResponded` que sea `is_invoiced || !!not_invoiced_reason`.
- El filtro `invoiceStatus === 'pending'` debe excluir pedidos que tengan `not_invoiced_reason`.
- Agregar un tercer estado visual en la tabla: además de "Facturado" (verde) y "Pendiente" (amarillo), mostrar **"No facturado"** (naranja/rojo) para los que tienen motivo pero no están facturados.

### 3. `src/components/AdminDeliveredView.tsx` — Misma lógica en stats del admin

- Actualizar `needsInvoicing` para excluir pedidos con `not_invoiced_reason`.
- Agregar un stat o badge para "No facturado (respondido)".

### 4. `src/components/DeliveredFilters.tsx` — Agregar opción de filtro

Agregar una cuarta opción al filtro `invoiceStatus`: `'not_invoiced'` con label "No facturado" para filtrar específicamente los que fueron respondidos como no facturados.

