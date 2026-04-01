

## Consulta de Precios dentro de Compras

### Qué se hará
Agregar una nueva vista "Precios" en el módulo de Compras (Dashboard) donde los usuarios puedan buscar cualquier producto por código, nombre o marca y ver sus tres niveles de precio (Aéreo, Marítimo, Terrestre).

### Cambios

**1. `src/components/ViewToggle.tsx`** — Agregar pestaña "Precios"
- Extender el tipo de vista para incluir `'prices'`
- Agregar un botón "Precios" con ícono de etiqueta/precio al final del toggle

**2. Nuevo archivo `src/components/PriceConsultView.tsx`** — Vista de consulta de precios
- Campo de búsqueda que filtra en tiempo real por código, nombre o marca desde la tabla `products`
- Tabla con columnas: Marca, Código, Nombre, Precio Aéreo, Precio Marítimo, Precio Terrestre
- Formateo de precios con separador de miles
- Estado vacío cuando no hay resultados
- Consulta directa a la tabla `products` (ya tiene RLS público para SELECT)

**3. `src/pages/Dashboard.tsx`** — Integrar la nueva vista
- Extender el tipo de `view` para incluir `'prices'`
- Renderizar `PriceConsultView` cuando `view === 'prices'`
- Ocultar botones de "Nuevo Pedido" y "Excel" en esta vista

