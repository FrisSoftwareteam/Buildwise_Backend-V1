import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
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

export async function sendMail(options: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const recipients = [...new Set(options.to.filter(Boolean))];
  if (recipients.length === 0) {
    logger.warn("Skipping mail: no recipients");
    return { accepted: [] as string[], preview: null as string | null };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || "BuildWise <noreply@buildwise.local>",
    to: recipients.join(", "),
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
      subject: options.subject,
      messageId: info.messageId,
      smtpConfigured: Boolean(process.env.SMTP_HOST),
    },
    preview ? "Task reminder mail logged (SMTP not configured)" : "Task reminder mail sent",
  );

  if (preview) {
    logger.info({ preview }, "Reminder mail contents");
  }

  return { accepted: recipients, preview };
}
