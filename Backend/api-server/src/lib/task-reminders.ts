import {
  getProjectById,
  listOverdueOpenTasks,
  listProjectManagers,
  todayDateStamp,
  updateTask,
} from "@workspace/db";
import { logger } from "./logger";
import { sendMail } from "./mailer";

const CHECK_EVERY_MS = 15 * 60 * 1000;

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

export async function sendOverdueTaskReminders() {
  const today = todayDateStamp();
  const [overdueTasks, managers] = await Promise.all([
    listOverdueOpenTasks(),
    listProjectManagers(),
  ]);

  const pending = overdueTasks.filter((task) => task.overdueReminderSentOn !== today);
  if (pending.length === 0) {
    logger.info({ overdue: overdueTasks.length }, "No new overdue task reminders to send");
    return { sent: false, count: 0 };
  }

  const recipients = managers
    .map((manager) => manager.email)
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    logger.warn({ count: pending.length }, "Overdue tasks found but no project managers to email");
    return { sent: false, count: pending.length };
  }

  const lines = await Promise.all(
    pending.map(async (task) => {
      const project = await getProjectById(task.projectId);
      return `• TSK-${task.id} “${task.title}” on ${project?.name || `product #${task.projectId}`} — timeline ${formatDate(task.dueDate)}, still ${task.status.replace("_", " ")}`;
    }),
  );

  const text = [
    "The following software tasks have missed their timeline and are still open:",
    "",
    ...lines,
    "",
    "Please follow up with the team and update the timeline if the date has changed.",
    "",
    "— BuildWise",
  ].join("\n");

  await sendMail({
    to: recipients,
    subject: pending.length === 1
      ? `Task timeline missed: ${pending[0].title}`
      : `${pending.length} task timelines missed`,
    text,
  });

  await Promise.all(
    pending.map((task) => updateTask(task.id, { overdueReminderSentOn: today })),
  );

  logger.info(
    { count: pending.length, recipients },
    "Sent overdue task reminder to project management team",
  );

  return { sent: true, count: pending.length };
}

export function startTaskTimelineReminders() {
  const run = () => {
    sendOverdueTaskReminders().catch((error) => {
      logger.error({ error }, "Failed to send overdue task reminders");
    });
  };

  setTimeout(run, 3000);
  setInterval(run, CHECK_EVERY_MS);
  logger.info({ everyMinutes: CHECK_EVERY_MS / 60000 }, "Task timeline reminder job started");
}
