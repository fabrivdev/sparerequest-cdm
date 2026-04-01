

## Optimizar consulta de precios: filtrado server-side por marca

### Problema
Con 300k+ productos, cargar todo en memoria es inviable. Las marcas no aparecen hasta que termina la carga completa, impidiendo filtrar rápidamente.

### Solución
Cambiar a un enfoque **server-side**: cargar las marcas por separado con una query `SELECT DISTINCT brand`, y cargar productos solo cuando el usuario selecciona una marca o escribe una búsqueda. No cargar todos los productos al inicio.

### Cambios en `src/components/PriceConsultView.tsx`

**1. Cargar marcas inmediatamente con query separada**
- `SELECT DISTINCT brand FROM products ORDER BY brand` — aparecen al instante
- Eliminar la carga masiva inicial de todos los productos

**2. Filtrado server-side**
- Cuando el usuario selecciona una marca, hacer query filtrada: `.eq('brand', brand)`
- Cuando escribe en búsqueda, aplicar filtros server-side con `.ilike()` / `.eq()` según el modo
- Usar paginación server-side con `.range()` en vez de paginar en memoria
- Agregar debounce de ~400ms al campo de búsqueda para no hacer queries en cada tecla

**3. Paginación server-side**
- Usar `.range((page-1)*200, page*200-1)` directamente en la query
- Obtener el count total con `.select('*', { count: 'exact', head: true })` para calcular páginas
- Eliminar el filtrado y paginación en memoria

**4. Flujo de usuario**
- Al entrar: se ven los botones de marca inmediatamente, tabla vacía con mensaje "Seleccioná una marca o buscá un código"
- Al seleccionar marca o buscar: se cargan solo los productos que coinciden, paginados desde el servidor

### Archivo editado
- `src/components/PriceConsultView.tsx`

