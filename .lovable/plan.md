
## Plan: Optimizar vista movil con UX tipo iPhone/Android

### Resumen
Optimizar toda la interfaz movil para que se sienta nativa en dispositivos iPhone y Android, aplicando patrones de UX modernos: safe areas, touch targets adecuados, header compacto, bottom navigation, y soporte para notch/home indicator.

---

### 1. Meta viewport y safe areas en index.html

- Agregar `viewport-fit=cover` al meta viewport para soporte de notch (iPhone X+)
- Agregar `apple-mobile-web-app-capable` y `apple-mobile-web-app-status-bar-style` para comportamiento nativo en iOS
- Agregar color de tema con `theme-color`

### 2. CSS global - safe areas y mejoras tactiles (index.css)

- Agregar `env(safe-area-inset-*)` al body/contenedores principales para respetar notch y home indicator
- Agregar `-webkit-tap-highlight-color: transparent` para eliminar flash azul en taps
- Agregar `touch-action: manipulation` para evitar doble-tap zoom
- Agregar clase utilitaria para padding bottom safe area (para el boton flotante de soporte)
- Mejorar scroll con `-webkit-overflow-scrolling: touch`

### 3. Header compacto en movil (Header.tsx)

**Problema actual**: El header tiene demasiados botones visibles en movil, se aprietan. El section switcher (Compras/Transferencias) ocupa espacio horizontal.

**Cambios**:
- En movil: ocultar texto del titulo, mostrar solo logo
- Mover los botones secundarios (manual, perfil, admin) a un menu "mas opciones" (dropdown de 3 puntos) en movil
- Mantener visibles solo: notificaciones, dark mode toggle, nuevo pedido, y logout
- Reducir padding del header en movil
- Hacer el section switcher (Compras/Transferencias) mas compacto en movil con texto mas corto
- Agregar `safe-area-inset-top` al header sticky

### 4. ViewToggle adaptado a movil (ViewToggle.tsx)

**Problema actual**: Los 3 botones (Mis Pedidos / En Sucursal / Entregados) pueden truncarse en pantallas pequenas.

**Cambios**:
- Hacer el toggle scroll horizontal en movil si no cabe
- Reducir padding interno de los botones en movil
- Texto mas corto en movil: "Mis" / "Sucursal" / "Entregados"

### 5. Mejorar touch targets globales

- Asegurar que todos los botones interactivos tengan minimo 44px de alto (recomendacion Apple/Google)
- Las filas de la lista movil en OrdersTable ya tienen padding, pero verificar que el area tactil sea suficiente
- Los items en las cards de transferencias deben tener min-height de 44px

### 6. SupportChat fullscreen en movil (SupportChat.tsx)

**Problema actual**: El chat de soporte es un popup fijo de 384x500px, dificil de usar en movil.

**Cambios**:
- En movil: hacer el chat fullscreen (inset-0) en vez de popup flotante
- Agregar safe area padding en la parte inferior para el input de mensaje
- Aumentar el area del input para ser mas comodo de escribir

### 7. Bottom safe area para FAB de soporte

- El boton flotante de soporte (SupportButton) debe respetar `safe-area-inset-bottom` para no quedar detras del home indicator en iPhones

### 8. Dialogs y modals optimizados para movil

- Los modals (OrderForm, OrderDetailModal, etc.) ya usan `max-h-[85vh]`, verificar que funcionen bien con el teclado virtual
- Agregar `pb-safe` (safe area bottom) a los modals en movil

---

### Seccion tecnica

**index.html**:
- `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<meta name="theme-color" content="#fafafa">`

**index.css**:
```css
html {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.pt-safe {
  padding-top: env(safe-area-inset-top, 0px);
}
```

**Header.tsx**:
- Importar `MoreVertical` de lucide-react
- En movil (`sm:hidden`): agrupar botones secundarios en DropdownMenu con icono de 3 puntos
- Reducir `py-4` a `py-2` en movil
- Aplicar safe area top al header sticky

**ViewToggle.tsx**:
- Agregar `overflow-x-auto whitespace-nowrap` al contenedor en movil
- Reducir `px-3` a `px-2` y `text-sm` a `text-xs` en movil

**SupportChat.tsx**:
- Detectar `useIsMobile()` 
- Si movil: cambiar el contenedor de `fixed bottom-24 right-6 w-96 h-[500px]` a `fixed inset-0` con safe areas
- Agregar `pb-safe` al input area

**SupportButton.tsx**:
- Agregar `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]` para respetar el home indicator

No se requieren cambios en la base de datos.
