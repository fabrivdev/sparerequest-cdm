

## Plan: Mejoras al Modulo de Desarmes

Este plan cubre 7 areas de mejora solicitadas.

---

### 1. Menu lateral izquierdo expandible (Sidebar)

Reemplazar el switcher inline del Header por un sidebar colapsable al estilo de aplicaciones modernas.

**Cambios:**
- Crear `src/components/AppSidebar.tsx` con navegacion vertical: Compras, Transferencias, Desarmes (condicional por permiso)
- El sidebar sera colapsable (icono hamburguesa) y en mobile se mostrara como drawer
- Cada item tendra icono, label y badge de contador (transferencias pendientes, desarmes pendientes de cotizacion)
- Modificar `src/components/Header.tsx`: eliminar el section switcher inline, mantener solo logo, notificaciones, user menu y acciones
- Modificar las paginas principales (`Index.tsx`, `Transfers.tsx`, `Desarmes.tsx`) para envolver el contenido con el layout sidebar + main

---

### 2. Campo "Vendedor" en formulario Nuevo Desarme

Agregar campo de texto "Vendedor" (nombre del vendedor que atiende al cliente) al formulario de creacion.

**Cambios:**
- DB: Agregar columna `salesperson` (text, nullable) a tabla `desarmes`
- Edge function `desarme-operations`: incluir `salesperson` en `createDesarme`
- `NewDesarmeModal.tsx`: agregar input "Vendedor" debajo de Cliente
- `DesarmeDetailModal.tsx`: mostrar el campo vendedor en el grid de info

---

### 3. Notificaciones para cotizador (aprobacion/rechazo)

Cuando un desarme sea aprobado o rechazado, notificar al usuario que cotizo para que sepa el resultado sin tener que entrar uno a uno.

**Cambios:**
- Edge function `desarme-operations`: en `authorizeDesarme` y `rejectDesarme`, insertar notificacion en `user_notifications` para el `quoted_by` del desarme
  - Tipo: `desarme_approved` o `desarme_rejected`
  - Mensaje: "Tu cotizacion DES-XXXX fue aprobada/rechazada"
- `UserNotifications.tsx`: agregar iconos para los nuevos tipos `desarme_approved` (verde) y `desarme_rejected` (rojo)

---

### 4. Badge contador de desarmes pendientes

Agregar contadores en el sidebar para desarmes pendientes de accion del usuario.

**Cambios:**
- En el sidebar, si el usuario tiene permiso `cotizar_desarme`, mostrar badge con count de desarmes en `pendiente_cotizacion`
- Si tiene `autorizar_desarme`, mostrar badge con count de `pendiente_autorizacion`
- Usar queries realtime para mantener los contadores actualizados

---

### 5. Tracking: multiples piezas por maquina + resumen de tiempos

El panel de seguimiento debe agrupar por maquina (serie) y mostrar todas las piezas "carneadas" de esa maquina y en que estado esta cada una. Ademas mostrar un resumen de tiempos vs plazo.

**Cambios:**
- `TrackingPanel.tsx`: reestructurar para agrupar desarmes por `serial_number`
  - Fila principal: serie, cliente, marca/modelo, cantidad de piezas, urgencia
  - Sub-filas expandibles: cada pieza (codigo, estado, dias, plazo cotizado)
  - Indicador de "fuera de plazo" si los dias superan el plazo cotizado
  - Semaforo sigue aplicando por pieza
- Edge function `getDesarmes` (view=tracking): enriquecer con plazo cotizado para calcular desvio

---

### 6. Aclarar boton "Confirmar" y campo Orden de Servicio obligatorio

El boton "Confirmar" (estado `pedido_generado` -> `confirmado`) actualmente avanza el estado sin contexto. Se requiere que al cerrar el circuito (estado `cerrado`), sea obligatorio ingresar un numero de Orden de Servicio.

**Cambios:**
- DB: Agregar columna `service_order_number` (text, nullable) a tabla `desarmes`
- Edge function `updateDesarmeStatus`:
  - Si `newStatus === 'cerrado'`, requerir campo `service_order_number`; si no viene, retornar error
  - Guardar el `service_order_number` en el desarme
- `DesarmeDetailModal.tsx`:
  - Para el boton "Confirmar": agregar un label descriptivo "Confirmar recepcion del pedido por parte del proveedor"
  - Para "Cerrar": mostrar input obligatorio de "Nro. Orden de Servicio" antes de permitir cerrar
- `TrackingPanel.tsx`: mostrar el Nro. Orden de Servicio en el detalle cuando exista

---

### 7. Verificacion end-to-end del modulo

Despues de implementar todo, se navegara por el modulo completo probando:
- Crear desarme con vendedor
- Cotizar
- Verificar notificacion al cotizador tras aprobacion/rechazo
- Generar pedido
- Avanzar estados
- Verificar que cerrar requiere Orden de Servicio
- Verificar tracking agrupa por maquina

---

### Seccion Tecnica - Resumen de Archivos

**Migracion de base de datos:**
- Agregar columnas `salesperson` y `service_order_number` a `desarmes`

**Edge function modificada:**
- `supabase/functions/desarme-operations/index.ts`: campo vendedor en createDesarme, notificaciones en authorize/reject, service_order_number obligatorio en cerrado, enriquecer tracking con plazo

**Archivos nuevos:**
- `src/components/AppSidebar.tsx` - Sidebar de navegacion con badges

**Archivos modificados:**
- `src/components/Header.tsx` - Eliminar section switcher, simplificar
- `src/components/desarmes/NewDesarmeModal.tsx` - Campo vendedor
- `src/components/desarmes/DesarmeDetailModal.tsx` - Mostrar vendedor, labels descriptivos, input Orden Servicio para cerrar
- `src/components/desarmes/TrackingPanel.tsx` - Agrupar por maquina, sub-filas por pieza, resumen tiempos/plazo
- `src/components/UserNotifications.tsx` - Iconos para tipos desarme_approved/rejected
- `src/pages/Index.tsx` - Layout con sidebar
- `src/pages/Transfers.tsx` - Layout con sidebar
- `src/pages/Desarmes.tsx` - Layout con sidebar

