

## Plan: Reemplazar mensajes de texto por archivos CSV en Slack

### Problema actual
Las notificaciones a Slack envian mensajes de texto plano. El usuario quiere que en su lugar se suba un archivo CSV al canal `#nuevo-canal` con todos los datos del desarme, incluyendo correos electronicos de los involucrados.

### Paso 1: Reconectar Slack con permisos de archivos
La conexion actual de Slack no tiene el permiso `files:write` necesario para subir archivos. Se debe reconectar agregando este scope.

### Paso 2: Actualizar la edge function `desarme-operations`

**Reemplazar `sendSlackNotification(text)`** por una nueva funcion `sendSlackCSV(desarme, supabase, action)` que:

1. **Obtiene emails de auth.users** usando el service role client:
   - Email del creador (siempre incluido)
   - Email del cotizador (si aplica, cuando la accion es cotizar o posterior)
   - Email del autorizador (si aplica, cuando la accion es autorizar o posterior)

2. **Genera el contenido CSV** con las columnas:
   - Numero de desarme, Accion realizada, Fecha
   - Marca, Modelo, Numero de serie, Cliente, Sucursal
   - Codigo de producto, Nombre de producto, Cantidad, Motivo
   - Es urgente, Vendedor
   - Estado actual
   - Valor cotizado, Plazo, Metodo de envio, Observaciones de cotizacion
   - Motivo de rechazo
   - Nro. Orden de Servicio
   - Email del creador (siempre), Nombre del creador
   - Email del cotizador, Nombre del cotizador
   - Email del autorizador, Nombre del autorizador

3. **Sube el CSV a Slack** usando la API de archivos:
   - `files.getUploadURLExternal` para obtener URL de carga
   - Upload del archivo CSV a esa URL
   - `files.completeUploadExternal` para publicar en el canal `#nuevo-canal`

4. **Se ejecuta en cada accion**: crear, cotizar, aprobar, rechazar, generar pedido, actualizar estado de seguimiento.

### Detalle tecnico

```text
Edge Function Flow:
  Accion del desarme
       |
       v
  Obtener datos completos del desarme
       |
       v
  Obtener emails de auth.users (via admin API)
       |
       v
  Generar CSV en memoria (string)
       |
       v
  files.getUploadURLExternal (obtener URL)
       |
       v
  PUT del CSV al upload URL
       |
       v
  files.completeUploadExternal (publicar en canal)
```

El nombre del archivo CSV seguira el formato: `DES-XXXX_accion_YYYY-MM-DD.csv`

### Archivos a modificar
- `supabase/functions/desarme-operations/index.ts`: Reemplazar `sendSlackNotification` por la nueva logica de CSV + upload a Slack

