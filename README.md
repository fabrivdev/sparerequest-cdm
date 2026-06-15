# Gestión de Repuestos — Mailer

Servidor Node.js que reemplaza el flujo n8n. Usa **Brevo** para enviar correos.  
**Costo: $0** — Brevo free (300 emails/día) + Render.com free.

---

## Paso 1 — Crear cuenta en Brevo

1. Entrá a **brevo.com** → Sign up (gratis, con tu email personal)
2. Completá el registro (no hace falta tarjeta)

---

## Paso 2 — Agregar el email remitente

> Brevo necesita verificar que sos dueño del email desde el que vas a mandar.

1. En el panel de Brevo ir a **Senders & IP → Senders**
2. Click en **Add a sender**
3. Escribí:
   - **From name:** Sistema de Repuestos CDM
   - **From email:** noreply.sgr.cdm@gmail.com
4. Brevo manda un email de verificación a esa dirección → abrilo y hacé click en el link ✅

---

## Paso 3 — Obtener las credenciales SMTP

1. En el panel de Brevo ir a **SMTP & API → SMTP**
2. Anotá el **Login** (es tu email de cuenta Brevo)
3. Click en **Generate a new SMTP key** → copiá la clave larga

---

## Paso 4 — Subir a GitHub

Creá una carpeta `mailer/` en tu repo `sparerequest-cdm` y subí los archivos:

```
sparerequest-cdm/
└── mailer/
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── .gitignore
    └── README.md
```

```bash
git add mailer/
git commit -m "feat: mailer con Brevo (reemplazo de n8n)"
git push
```

---

## Paso 5 — Desplegar en Render.com (gratis)

1. Entrá a **render.com** → New → **Web Service**
2. Conectá el repo `sparerequest-cdm`
3. Configuración:
   - **Root Directory:** `mailer`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. En **Environment Variables** agregar estas 3:
   ```
   BREVO_LOGIN    = (tu email de cuenta en Brevo)
   BREVO_SMTP_KEY = (la clave SMTP generada en el paso 3)
   BREVO_FROM     = noreply.sgr.cdm@gmail.com
   ```
5. Click en **Create Web Service** → URL final:
   ```
   https://repuestos-mailer.onrender.com
   ```

---

## Paso 6 — Actualizar la URL en el frontend

En el código de `sparerequest-cdm`, reemplazá la URL del webhook de n8n:

```js
// ANTES (n8n)
fetch("https://tu-instancia.n8n.cloud/webhook/desarmes", { ... })

// DESPUÉS
fetch("https://repuestos-mailer.onrender.com/desarmes", { ... })
```

---

## Probar localmente

```bash
cd mailer
cp .env.example .env
# Completar .env con los datos reales de Brevo

npm install
npm start

# En otra terminal:
curl -X POST http://localhost:3000/desarmes \
  -H "Content-Type: application/json" \
  -d '{"accion":"CREADO","solicitud":"DES-TEST-001"}'
```
