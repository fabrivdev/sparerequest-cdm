
## Plan: Agregar Dark Mode con toggle en el Header

### Resumen
Agregar soporte completo de dark mode usando `next-themes` (ya instalado) con un boton toggle en el header para alternar entre tema claro y oscuro. Los colores oscuros ya estan definidos en `index.css` bajo `.dark`.

---

### 1. Envolver la app con ThemeProvider

**Archivo: `src/App.tsx`**
- Importar `ThemeProvider` de `next-themes`
- Envolver todo el contenido dentro de `<ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme">`
- Esto habilita el sistema de temas y persiste la preferencia del usuario en localStorage

---

### 2. Agregar boton toggle en el Header

**Archivo: `src/components/Header.tsx`**
- Importar `useTheme` de `next-themes` y los iconos `Sun` y `Moon` de `lucide-react`
- Agregar un boton entre los iconos existentes (junto al de Manual de usuario) que alterne entre `light` y `dark`
- Mostrar icono de Sol cuando esta en dark mode (para cambiar a light) y Luna cuando esta en light mode (para cambiar a dark)
- Usar el mismo estilo de boton ghost que los demas iconos del header

---

### Seccion tecnica

**App.tsx**: Wrap con `<ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme">` alrededor de `<AuthProvider>` y contenido.

**Header.tsx**:
- `const { theme, setTheme } = useTheme()`
- Boton con `onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}`
- Icono condicional: `theme === 'dark' ? <Sun /> : <Moon />`
- Ubicado antes del boton de Manual de usuario

No se requieren cambios en CSS (los colores dark ya estan definidos en `index.css`) ni en la base de datos.
