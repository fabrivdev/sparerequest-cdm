const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

// ─── Brevo API (HTTP, no usa puertos SMTP) ──────────────────────────────────
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// ─── Remitente verificado en Brevo ──────────────────────────────────────────
const FROM_EMAIL = process.env.BREVO_FROM || "noreply.sgr.cdm@gmail.com";
const FROM_NAME = "Sistema de Repuestos CDM";

// ─── Destinatarios ──────────────────────────────────────────────────────────
const EMAILS = {
  cotizantes:    process.env.EMAIL_COTIZANTES    || "fernando.petter@cdm.com.py",
  autorizantes:  process.env.EMAIL_AUTORIZANTES  || "osmar.pereira@cdm.com.py",
  autorizantes2: process.env.EMAIL_AUTORIZANTES2 || "diego.barreiro@cdm.com.py",
  creador:       process.env.EMAIL_CREADOR       || "garantias@cdm.com.py",
};

// ─── Firma HTML ─────────────────────────────────────────────────────────────
const firma = `
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
    <tr>
      <td style="vertical-align:middle; padding-right:14px;">
        <img src="https://cdm.com.py/wp-content/uploads/2023/11/REMOLINO.png"
             alt="CDM" style="width:42px; height:auto; display:block;">
      </td>
      <td style="vertical-align:middle;">
        <div style="font-size:14px; line-height:18px;">
          <strong style="color:#6B8E23;">Campos del Mañana S.A.</strong>
        </div>
        <div style="font-size:12px; color:#777; line-height:16px;">
          <a href="https://sparerequest-cdm.lovable.app"
             style="color:#6B8E23; text-decoration:none; font-weight:500;">
            Sistema de Gestión de Repuestos
          </a>
        </div>
      </td>
    </tr>
  </table>
`;

// ─── Helper: convertir string/array de emails a formato Brevo ──────────────
function toBrevoList(value) {
  const arr = Array.isArray(value) ? value : value.split(",").map(e => e.trim());
  return arr.filter(Boolean).map(email => ({ email }));
}

// ─── Helper: enviar correo vía API de Brevo ─────────────────────────────────
async function enviar({ to, cc, subject, cuerpo }) {
  const html = `
    <div style="padding:30px; font-family:Arial, Helvetica, sans-serif; color:#333;">
      ${cuerpo}
      <br>
      <p>Saludos.</p>
      ${firma}
    </div>`;

  const payload = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: toBrevoList(to),
    subject,
    htmlContent: html,
  };

  if (cc) payload.cc = toBrevoList(cc);

  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
  }
}

// ─── Webhook principal ──────────────────────────────────────────────────────
app.post("/desarmes", async (req, res) => {
  const { accion, solicitud } = req.body;

  if (!accion || !solicitud) {
    return res.status(400).json({ error: "Faltan campos: accion y solicitud" });
  }

  console.log(`[${new Date().toISOString()}] accion=${accion} solicitud=${solicitud}`);

  try {
    switch (accion) {

      // 1️⃣  CREADO → avisa al cotizante
      case "CREADO":
        await enviar({
          to:      EMAILS.cotizantes,
          cc:      EMAILS.creador,
          subject: `Desarme ${solicitud} - Pendiente de cotización`,
          cuerpo: `
            <p>Estimados,</p>
            <p>Se ha generado el desarme <strong>${solicitud}</strong>.</p>
            <p>El mismo se encuentra actualmente en <strong>espera de cotización</strong>.</p>
            <p>Solicitamos por favor proceder con la revisión correspondiente.</p>
          `,
        });
        break;

      // 2️⃣  COTIZADO → avisa a los autorizantes
      case "COTIZADO":
        await enviar({
          to:      [EMAILS.autorizantes, EMAILS.autorizantes2],
          cc:      [EMAILS.creador, EMAILS.cotizantes],
          subject: `Desarme ${solicitud} - En espera de autorización`,
          cuerpo: `
            <p>Estimados,</p>
            <p>El desarme <strong>${solicitud}</strong> ha sido cotizado.</p>
            <p>Actualmente se encuentra en <strong>espera de autorización</strong>.</p>
            <p>Solicitamos por favor revisar y emitir la aprobación o rechazo correspondiente.</p>
          `,
        });
        break;

      // 3️⃣  APROBADO → avisa al creador
      case "APROBADO":
        await enviar({
          to:      EMAILS.creador,
          cc:      EMAILS.cotizantes,
          subject: `Desarme ${solicitud} - APROBADO`,
          cuerpo: `
            <p>Estimados,</p>
            <p>El desarme <strong>${solicitud}</strong> ha sido
               <strong style="color:#6B8E23;">APROBADO</strong>.</p>
            <p>Se puede proceder con la gestión correspondiente.</p>
          `,
        });
        break;

      // 4️⃣  RECHAZADO → avisa al creador
      case "RECHAZADO":
        await enviar({
          to:      EMAILS.creador,
          cc:      EMAILS.cotizantes,
          subject: `Desarme ${solicitud} - RECHAZADO`,
          cuerpo: `
            <p>Estimados,</p>
            <p>El desarme <strong>${solicitud}</strong> ha sido
               <strong style="color:#c0392b;">RECHAZADO</strong>.</p>
            <p>Por favor revisar el caso y proceder según corresponda.</p>
          `,
        });
        break;

      default:
        return res.status(400).json({ error: `Acción desconocida: ${accion}` });
    }

    res.json({ ok: true, accion, solicitud });

  } catch (err) {
    console.error("Error enviando correo:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ status: "ok", service: "Gestión de Repuestos CDM" }));

// ─── Arranque ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
