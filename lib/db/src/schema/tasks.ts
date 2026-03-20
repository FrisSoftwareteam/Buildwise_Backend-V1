import { pgTable, serial, text, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { sprintsTable } from "./sprints";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  sprintId: integer("sprint_id").references(() => sprintsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  type: text("type").notNull().default("task"),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  reporterId: integer("reporter_id").references(() => usersTable.id),
  storyPoints: integer("story_points"),
  dueDate: date("due_date"),
  label: text("label"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
