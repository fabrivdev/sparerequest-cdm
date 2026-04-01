

## Carga progresiva de productos

### Problema
Actualmente se espera a cargar TODOS los productos antes de mostrar algo. Con miles de registros, el usuario ve "Cargando productos..." durante varios segundos.

### Solución
Aplicar el mismo patrón de carga progresiva que ya usa la tabla de stock: mostrar los primeros resultados de inmediato mientras se siguen cargando lotes en segundo plano.

### Cambios en `src/components/PriceConsultView.tsx`

1. **Agregar estado `loadingMore`** para distinguir entre carga inicial y carga en segundo plano
2. **Actualizar `setProducts` después de cada batch** en lugar de acumular todo en una variable local y setear al final
3. **Poner `setLoading(false)` después del primer batch** para que la tabla se renderice de inmediato
4. **Mostrar indicador "Cargando más productos..."** cuando `loadingMore` es true, debajo de la tabla o en el footer junto al conteo

Lógica resumida:
```
batch 1 → setProducts(batch1), setLoading(false), setLoadingMore(true)
batch 2 → setProducts(prev => [...prev, batch2])
...
último batch → setLoadingMore(false)
```

### Archivo editado
- `src/components/PriceConsultView.tsx`

