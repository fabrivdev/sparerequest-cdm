
## Plan: Ajustes de UI, Sidebar y Seguimiento

### 1. Eliminar scrollbar horizontal del contenedor

El layout actual no restringe el overflow. Ajustar `AppLayout.tsx` para que el contenedor principal tenga `overflow-x-hidden` y el sidebar + contenido no excedan el viewport.

**Archivo:** `src/components/AppLayout.tsx`
- Agregar `overflow-x-hidden` al wrapper principal
- Asegurar que el contenido use `min-w-0` (ya lo tiene)

---

### 2. Ajustar sidebar: iconos mas chicos, logo + titulo "CDM"

**Archivo:** `src/components/AppSidebar.tsx`
- Reducir iconos de navegacion de `w-4.5 h-4.5` a `w-4 h-4`
- Agregar en la parte superior del sidebar (antes de la nav) el favicon como logo (`/favicon.png`) con el titulo "CDM" al lado
- Cuando el sidebar esta colapsado, mostrar solo el icono del favicon

---

### 3. Header: eliminar nombre de seccion, icono caja, y reubicar boton "Nuevo Pedido"

**Archivo:** `src/components/Header.tsx`
- Eliminar el bloque que muestra "Compras" / "Transferencias" / "Desarmes" (lineas 138-145)
- Eliminar el icono de Package (caja) del logo area (lineas 127-129)
- Eliminar el boton "Nuevo Pedido" del header (lineas 222-229)
- Mantener solo: titulo "Solicitud de Repuestos", nombre usuario + sucursal, notificaciones, theme toggle, admin, logout

**Archivo:** `src/pages/Dashboard.tsx`
- Mover el boton "Nuevo Pedido" para que aparezca al lado del titulo "Mis Pedidos" en la seccion principal, no en el header

---

### 4. Desarmes: renombrar "Mis Desarmes" a "Desarmes"

**Archivo:** `src/pages/Desarmes.tsx`
- Cambiar el tab label de "Mis Desarmes" (shortLabel "Mis") a "Desarmes"

---

### 5. Seguimiento: mostrar todos los desarmes (incluidos cerrados) con filtro de estado

**Archivo:** `src/components/desarmes/TrackingPanel.tsx`
- Agregar un selector de filtro de estado (dropdown) que permita ver todos, o filtrar por estado especifico
- Por defecto mostrar "Todos" (incluyendo cerrados y rechazados)

**Archivo:** `supabase/functions/desarme-operations/index.ts`
- En la vista `tracking`, eliminar los filtros `.not('status', ...)` para que devuelva todos los desarmes
- Opcionalmente aceptar un parametro `trackingStatusFilter` para filtrar desde backend

---

### Seccion Tecnica - Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/AppLayout.tsx` | overflow-x-hidden |
| `src/components/AppSidebar.tsx` | Iconos mas chicos, logo favicon + "CDM" arriba |
| `src/components/Header.tsx` | Quitar seccion, icono caja, boton nuevo pedido |
| `src/pages/Dashboard.tsx` | Boton "Nuevo Pedido" junto a "Mis Pedidos" |
| `src/pages/Desarmes.tsx` | Renombrar tab "Mis Desarmes" -> "Desarmes" |
| `src/components/desarmes/TrackingPanel.tsx` | Filtro de estado, mostrar cerrados |
| `supabase/functions/desarme-operations/index.ts` | Tracking sin excluir cerrados/rechazados |
