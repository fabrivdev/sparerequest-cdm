

## Plan: Admin - Control total de transferencias, eliminacion y exportacion Excel

### Resumen
3 mejoras para el panel admin de transferencias:
1. Ver TODAS las transferencias (incluyendo cerradas, rechazadas, canceladas) con detalle completo
2. Eliminar cualquier transferencia sin restriccion de estado, notificando al usuario
3. Boton para exportar el listado a Excel

---

### 1. AdminTransfersView - Ver todas las transferencias

**Problema actual**: Solo muestra transferencias activas (filtra por status). No incluye Cerrada, Rechazada, Cancelada.

**Cambios**:
- Quitar el filtro `.in('status', [...])` para traer TODAS las transferencias
- Agregar tabs o filtro de estado (Todas / Activas / Cerradas) para organizar la vista
- Enriquecer la tabla con columnas: Destino (Cliente/Stock/Ambos), Facturado, Cliente
- Agregar boton "Exportar Excel" en la barra de herramientas
- Actualizar la interfaz `Transfer` para incluir los campos nuevos

### 2. Admin puede eliminar cualquier transferencia

**Backend (edge function `transfer-operations`)**:
- Agregar nueva accion `adminDeleteTransfer` que:
  - Recibe `transferId`, `password` (admin), y `reason` opcional
  - Valida la password de admin contra el secret `ADMIN_PASSWORD`
  - Elimina status logs, alerts, y la transferencia sin restriccion de estado
  - Crea una notificacion al usuario solicitante informando que su transferencia fue eliminada por el administrador

**Frontend (TransferDetailModal)**:
- Detectar cuando `userBranch === 'ADMIN'` para mostrar el boton de eliminar sin restriccion de estado
- Pasar `password` como prop adicional (ya disponible en AdminTransfersView)
- Llamar a `adminDeleteTransfer` en lugar de `deleteTransfer`

**Frontend (AdminTransfersView)**:
- Pasar `password` al modal de detalle para autenticar la eliminacion

### 3. Exportar a Excel

**Frontend (AdminTransfersView)**:
- Agregar boton "Exportar Excel" usando la libreria `xlsx` (ya instalada)
- Exportar todas las transferencias visibles con columnas: Fecha, Marca, Codigo, Producto, Origen, Destino Sucursal, Destino (Stock/Cliente/Ambos), Cliente, Cantidad Solicitada, Cantidad Recibida, Estado, Prioridad, Facturado, Nro Factura, Nro Remision

---

### Seccion tecnica

**AdminTransfersView.tsx**:
- Quitar filtro de status en query, traer todo con `select('*').order(...)`
- Agregar estado `filter` con opciones: 'all', 'active', 'closed'
- Filtrar en frontend segun seleccion
- Agregar columnas enriched: destino, cliente, facturacion
- Funcion `exportToExcel()` usando `xlsx.utils.json_to_sheet` y `xlsx.writeFile`
- Pasar `password` y `isAdmin={true}` al TransferDetailModal

**TransferDetailModal.tsx**:
- Agregar prop opcional `isAdmin?: boolean` y `adminPassword?: string`
- Cambiar logica `canDelete`: si `isAdmin` es true, siempre puede eliminar
- En `handleDelete`: si `isAdmin`, llamar a `adminDeleteTransfer` en vez de `deleteTransfer`

**transfer-operations/index.ts**:
- Nueva accion `adminDeleteTransfer`:
  - Valida `ADMIN_PASSWORD`
  - Elimina logs, alerts, notifications relacionadas
  - Elimina la transferencia
  - Notifica al requester_user_id: "Tu transferencia [brand] [code] fue eliminada por el administrador"

No se requieren cambios en la base de datos.

