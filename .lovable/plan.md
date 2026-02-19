

## Plan: Ajustes al Modulo de Transferencias

### Problemas identificados

1. **Columna "Marca"**: El campo `brand` se extrae del SubGrupo del PDF pero no representa una marca real (ej: "CABEZALES"). Se debe excluir esa columna de la tabla de consulta de stock.

2. **Falta columna "Total"**: La tabla de stock no muestra la suma total de todas las sucursales por producto.

3. **Visibilidad del pedido de transferencia**: Cuando un usuario solicita una transferencia, esta aparece en la pestaña "Mis Transferencias > Recibidas" de los usuarios de la sucursal origen (source_branch). El flujo ya funciona correctamente.

4. **Carga de stock visible para todos**: El componente `StockPDFUpload` esta visible en la vista de usuarios normales. Solo el admin deberia poder cargar datos.

5. **Panel admin sin seccion de transferencias**: El panel de administracion (`/admin`) no tiene ninguna pestaña para gestionar transferencias ni cargar el PDF de stock.

6. **Ventas 12m/24m**: Remover la columna y el selector de ventas de la vista de usuarios. Solo el admin necesitaria esa informacion eventualmente.

---

### Cambios a realizar

#### 1. Quitar "Marca" y agregar "Total" en la tabla de stock (StockConsultView)

- Eliminar la columna "Marca" del header y body de la tabla.
- Eliminar el filtro de busqueda por marca.
- Agregar una columna "Total" que sume las cantidades de todas las sucursales para cada producto.
- Eliminar la columna de ventas y el selector de periodo (12m/24m) de la vista de usuario.

#### 2. Quitar StockPDFUpload de la vista de usuario

- Remover el componente `StockPDFUpload` del archivo `StockConsultView.tsx`. Los usuarios normales solo consultan stock y solicitan transferencias.

#### 3. Crear seccion "Transferencias" en el panel Admin

- Agregar una nueva pestaña "Transferencias" en `/admin` (Admin.tsx) con un icono de `ArrowLeftRight`.
- Crear un componente `AdminTransfersView` que incluya:
  - El componente `StockPDFUpload` para que el admin cargue el stock.
  - Una tabla con todas las transferencias activas (Pendiente, Aceptada, Despachada) para que el admin pueda monitorear.
  - Capacidad de ver detalles de cualquier transferencia.
- La pestaña se agrega al TabsList existente del admin (que pasa de 5 a 6 columnas).

#### 4. Expandir tabs del admin de 5 a 6

- Modificar el `grid-cols-5` a `grid-cols-6` en el TabsList.
- Agregar el TabsTrigger y TabsContent para "Transferencias".

---

### Detalle tecnico

**Archivos a modificar:**
- `src/components/transfers/StockConsultView.tsx` - Quitar marca, ventas, PDF upload; agregar Total
- `src/pages/Admin.tsx` - Agregar pestaña Transferencias

**Archivos a crear:**
- `src/components/admin/AdminTransfersView.tsx` - Vista admin con carga PDF, tabla de transferencias y detalle

