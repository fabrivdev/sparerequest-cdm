

## Problema Real

El `.range(0, 10000)` **no supera el límite `max-rows` del servidor PostgREST** de Supabase, que por defecto es **1000 filas**. Por eso, sin importar cuántas veces se redepliegue la función, siempre devuelve exactamente 1000 registros.

## Solución

Implementar **paginación** en la edge function `admin-orders` para el action `getOrders`: hacer múltiples queries de 1000 filas y concatenar los resultados hasta obtener todos los registros.

## Cambios

### 1. Edge function `supabase/functions/admin-orders/index.ts`

Reemplazar la query única con un loop de paginación:

```text
Query actual:
  supabase.from('orders').select('*').order(...).range(0, 10000)

Query nueva (pseudocódigo):
  let allOrders = []
  let page = 0
  const PAGE_SIZE = 1000
  loop:
    fetch .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    append results to allOrders
    if results.length < PAGE_SIZE → break
    page++
```

Luego continuar con el procesamiento de precios y usuarios como está actualmente.

### 2. Frontend `src/pages/Dashboard.tsx`

Aplicar la misma paginación en las queries directas del dashboard (`fetchOrders` y `fetchBranchOrders`) que también usan `.range(0, 10000)` y sufren el mismo límite.

### 3. `src/components/DeliveredOrdersView.tsx`

Misma corrección de paginación.

## Por qué las soluciones anteriores no funcionaron

`.range(0, 10000)` solo establece el header HTTP `Range`, pero el servidor PostgREST respeta su configuración `max-rows = 1000` y trunca la respuesta. La única forma de obtener más de 1000 filas es paginar.

