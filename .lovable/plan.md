

## Menu Principal con Dashboard de Inicio

Reemplazar el manual de usuario con una nueva pagina de inicio ("/home") que funcione como hub central, mostrando informacion contextual segun los permisos del usuario.

### Estructura del nuevo menu

**1. Seccion superior: 3 Cards de modulos principales**

Tres tarjetas grandes con icono, titulo y descripcion breve:
- **Compras** (Package): "Gestiona solicitudes de repuestos, seguimiento de pedidos y facturacion"
- **Transferencias** (ArrowLeftRight): "Consulta stock entre sucursales y solicita transferencias"
- **Desarmes** (Wrench): "Solicita desarmes, cotiza y autoriza repuestos" (solo visible si tiene permiso `ver_desarmes`)

Al presionar una card, se expande (accordion/collapsible) mostrando las funciones detalladas del modulo (similar al contenido actual del manual). Un boton "Ir al modulo" navega a la ruta correspondiente.

**2. Seccion de Actividad Reciente**

Card que muestra las ultimas acciones del usuario:
- Ultimos pedidos creados/actualizados
- Ultimas transferencias
- Ultimos cambios en desarmes
Datos consultados desde las tablas `orders`, `transfers` y `desarmes` filtrados por `user_id`, limitados a los 10 mas recientes.

**3. Seccion de Notificaciones**

Card que lista las ultimas notificaciones no leidas del usuario, tomadas de `user_notifications`. Funciona como vista rapida con enlace a la campana del header.

**4. Seccion de Avisos del Admin**

Card que muestra avisos publicados por el administrador. Requiere:
- Nueva tabla `announcements` con campos: `id`, `title`, `content`, `created_by`, `created_at`, `is_active`
- RLS: SELECT para todos los autenticados, INSERT/UPDATE/DELETE solo para admin (via edge function)
- En el panel admin, seccion para crear/editar avisos
- En el home, mostrar avisos activos ordenados por fecha

### Cambios en la navegacion

- **Sidebar**: Agregar item "Inicio" (Home icon) como primera opcion, ruta `/home`
- **Header**: Eliminar el icono de BookOpen (manual de usuario) tanto en desktop como en mobile dropdown
- **Eliminar** el componente `UserManual.tsx` y sus referencias
- **Ruta**: Agregar `/home` en App.tsx, redirigir `/` a `/home` o convertir Index en el nuevo home

### Cambios tecnicos detallados

**Archivos nuevos:**
- `src/pages/Home.tsx` - Pagina principal con las 4 secciones
- `src/components/home/ModuleCards.tsx` - Cards de modulos con expansion
- `src/components/home/RecentActivity.tsx` - Actividad reciente
- `src/components/home/AnnouncementsSection.tsx` - Avisos del admin

**Archivos a modificar:**
- `src/App.tsx` - Agregar ruta `/home`
- `src/pages/Index.tsx` - Redirigir a `/home`
- `src/components/AppSidebar.tsx` - Agregar item "Inicio" con icono Home
- `src/components/Header.tsx` - Eliminar boton BookOpen y referencia a UserManual

**Archivos a eliminar:**
- `src/components/UserManual.tsx`

**Base de datos (migracion):**
```text
- Tabla "announcements": id (uuid), title (text), content (text), created_by (uuid), created_at (timestamptz), is_active (boolean default true)
- RLS: SELECT para autenticados, ALL para service role
- Publicacion en supabase_realtime para actualizaciones en tiempo real
```

**Panel Admin:**
- Agregar tab o seccion en Admin para gestionar avisos (CRUD basico)

