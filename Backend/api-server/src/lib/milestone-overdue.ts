import {
  listOverdueVendorMilestones,
  listVendorMilestonesDueOn,
  todayDateStamp,
  updateMilestone,
} from "@workspace/db";
import { logger } from "./logger";
import { notifyVendorMilestoneDue, notifyVendorMilestoneOverdue } from "./milestone-mail";

const CHECK_EVERY_MS = 15 * 60 * 1000;
const DUE_SOON_DAYS = 3;

function plusDays(stamp: string, days: number) {
  const [year, month, day] = stamp.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mailErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 240) : "Could not send email";
}

export async function sendVendorMilestoneDueReminders() {
  const today = todayDateStamp();
  const soonDate = plusDays(today, DUE_SOON_DAYS);
  const [dueSoon, dueToday] = await Promise.all([
    listVendorMilestonesDueOn(soonDate),
    listVendorMilestonesDueOn(today),
  ]);

  const soonPending = dueSoon.filter((milestone) => milestone.dueSoonAlertSentOn !== today);
  const todayPending = dueToday.filter((milestone) => milestone.dueTodayAlertSentOn !== today);
  let sent = 0;
  let failed = 0;

  for (const milestone of soonPending) {
    try {
      await notifyVendorMilestoneDue(milestone, "soon");
      await updateMilestone(milestone.id, { dueSoonAlertSentOn: today, dueSoonAlertError: null });
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error({ err: error, milestoneId: milestone.id }, "Due-soon vendor mail failed");
      await updateMilestone(milestone.id, { dueSoonAlertError: mailErrorMessage(error) });
    }
  }
  for (const milestone of todayPending) {
    try {
      await notifyVendorMilestoneDue(milestone, "today");
      await updateMilestone(milestone.id, { dueTodayAlertSentOn: today, dueTodayAlertError: null });
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error({ err: error, milestoneId: milestone.id }, "Due-today vendor mail failed");
      await updateMilestone(milestone.id, { dueTodayAlertError: mailErrorMessage(error) });
    }
  }

  const count = sent;
  if (sent === 0 && failed === 0) {
    logger.info({ dueSoon: dueSoon.length, dueToday: dueToday.length }, "No new vendor milestone due reminders");
  } else {
    logger.info({ sent, failed }, "Finished vendor milestone due reminders");
  }
  return { sent: count > 0, count, failed };
}

export async function sendOverdueVendorMilestoneAlerts() {
  const today = todayDateStamp();
  const overdue = await listOverdueVendorMilestones();
  const pending = overdue.filter((milestone) => milestone.overdueAlertSentOn !== today);
  if (pending.length === 0) {
    logger.info({ overdue: overdue.length }, "No new vendor milestone overdue alerts");
    return { sent: false, count: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const milestone of pending) {
    try {
      await notifyVendorMilestoneOverdue(milestone);
      await updateMilestone(milestone.id, { overdueAlertSentOn: today, overdueAlertError: null });
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error({ err: error, milestoneId: milestone.id }, "Overdue vendor mail failed");
      await updateMilestone(milestone.id, { overdueAlertError: mailErrorMessage(error) });
    }
  }

  logger.info({ sent, failed }, "Finished vendor milestone overdue red alerts");
  return { sent: sent > 0, count: sent, failed };
}

export async function sendVendorMilestoneMails() {
  const due = await sendVendorMilestoneDueReminders();
  const overdue = await sendOverdueVendorMilestoneAlerts();
  return { due, overdue };
}

export function startVendorMilestoneOverdueAlerts() {
  const run = () => {
    sendVendorMilestoneMails().catch((error) => {
      logger.error({ error }, "Failed to send vendor milestone mails");
    });
  };
  setTimeout(run, 8000);
  setInterval(run, CHECK_EVERY_MS);
  logger.info({ everyMinutes: CHECK_EVERY_MS / 60000 }, "Vendor milestone mail job started");
}
