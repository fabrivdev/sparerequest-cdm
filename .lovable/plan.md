

## Plan: Busqueda por codigo y nombre con filtrado en tiempo real

### Resumen
Convertir el buscador de stock para que filtre tanto por codigo como por nombre de producto, y que los resultados se actualicen automaticamente mientras el usuario escribe (sin necesidad de presionar el boton "Buscar").

---

### Cambios en StockConsultView.tsx

**1. Renombrar el estado y placeholder**
- Renombrar `searchCode` a `searchTerm` para reflejar que busca por codigo y nombre
- Cambiar el placeholder a "Buscar por codigo o nombre..."

**2. Filtrado local en tiempo real**
- Al cargar la pagina se traen todos los productos (esto ya ocurre)
- Agregar un `useMemo` que filtre `products` comparando `searchTerm` contra `product_code` y `product_name` (case-insensitive, con `includes`)
- Este filtro se aplica ANTES del ordenamiento y paginacion, asi los resultados se actualizan instantaneamente al escribir
- Resetear la pagina a 1 cada vez que cambia el texto de busqueda

**3. Boton "Buscar" se convierte en "Recargar"**
- El boton ya no envia el texto al backend, solo recarga todo el stock fresco
- Se cambia el icono a `RefreshCw` y el texto a "Recargar"

**4. Quitar el filtro server-side por productCode**
- La llamada a `fetchStock` ya no envia `productCode` al backend; siempre trae todo el inventario
- El filtrado queda 100% del lado del cliente para respuesta instantanea

**5. Mensaje vacio actualizado**
- Cambiar "Intenta buscar por codigo" a "No se encontraron resultados para tu busqueda"

---

### Seccion tecnica

```text
Estado:
  searchCode -> searchTerm

Filtrado (nuevo useMemo):
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.product_code.toLowerCase().includes(term) ||
      p.product_name.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

Flujo:
  products -> filteredProducts -> sortedProducts -> paginatedProducts

fetchStock:
  body: { action: 'getStock', offset, limit }  (sin productCode)

Reset pagina al escribir:
  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
```

No se requieren cambios en la base de datos ni en el backend.

