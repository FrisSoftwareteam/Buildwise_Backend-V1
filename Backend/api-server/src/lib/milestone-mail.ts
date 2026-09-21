import {
  getProjectById,
  getVendorById,
  listProjectManagers,
  type Milestone,
} from "@workspace/db";
import { sendMail } from "./mailer";
import { PMO_INVITE_CC } from "./pmo-invite-cc";
import { SUPER_ADMIN_EMAIL } from "./super-admin";
import { vendorNotificationEmails } from "./vendor-emails";

function publicWebUrl() {
  return (
    process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") ||
    `http://127.0.0.1:${process.env.WEB_PORT || 3000}`
  );
}

function formatDate(value?: string | null) {
  if (!value) return "unspecified";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function staffRecipients(excludeEmail?: string) {
  const managers = await listProjectManagers();
  const emails = [
    ...PMO_INVITE_CC,
    SUPER_ADMIN_EMAIL,
    ...managers.map((user) => user.email),
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const skip = (excludeEmail || "").trim().toLowerCase();
  return [...new Set(emails.filter((email) => email !== skip))];
}

export async function notifyMilestoneSubmitted(input: {
  projectId: number;
  vendorName: string;
  milestones: Array<Pick<Milestone, "title" | "dueDate">>;
}) {
  const project = await getProjectById(input.projectId);
  const to = await staffRecipients();
  const lines = input.milestones.map(
    (milestone) => `• ${milestone.title} — due ${formatDate(milestone.dueDate)}`,
  );
  await sendMail({
    to,
    subject: `Vendor milestones submitted: ${project?.name || "software product"}`,
    text: [
      `${input.vendorName} submitted sub-milestones for ${project?.name || "a software product"}.`,
      "",
      ...lines,
      "",
      `Review them in BuildWise: ${publicWebUrl()}/projects/${input.projectId}`,
      "",
      "— BuildWise",
    ].join("\n"),
  });
}

export async function notifyMilestoneEditRequest(milestone: Milestone, reason: string, vendorName: string) {
  const project = await getProjectById(milestone.projectId);
  const to = await staffRecipients();
  await sendMail({
    to,
    subject: `Vendor edit request: ${milestone.title}`,
    text: [
      `${vendorName} asked to edit a submitted milestone on ${project?.name || "a software product"}.`,
      "",
      `Milestone: ${milestone.title}`,
      `Current due date: ${formatDate(milestone.dueDate)}`,
      `Reason: ${reason || "Not provided"}`,
      "",
      `Approve or reject in BuildWise: ${publicWebUrl()}/projects/${milestone.projectId}`,
      "",
      "— BuildWise",
    ].join("\n"),
  });
}

export async function notifyMilestoneReviewRequested(milestone: Milestone, vendorName: string) {
  const project = await getProjectById(milestone.projectId);
  const to = await staffRecipients();
  await sendMail({
    to,
    subject: `Review by admin requested: ${milestone.title}`,
    text: [
      `${vendorName} marked “${milestone.title}” as ready for admin review on ${project?.name || "a software product"}.`,
      "",
      `Due date: ${formatDate(milestone.dueDate)}`,
      "",
      `If the work is complete, open BuildWise and click Completed: ${publicWebUrl()}/projects/${milestone.projectId}`,
      "",
      "— BuildWise",
    ].join("\n"),
  });
}

export async function notifyMilestoneCompleted(milestone: Milestone, vendorName: string, stars: number) {
  const vendor = milestone.vendorId ? await getVendorById(milestone.vendorId) : null;
  const project = await getProjectById(milestone.projectId);
  const to = vendorNotificationEmails(vendor);
  if (to.length === 0) return;
  await sendMail({
    to,
    cc: PMO_INVITE_CC,
    subject: `Milestone completed: ${milestone.title}`,
    text: [
      `Hello ${vendor.contactName || vendorName},`,
      "",
      `Admin marked “${milestone.title}” complete on ${project?.name || "your assigned product"}.`,
      `A star was added to your vendor record. You now have ${stars} star${stars === 1 ? "" : "s"}.`,
      "",
      "— First Registrars PMO",
    ].join("\n"),
  });
}

export async function notifyVendorMilestoneDue(milestone: Milestone, kind: "soon" | "today") {
  const project = await getProjectById(milestone.projectId);
  const vendor = milestone.vendorId ? await getVendorById(milestone.vendorId) : null;
  const vendorEmails = vendorNotificationEmails(vendor);
  if (vendorEmails.length === 0) {
    throw new Error("No vendor email on file");
  }

  const due = formatDate(milestone.dueDate);
  const product = project?.name || "your assigned product";
  const greeting = vendor?.contactName || vendor?.name || "there";
  const link = `${publicWebUrl()}/projects/${milestone.projectId}`;
  const isToday = kind === "today";
  const subject = isToday
    ? `Milestone due today: ${milestone.title}`
    : `Milestone due in 3 days: ${milestone.title}`;
  const lead = isToday
    ? `This is a prompt to submit “${milestone.title}” on ${product}. It is due today (${due}).`
    : `This is a prompt to submit “${milestone.title}” on ${product}. It is due in 3 days (${due}).`;

  await sendMail({
    to: vendorEmails,
    cc: PMO_INVITE_CC,
    subject,
    text: [
      `Hello ${greeting},`,
      "",
      lead,
      "",
      "Open BuildWise and submit or update this milestone before the timeline is missed.",
      link,
      "",
      "— First Registrars PMO",
    ].join("\n"),
    html: [
      `<p>Hello ${greeting},</p>`,
      `<p>${lead}</p>`,
      `<p><strong>Product:</strong> ${product}<br>`,
      `<strong>Milestone:</strong> ${milestone.title}<br>`,
      `<strong>Due date:</strong> ${due}</p>`,
      `<p><a href="${link}" style="display:inline-block;background:#c4a747;color:#0f1c2e;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open in BuildWise</a></p>`,
      "<p>— First Registrars PMO</p>",
    ].join(""),
  });
}

export async function notifyVendorMilestoneOverdue(milestone: Milestone) {
  const project = await getProjectById(milestone.projectId);
  const vendor = milestone.vendorId ? await getVendorById(milestone.vendorId) : null;
  const vendorName = vendor?.name || "A vendor";
  const missedDate = formatDate(milestone.dueDate);
  const vendorEmails = vendorNotificationEmails(vendor);
  const staff = await staffRecipients(vendorEmails[0]);

  await sendMail({
    to: staff,
    subject: `RED ALERT: Vendor missed milestone timeline — ${missedDate}`,
    text: [
      "RED ALERT",
      "",
      `${vendorName} missed a milestone timeline they set themselves.`,
      "",
      `Product: ${project?.name || `product #${milestone.projectId}`}`,
      `Milestone: ${milestone.title}`,
      `Missed date: ${missedDate}`,
      "",
      "Call this vendor immediately and realign the delivery plan.",
      `Open the product: ${publicWebUrl()}/projects/${milestone.projectId}`,
      "",
      "— BuildWise",
    ].join("\n"),
    html: [
      `<p style="color:#b91c1c;font-weight:700;font-size:18px">RED ALERT — missed date ${missedDate}</p>`,
      `<p>${vendorName} missed a milestone timeline they set themselves.</p>`,
      `<p><strong>Product:</strong> ${project?.name || `product #${milestone.projectId}`}<br>`,
      `<strong>Milestone:</strong> ${milestone.title}<br>`,
      `<strong style="color:#b91c1c">Missed date: ${missedDate}</strong></p>`,
      `<p><strong>Call this vendor immediately and realign the delivery plan.</strong></p>`,
      `<p><a href="${publicWebUrl()}/projects/${milestone.projectId}">Open the product in BuildWise</a></p>`,
    ].join(""),
  });

  if (vendorEmails.length > 0) {
    await sendMail({
      to: vendorEmails,
      cc: PMO_INVITE_CC,
      subject: `Caution: you missed the milestone date ${missedDate}`,
      text: [
        `Hello ${vendor.contactName || vendor.name},`,
        "",
        "This is a caution notice. You missed a milestone timeline you set on BuildWise.",
        "",
        `Product: ${project?.name || `product #${milestone.projectId}`}`,
        `Milestone: ${milestone.title}`,
        `Missed date: ${missedDate}`,
        "",
        "First Registrars PMO will contact you to realign this work. Update the plan only after an admin approves an edit request.",
        "",
        "— First Registrars PMO",
      ].join("\n"),
      html: [
        `<p>Hello ${vendor.contactName || vendor.name},</p>`,
        `<p>This is a <strong>caution notice</strong>. You missed a milestone timeline you set on BuildWise.</p>`,
        `<p><strong>Product:</strong> ${project?.name || `product #${milestone.projectId}`}<br>`,
        `<strong>Milestone:</strong> ${milestone.title}<br>`,
        `<strong style="color:#b91c1c">Missed date: ${missedDate}</strong></p>`,
        `<p>First Registrars PMO will contact you to realign this work. Update the plan only after an admin approves an edit request.</p>`,
      ].join(""),
    });
  }
}
