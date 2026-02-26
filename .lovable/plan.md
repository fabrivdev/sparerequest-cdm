

## Plan: Notificaciones de Slack para cambios en desarmes

### Paso 1: Conectar Slack al proyecto
- Vincular la conexión existente "CDM" (Slack) al proyecto usando el conector, lo que hará disponibles `SLACK_API_KEY` y `LOVABLE_API_KEY` como variables de entorno.

### Paso 2: Preguntar canal de Slack
- Necesitaré saber en qué canal de Slack quieren recibir las notificaciones.

### Paso 3: Modificar `supabase/functions/desarme-operations/index.ts`
- Agregar una función helper `sendSlackNotification(text)` que envíe mensajes al canal configurado usando el gateway de Lovable (`https://connector-gateway.lovable.dev/slack/api/chat.postMessage`).
- Llamar esta función en cada acción que modifica un desarme:
  - **createDesarme**: "Nuevo desarme DES-XXXX creado por [nombre] - [marca] [modelo] - Cliente: [cliente]"
  - **quoteDesarme**: "Desarme DES-XXXX cotizado por [nombre] - Valor: $XX"
  - **authorizeDesarme**: "Desarme DES-XXXX aprobado por [nombre]"
  - **rejectDesarme**: "Desarme DES-XXXX rechazado por [nombre] - Motivo: [motivo]"
  - **generateOrder**: "Pedido generado para desarme DES-XXXX"
  - **updateDesarmeStatus**: "Desarme DES-XXXX cambió a [estado] por [nombre]"
- Los mensajes de Slack serán opcionales (si las variables de entorno no existen, simplemente no se envía y no se bloquea la operación).

### Detalles técnicos
- Se usa el connector gateway con headers `Authorization: Bearer LOVABLE_API_KEY` y `X-Connection-Api-Key: SLACK_API_KEY`.
- Los errores de Slack se loguean pero no bloquean la operación principal del desarme.
- Se incluyen emojis/formato de Slack para mejor legibilidad (`:wrench:`, `:white_check_mark:`, etc.).

