import { Router, type IRouter } from "express";
import {
  createVendor,
  createVendorInvite,
  createVendorProject,
  getProjectById,
  getVendorByEmail,
  listUsersByVendorId,
  listVendorProjects,
  updateProject,
  updateVendor,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { sendMail, friendlyMailError } from "../lib/mailer";
import { pmoInviteCc } from "../lib/pmo-invite-cc";
import {
  mergeVendorEmails,
  parseInviteEmails,
  vendorAccountEmails,
  vendorEmailFields,
} from "../lib/vendor-emails";

const router: IRouter = Router();

function publicWebUrl() {
  return (
    process.env.PUBLIC_WEB_URL?.trim().replace(/\/$/, "") ||
    `http://127.0.0.1:${process.env.WEB_PORT || 3000}`
  );
}

function isLocalWebUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function vendorInviteEmail(input: {
  greeting: string;
  productNames: string;
  link: string;
}) {
  const text = [
    `Hello ${input.greeting},`,
    "",
    "You have been invited to BuildWise as an external software vendor.",
    `Assigned software products: ${input.productNames}.`,
    "",
    "Up to two people from your company can sign in to this same vendor account.",
    "You will share the assigned products, milestones, and stars.",
    "",
    "Open this invitation in your browser (do not paste it into Google):",
    `<${input.link}>`,
    "",
    "Then choose Continue with Microsoft or Continue with Google, using the account this invitation was sent to.",
    "",
    "— First Registrars PMO",
  ].join("\n");

  const html = [
    `<p>Hello ${escapeHtml(input.greeting)},</p>`,
    "<p>You have been invited to BuildWise as an external software vendor.</p>",
    `<p>Assigned software products: ${escapeHtml(input.productNames)}.</p>`,
    "<p>Up to two people from your company can sign in to this same vendor account. You will share the assigned products, milestones, and stars.</p>",
    `<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#c4a747;color:#0f1c2e;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Sign in to BuildWise</a></p>`,
    `<p>If the button does not work, copy this full address into your browser address bar. Do not paste it into Google search:</p>`,
    `<p><a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a></p>`,
    "<p>Use the Microsoft or Google account this invitation was sent to.</p>",
    "<p>— First Registrars PMO</p>",
  ].join("");

  return { text, html };
}

router.post("/vendor-invites", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const contactName = String(req.body?.contactName || "").trim();
    const emails = parseInviteEmails(req.body || {});
    const projectIds = Array.isArray(req.body?.projectIds)
      ? req.body.projectIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (!name) {
      return res.status(400).json({ error: "Vendor company name is required" });
    }
    if (emails.length === 0) {
      return res.status(400).json({ error: "Add at least one vendor sign-in email." });
    }
    if (emails.length > 2) {
      return res.status(400).json({ error: "A vendor account can have at most two sign-in emails." });
    }
    if (projectIds.length === 0) {
      return res.status(400).json({ error: "Select at least one software product to assign" });
    }

    const projects = [];
    for (const projectId of projectIds) {
      const project = await getProjectById(projectId);
      if (!project) {
        return res.status(400).json({ error: `Product ${projectId} was not found` });
      }
      projects.push(project);
    }

    let vendor = null;
    for (const email of emails) {
      vendor = await getVendorByEmail(email);
      if (vendor) break;
    }

    if (vendor) {
      const merged = mergeVendorEmails(vendorAccountEmails(vendor), emails);
      if (merged.error) {
        return res.status(400).json({ error: merged.error });
      }
      const members = await listUsersByVendorId(vendor.id);
      const memberEmails = members.map((user) => user.email.toLowerCase());
      const newSeats = emails.filter((email) => !memberEmails.includes(email)).length;
      if (members.length + newSeats > 2) {
        return res.status(400).json({
          error: "This vendor account already has two people signed in. Remove one before inviting another.",
        });
      }
      vendor =
        (await updateVendor(vendor.id, {
          name,
          contactName: contactName || vendor.contactName,
          ...vendorEmailFields(merged.emails),
          status: vendor.status === "rejected" ? "active" : vendor.status,
        })) ?? vendor;
    } else {
      vendor = await createVendor({
        name,
        contactName: contactName || null,
        ...vendorEmailFields(emails),
        contactPhone: null,
        country: null,
        status: "active",
        specialization: "External Software Vendor",
        registrationNumber: null,
      });
    }

    const existingLinks = await listVendorProjects({ vendorId: vendor.id });
    for (const project of projects) {
      await updateProject(project.id, { vendorId: vendor.id });
      const alreadyLinked = existingLinks.some((row) => row.projectId === project.id);
      if (!alreadyLinked) {
        await createVendorProject({
          vendorId: vendor.id,
          projectId: project.id,
          title: project.name,
          description: project.description,
          estimatedValue: null,
          handoverDate: null,
          stage: "approved",
        });
      }
    }

    const productNames = projects.map((project) => project.name).join(", ");
    const invitedBy = typeof req.body?.invitedBy === "string" ? req.body.invitedBy : null;
    const webBase = publicWebUrl();
    const linkWarning = isLocalWebUrl(webBase)
      ? "PUBLIC_WEB_URL is not set to your live BuildWise site, so this invite link will not work for vendors."
      : undefined;
    const invites: Array<{ email: string; link: string }> = [];
    const mailErrors: string[] = [];

    if (linkWarning) {
      logger.error({ webBase }, "Vendor invite used a localhost web URL");
    }

    for (const email of emails) {
      const { token } = await createVendorInvite({
        email,
        vendorId: vendor.id,
        projectIds,
        invitedBy,
      });
      const link = `${webBase}/login?invite=${encodeURIComponent(token)}`;
      invites.push({ email, link });
      const cc = pmoInviteCc(email);
      const { text, html } = vendorInviteEmail({
        greeting: contactName || name,
        productNames,
        link,
      });

      try {
        await sendMail({
          to: [email],
          cc,
          subject: "You're invited to BuildWise",
          text,
          html,
        });
      } catch (e) {
        logger.error({ err: e, email }, "Vendor invite email failed");
        mailErrors.push(friendlyMailError(e));
      }
    }

    return res.status(201).json({
      vendor,
      link: invites[0]?.link,
      invites,
      smtpConfigured: Boolean(process.env.SMTP_HOST),
      cc: pmoInviteCc(),
      projectIds,
      mailError: mailErrors[0],
      linkWarning,
    });
  } catch (e) {
    logger.error({ err: e }, "Vendor invite failed");
    return res.status(500).json({ error: "Failed to send vendor invite" });
  }
});

export default router;
