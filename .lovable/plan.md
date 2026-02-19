

## Plan: Corregir Sucursales y Tabla de Stock

### Problema principal

El codigo ERP 1 se mapeaba a "CENTRAL", pero en el sistema esta sucursal se llama **SANTA RITA**. Esto causaba que:
- El stock cargado del PDF aparecia bajo "CENTRAL" en vez de "SANTA RITA"
- Cuando un usuario de SANTA RITA pedia una transferencia, "CENTRAL" aparecia como sucursal disponible (porque el sistema no la reconocia como la misma sucursal)
- La tabla muestra 8 columnas de sucursales aunque muchas tengan 0 stock

### Cambios a realizar

#### 1. Corregir nombres de sucursales en branches.ts

- Cambiar `CENTRAL` por `SANTA RITA` en el array `BRANCHES`
- Cambiar el mapeo ERP: codigo 1 ahora mapea a `SANTA RITA` en vez de `CENTRAL`
- Esto asegura que al cargar el PDF, los datos del ERP se asignen correctamente a SANTA RITA

#### 2. Corregir datos existentes en branch_stock

- Renombrar todos los registros con branch = "CENTRAL" a "SANTA RITA" en la tabla branch_stock
- Eliminar la sucursal "CENTRAL" de la tabla branches (ya existe SANTA RITA)

#### 3. Tabla dinamica: solo mostrar sucursales con stock

- En `StockConsultView.tsx`, en vez de usar el array fijo `BRANCHES` para las columnas, calcular dinamicamente que sucursales tienen stock > 0 en los datos cargados
- Esto evita mostrar columnas vacias para sucursales sin stock

### Detalle tecnico

**Archivos a modificar:**
- `src/constants/branches.ts` - Cambiar CENTRAL por SANTA RITA
- `src/components/transfers/StockConsultView.tsx` - Columnas dinamicas basadas en datos reales

**Datos a actualizar:**
- `branch_stock`: UPDATE branch = 'SANTA RITA' WHERE branch = 'CENTRAL'
- `branches`: DELETE WHERE name = 'CENTRAL'

