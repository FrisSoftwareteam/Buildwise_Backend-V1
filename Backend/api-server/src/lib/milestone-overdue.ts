import {
  listOverdueVendorMilestones,
  todayDateStamp,
  updateMilestone,
} from "@workspace/db";
import { logger } from "./logger";
import { notifyVendorMilestoneOverdue } from "./milestone-mail";

const CHECK_EVERY_MS = 15 * 60 * 1000;

export async function sendOverdueVendorMilestoneAlerts() {
  const today = todayDateStamp();
  const overdue = await listOverdueVendorMilestones();
  const pending = overdue.filter((milestone) => milestone.overdueAlertSentOn !== today);
  if (pending.length === 0) {
    logger.info({ overdue: overdue.length }, "No new vendor milestone overdue alerts");
    return { sent: false, count: 0 };
  }

  for (const milestone of pending) {
    await notifyVendorMilestoneOverdue(milestone);
    await updateMilestone(milestone.id, { overdueAlertSentOn: today });
  }

  logger.info({ count: pending.length }, "Sent vendor milestone overdue red alerts");
  return { sent: true, count: pending.length };
}

export function startVendorMilestoneOverdueAlerts() {
  const run = () => {
    sendOverdueVendorMilestoneAlerts().catch((error) => {
      logger.error({ error }, "Failed to send vendor milestone overdue alerts");
    });
  };
  setTimeout(run, 8000);
  setInterval(run, CHECK_EVERY_MS);
  logger.info({ everyMinutes: CHECK_EVERY_MS / 60000 }, "Vendor milestone overdue alert job started");
}
