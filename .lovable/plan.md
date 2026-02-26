

## Plan: Modulo "Desarmes" con Sistema de Permisos

Este es un feature muy grande que se dividira en fases para implementacion ordenada.

---

### FASE 1: Sistema de Permisos de Usuario

**Base de datos - Nueva tabla `user_permissions`:**
```text
user_permissions
  - id (uuid, PK)
  - user_id (uuid, FK -> auth.users, NOT NULL)
  - permission (text, NOT NULL)
  - created_at (timestamptz)
  - UNIQUE(user_id, permission)
```

Permisos disponibles (tipo text, no enum para flexibilidad):
- `ver_compras`, `crear_pedido`
- `ver_transferencias`, `solicitar_transferencia`
- `ver_desarmes`, `crear_desarme`, `cotizar_desarme`, `autorizar_desarme`, `seguimiento_desarme`

RLS: SELECT para authenticated (todos pueden ver permisos para controlar UI), INSERT/UPDATE/DELETE solo via service role (admin edge function).

**Funcion security definer** `has_permission(user_id, permission)` para usar en RLS de desarmes.

**Edge function** (en `admin-orders`): Nuevas acciones `getUsers`, `getUserPermissions`, `setUserPermissions` protegidas con password admin.

**Admin UI - Nueva tab "Usuarios" en Admin.tsx:**
- Lista de todos los usuarios (desde profiles) con su sucursal
- Al hacer click: modal con switches para cada permiso
- Los switches guardan/eliminan rows en `user_permissions`

---

### FASE 2: Navegacion Dinamica

**Header.tsx:**
- Agregar boton "Desarmes" al section switcher (junto a Compras y Transferencias)
- Solo visible si el usuario tiene permiso `ver_desarmes`
- Consultar permisos del usuario al cargar (query a `user_permissions`)

**App.tsx:**
- Nueva ruta `/desarmes` que renderiza pagina `Desarmes.tsx`

**Pagina Desarmes.tsx:**
- Verificar permiso `ver_desarmes` al montar; si no tiene, mostrar "No autorizado" y redirigir
- Layout similar a Transfers.tsx con tabs internas

---

### FASE 3: Tabla de Desarmes

**Base de datos - Nueva tabla `desarmes`:**
```text
desarmes
  - id (uuid, PK)
  - desarme_number (serial/text, auto-generado, ej: "DES-0001")
  - created_by (uuid, NOT NULL) -- usuario que crea
  - brand (text, NOT NULL) -- marca maquina
  - model (text, NOT NULL) -- modelo maquina
  - serial_number (text, NOT NULL) -- numero de serie
  - client_name (text, NOT NULL)
  - branch (text, NOT NULL) -- sucursal
  - product_code (text, NOT NULL) -- codigo repuesto a retirar
  - product_name (text) -- nombre repuesto
  - quantity (integer, NOT NULL)
  - reason (text, NOT NULL) -- motivo
  - is_urgent (boolean, NOT NULL, default false) -- maquina parada SI/NO
  - status (text, NOT NULL, default 'pendiente_cotizacion')
  - quoted_value (numeric) -- valor cotizado
  - quoted_deadline (text) -- plazo estimado
  - quoted_shipping_method (text) -- metodo envio sugerido
  - quote_observations (text) -- observaciones cotizacion
  - quoted_by (uuid) -- quien cotizo
  - quoted_at (timestamptz)
  - authorized_by (uuid) -- quien autorizo/rechazo
  - authorized_at (timestamptz)
  - rejection_reason (text) -- motivo rechazo
  - linked_order_id (uuid) -- pedido vinculado en orders
  - reassembled_at (timestamptz) -- fecha rearmado
  - closed_at (timestamptz)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
```

Estados del desarme:
```text
pendiente_cotizacion -> cotizado (pendiente_autorizacion) -> aprobado -> pedido_generado
  -> confirmado -> en_transito -> recibido -> maquina_rearmada -> cerrado
En cualquier momento antes de aprobado: rechazado
```

RLS:
- SELECT: authenticated con `has_permission(auth.uid(), 'ver_desarmes')`
- INSERT: authenticated con `has_permission(auth.uid(), 'crear_desarme')`
- UPDATE: authenticated (controlado por logica de negocio en edge function)

**Nueva tabla `desarme_status_log`** (historial de cambios, similar a `transfer_status_log`).

---

### FASE 4: Edge Function para Desarmes

**Nueva edge function `desarme-operations/index.ts`:**

Acciones (todas requieren auth token, no password admin):
- `createDesarme` - Crea desarme (requiere permiso `crear_desarme`)
- `getDesarmes` - Lista desarmes filtrados por permisos del usuario
- `quoteDesarme` - Cotizar (requiere `cotizar_desarme`): agrega valor, plazo, metodo, obs; cambia estado a `pendiente_autorizacion`
- `authorizeDesarme` - Aprobar (requiere `autorizar_desarme`): cambia estado a `aprobado`
- `rejectDesarme` - Rechazar (requiere `autorizar_desarme`): motivo obligatorio, cambia a `rechazado`
- `generateOrder` - Genera pedido en tabla `orders` precargado con datos del desarme, observation automatica "Generado desde Desarme No X - Serie X - Cliente X", guarda `linked_order_id`
- `updateDesarmeStatus` - Cambios de estado posteriores (seguimiento)
- `getDesarmeTracking` - Panel de maquinas desarmadas (requiere `seguimiento_desarme`)

---

### FASE 5: UI del Modulo Desarmes

**Pagina `src/pages/Desarmes.tsx`:**
- Tabs dinamicas segun permisos del usuario:
  - "Mis Desarmes" (siempre visible si tiene `ver_desarmes`)
  - "Cotizar" (solo con `cotizar_desarme`) - bandeja de pendientes de cotizacion
  - "Autorizar" (solo con `autorizar_desarme`) - bandeja de pendientes de autorizacion
  - "Seguimiento" (solo con `seguimiento_desarme`) - panel de maquinas desarmadas

**Componentes nuevos:**
- `src/components/desarmes/DesarmesList.tsx` - Lista paginada con filtros, badges de estado
- `src/components/desarmes/NewDesarmeModal.tsx` - Formulario: marca, modelo, N serie, cliente, sucursal, codigo/cantidad repuesto, motivo, urgencia (switch Maquina parada SI/NO)
- `src/components/desarmes/QuoteDesarmeModal.tsx` - Formulario cotizacion: valor, plazo, metodo envio, observaciones
- `src/components/desarmes/AuthorizeDesarmeModal.tsx` - Detalle + botones Aprobar/Rechazar (motivo obligatorio si rechaza)
- `src/components/desarmes/DesarmeDetailModal.tsx` - Detalle completo con timeline, link al pedido vinculado
- `src/components/desarmes/TrackingPanel.tsx` - Panel "Maquinas desarmadas": serie, cliente, dias desarmada, estado, urgencia, pedido vinculado, fecha estimada, semaforo por dias (verde <7, amarillo 7-14, rojo >14)

**Generacion automatica de pedido:**
- Al aprobar, boton "Generar Pedido" que llama `generateOrder`
- La edge function crea el pedido en `orders` con todos los campos precargados
- El `linked_order_id` se guarda en el desarme
- En el detalle del desarme se muestra link al pedido

**Actualizacion automatica:**
- Listener realtime: cuando un pedido vinculado cambia a `entregado`, el desarme pasa a `recibido` automaticamente (via trigger o listener)

---

### FASE 6: Integracion con Pedidos Existentes

- En `OrderDetailModal` (si el pedido tiene un desarme vinculado): mostrar badge "Desarme Nro X" con link
- Trigger en DB: cuando `orders.status` cambia a `entregado` y tiene un desarme vinculado, actualizar el desarme a `recibido`

---

### Seccion Tecnica - Resumen de Archivos

**Base de datos (migraciones):**
1. Tabla `user_permissions` + RLS + funcion `has_permission`
2. Tabla `desarmes` + RLS + sequence para `desarme_number`
3. Tabla `desarme_status_log` + RLS
4. Trigger para auto-actualizar desarme cuando pedido vinculado se entrega

**Edge functions:**
- `supabase/functions/admin-orders/index.ts` - Agregar acciones: `getUsers`, `getUserPermissions`, `setUserPermissions`
- `supabase/functions/desarme-operations/index.ts` - Nueva function completa

**Paginas y componentes nuevos:**
- `src/pages/Desarmes.tsx`
- `src/components/admin/AdminUsersPermissions.tsx`
- `src/components/desarmes/DesarmesList.tsx`
- `src/components/desarmes/NewDesarmeModal.tsx`
- `src/components/desarmes/QuoteDesarmeModal.tsx`
- `src/components/desarmes/AuthorizeDesarmeModal.tsx`
- `src/components/desarmes/DesarmeDetailModal.tsx`
- `src/components/desarmes/TrackingPanel.tsx`

**Archivos modificados:**
- `src/App.tsx` - Nueva ruta `/desarmes`
- `src/components/Header.tsx` - Boton Desarmes condicional en switcher + hook de permisos
- `src/pages/Admin.tsx` - Nueva tab "Usuarios" con grid-cols-7
- `supabase/config.toml` - Registro de nueva edge function

**Nota:** Debido a la complejidad, la implementacion se hara en orden secuencial: primero permisos + admin UI, luego navegacion dinamica, luego tabla desarmes + edge function, y finalmente los componentes UI y la integracion con pedidos.

---

### Estado de implementacion

- [x] FASE 1: Sistema de Permisos (tabla `user_permissions`, funcion `has_permission`, edge function actions, Admin UI tab "Usuarios")
- [x] FASE 2: Navegacion Dinamica (Header switcher condicional, ruta `/desarmes`, pagina shell Desarmes.tsx)
- [x] FASE 3: Tabla de Desarmes + RLS + desarme_status_log + trigger auto-update
- [x] FASE 4: Edge Function desarme-operations (create, get, detail, quote, authorize, reject, generateOrder, updateStatus, getTracking)
- [ ] FASE 5: UI del Modulo Desarmes
- [ ] FASE 6: Integracion con Pedidos

