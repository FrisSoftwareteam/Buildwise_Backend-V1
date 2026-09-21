import nodemailer from "nodemailer";
import { logger } from "./logger";

type MailOptions = {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
};

// ---------------------------------------------------------------------------
// SMTP transport (Microsoft 365 basic auth, or any other SMTP server)
// ---------------------------------------------------------------------------

function createTransport() {
  if (process.env.SMTP_HOST) {
    const secure = process.env.SMTP_SECURE === "true";
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure,
      requireTLS: !secure,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransport();

function fromAddress() {
  return process.env.MAIL_FROM || "BuildWise <noreply@buildwise.local>";
}

// ---------------------------------------------------------------------------
// Microsoft Graph transport (app-only, no SMTP password / basic auth needed)
//
// Requires the Azure app registration used for Microsoft sign-in to have the
// *application* permission Mail.Send with admin consent granted.
// Sender mailbox: GRAPH_MAIL_SENDER, else SMTP_USER, else the address in MAIL_FROM.
//
// MAIL_TRANSPORT:
//   "auto"  (default) - try Graph first when configured, fall back to SMTP
//   "graph"           - Graph only
//   "smtp"            - SMTP only
// ---------------------------------------------------------------------------

function mailTransportMode(): "auto" | "graph" | "smtp" {
  const mode = (process.env.MAIL_TRANSPORT || "auto").trim().toLowerCase();
  return mode === "graph" || mode === "smtp" ? mode : "auto";
}

function graphSender(): string | null {
  const explicit = process.env.GRAPH_MAIL_SENDER?.trim() || process.env.SMTP_USER?.trim();
  if (explicit) return explicit;
  const match = process.env.MAIL_FROM?.match(/<([^>]+)>/);
  return match ? match[1].trim() : null;
}

function graphConfigured() {
  return Boolean(
    process.env.MICROSOFT_TENANT_ID?.trim() &&
      process.env.MICROSOFT_CLIENT_ID?.trim() &&
      process.env.MICROSOFT_CLIENT_SECRET?.trim() &&
      graphSender(),
  );
}

let cachedGraphToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedGraphToken && cachedGraphToken.expiresAt > Date.now() + 60_000) {
    return cachedGraphToken.value;
  }

  const tenant = encodeURIComponent(process.env.MICROSOFT_TENANT_ID!.trim());
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`Graph token request failed (${res.status}): ${data.error_description || "no access token"}`);
  }

  cachedGraphToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function sendViaGraph(recipients: string[], cc: string[], options: MailOptions) {
  const token = await getGraphToken();
  const sender = graphSender()!;
  const toGraph = (addresses: string[]) => addresses.map((address) => ({ emailAddress: { address } }));

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: options.subject,
        body: {
          contentType: "HTML",
          content: options.html || options.text.replace(/\n/g, "<br>"),
        },
        toRecipients: toGraph(recipients),
        ccRecipients: toGraph(cc),
      },
      saveToSentItems: true,
    }),
  });

  if (res.status !== 202) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) cachedGraphToken = null;
    throw new Error(`Graph sendMail failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

// ---------------------------------------------------------------------------

export async function sendMail(options: MailOptions) {
  const recipients = [...new Set(options.to.filter(Boolean))];
  if (recipients.length === 0) {
    logger.warn("Skipping mail: no recipients");
    return { accepted: [] as string[], preview: null as string | null };
  }

  const cc = [...new Set((options.cc || []).map((email) => email.trim().toLowerCase()).filter((email) => email && !recipients.includes(email)))];

  const mode = mailTransportMode();
  let graphError: unknown = null;

  if (mode !== "smtp" && graphConfigured()) {
    try {
      await sendViaGraph(recipients, cc, options);
      logger.info({ to: recipients, cc, subject: options.subject, transport: "graph" }, "Mail sent");
      return { accepted: recipients, preview: null as string | null };
    } catch (err) {
      graphError = err;
      logger.error({ err, to: recipients }, "Graph mail failed");
      if (mode === "graph") throw err;
      logger.warn("Falling back to SMTP");
    }
  } else if (mode === "graph") {
    throw new Error("MAIL_TRANSPORT=graph but MICROSOFT_TENANT_ID/CLIENT_ID/CLIENT_SECRET or a sender address is missing");
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: recipients.join(", "),
      cc: cc.length ? cc.join(", ") : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, "<br>"),
    });

    const preview =
      typeof info.message === "string"
        ? info.message
        : Buffer.isBuffer(info.message)
          ? info.message.toString("utf8")
          : null;

    logger.info(
      {
        to: recipients,
        cc,
        subject: options.subject,
        messageId: info.messageId,
        smtpConfigured: Boolean(process.env.SMTP_HOST),
        transport: "smtp",
      },
      preview ? "Mail logged (SMTP not configured)" : "Mail sent",
    );

    if (preview) {
      logger.info({ preview }, "Reminder mail contents");
    }

    return { accepted: recipients, preview };
  } catch (smtpErr) {
    if (graphError) {
      const g = graphError instanceof Error ? graphError.message : String(graphError);
      const s = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      throw new Error(`Email failed via Microsoft Graph (${g}) and SMTP (${s})`);
    }
    throw smtpErr;
  }
}
