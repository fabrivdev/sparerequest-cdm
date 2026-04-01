

## Mejoras a la vista de Consulta de Precios

### Cambios en `src/components/PriceConsultView.tsx`

**1. Selector de modo de búsqueda**
- Agregar un `Select` junto al campo de búsqueda con 4 opciones: "Contiene" (default), "Empieza con", "Termina con", "Es igual a"
- La lógica de filtrado usará `includes`, `startsWith`, `endsWith` o `===` según la opción seleccionada

**2. Filtro de marca por botones**
- Extraer marcas únicas de los productos cargados
- Renderizar botones tipo chip/toggle para cada marca (+ un botón "Todas")
- Al seleccionar una marca, se filtra la lista; se puede combinar con la búsqueda de texto

**3. Paginación con límite de 200 items por página**
- Paginar los resultados filtrados en bloques de 200
- Agregar controles de navegación (anterior/siguiente + número de página) usando los componentes `Pagination` existentes
- Resetear a página 1 cuando cambian los filtros

**4. Fetch con paginación manual (>1000 productos)**
- Aplicar la misma estrategia de fetch en batches de 1000 que ya usa el proyecto, para no truncar la tabla `products`

### Archivo editado
- `src/components/PriceConsultView.tsx`

