
# Plan: Agregar Precio Terrestre al Catálogo de Productos

## Resumen del Cambio
Se necesita agregar una nueva columna `price_terrestre` a la tabla de productos y actualizar toda la lógica de cálculo de precios para que el método de envío "Terrestre" use este nuevo precio en lugar del precio "Aéreo". También se debe actualizar el manejo especial de CLAAS-ARG y los componentes de carga/descarga del catálogo.

---

## Cambios Identificados

### 1. Base de Datos
Nueva columna en la tabla `products`:

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| `price_terrestre` | numeric | No | 0 |

---

### 2. Archivos a Modificar

| Archivo | Descripción del Cambio |
|---------|------------------------|
| `src/components/ProductCatalogUpload.tsx` | Agregar columna TERRESTRE al parsing del Excel (columna 5) y al export |
| `src/components/ProductFormModal.tsx` | Agregar campo `price_terrestre` al formulario de alta manual |
| `src/components/OrderForm.tsx` | Actualizar lógica para obtener precio según shipping method |
| `src/components/OrderEditModal.tsx` | Agregar `price_terrestre` a la query de productos |
| `src/components/OrdersTable.tsx` | Actualizar cálculo de precio en export Excel |
| `supabase/functions/admin-orders/index.ts` | Actualizar getOrders y updateShippingMethod para usar `price_terrestre` |

---

### 3. Lógica de Precios Actualizada

Actualmente:
```text
aereo → price_aereo
maritimo → price_maritimo
terrestre → price_aereo (incorrecto)
```

Nueva lógica:
```text
aereo → price_aereo
maritimo → price_maritimo
terrestre → price_terrestre
```

---

### 4. Formato del Excel del Catálogo

**Estructura esperada del archivo Excel (6 columnas):**

| Columna | Nombre |
|---------|--------|
| A | Marca |
| B | Código |
| C | Nombre |
| D | AEREO |
| E | MARITIMO |
| F | TERRESTRE |

---

## Detalles Técnicos

### Migración SQL
```sql
ALTER TABLE public.products 
ADD COLUMN price_terrestre numeric NOT NULL DEFAULT 0;
```

### ProductCatalogUpload.tsx
- Actualizar interface `Product` para incluir `price_terrestre`
- Modificar `parseExcel()` para leer columna 5 (TERRESTRE)
- Actualizar `handleDownloadCatalog()` para incluir columna TERRESTRE en el export
- Ajustar validación de precios faltantes

### ProductFormModal.tsx
- Agregar campo `price_terrestre` al schema zod
- Agregar input para Precio Terrestre en el formulario
- Incluir `price_terrestre` en insert/update

### OrderForm.tsx
- Modificar query de productos: `select('name, price_aereo, price_maritimo, price_terrestre')`
- Actualizar lógica de `setProductPrice()` para usar precio según `shippingMethod`
- Recalcular precio cuando cambia el método de envío

### OrderEditModal.tsx
- Agregar `price_terrestre` a la query de productos

### OrdersTable.tsx
- Actualizar cálculo de `unitPrice` en `exportToExcel()`:
```typescript
const unitPrice = order.shipping_method === 'maritimo' 
  ? (product?.price_maritimo || 0) 
  : order.shipping_method === 'terrestre'
    ? (product?.price_terrestre || 0)
    : (product?.price_aereo || 0);
```

### admin-orders/index.ts
- Actualizar `getOrders`: agregar `price_terrestre` a la query y al `priceMap`
- Actualizar cálculo de `unitPrice` para usar lógica de 3 precios
- Actualizar `updateShippingMethod`: incluir `price_terrestre` y ajustar cálculo

---

## Caso Especial: CLAAS-ARG

Los productos de CLAAS-ARG que no están en el catálogo ya se manejan con precio $0. Este comportamiento se mantiene sin cambios, ya que el precio terrestre también será $0 para productos no catalogados.

---

## Flujo de Trabajo para el Usuario

1. Descargar el catálogo actual (tendrá 5 columnas)
2. Agregar la columna TERRESTRE con los precios correspondientes
3. Subir el nuevo catálogo de 6 columnas
4. Los precios se aplicarán automáticamente según el método de envío seleccionado

---

## Impacto
- Pedidos existentes: Sin cambio (continuarán usando los precios calculados al momento de creación)
- Nuevos pedidos: Usarán el precio correcto según el método de envío
- Exportaciones: Mostrarán el precio correcto según el shipping method del pedido

