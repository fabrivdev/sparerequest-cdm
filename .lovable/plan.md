

## Rediseño visual del Home con cards uniformes y popup de detalles

### Cambios principales

**1. ModuleCards: Cards de tamaño fijo + Dialog para detalles**

Reemplazar el Collapsible (que deforma el layout) por cards de altura uniforme. Al hacer click en una card, se abre un Dialog (popup centrado) con los detalles del modulo.

Cada card tendra:
- Icono grande centrado con fondo degradado sutil
- Titulo del modulo con tipografia mas prominente
- Descripcion breve
- Boton "Ver mas" que abre el popup
- Boton "Ir al modulo" para navegar directo
- Hover con elevacion (shadow) y borde primary

El Dialog mostrara:
- Header con icono y titulo del modulo
- Lista de funcionalidades con iconos (el contenido actual de details)
- Boton "Ir a [Modulo]" al pie

**2. Home.tsx: Mejor estructura visual**

- Header mas prominente con saludo al usuario ("Hola, [nombre]") y subtitulo
- Seccion de avisos se mantiene arriba
- Cards de modulos en grid de 3 columnas (iguales)
- Separador visual antes de actividad/notificaciones
- Actividad y notificaciones con estilo mas refinado

### Archivos a modificar

- `src/components/home/ModuleCards.tsx` — Eliminar Collapsible, usar Dialog, cards de altura fija con mejor diseño visual
- `src/pages/Home.tsx` — Mejorar layout general, agregar saludo personalizado, espaciado y jerarquia visual

### Detalles tecnicos

**ModuleCards.tsx:**
- Reemplazar imports de Collapsible por Dialog/DialogContent/DialogHeader/DialogTitle
- Agregar estado `selectedModule` para controlar cual dialog esta abierto
- Cards con `h-full` y `flex flex-col` para altura uniforme
- Icono mas grande (w-14 h-14) con fondo degradado
- Hover: `hover:shadow-lg hover:-translate-y-1 transition-all`
- Dialog con max-w-md, lista de funciones con mejor spacing

**Home.tsx:**
- Obtener nombre del usuario desde profiles para mostrar saludo
- Tipografia mas grande para el titulo (text-2xl)
- Agregar divisor sutil entre secciones

