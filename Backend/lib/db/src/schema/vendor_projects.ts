import { pgTable, serial, text, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { projectsTable } from "./projects";

export const vendorProjectsTable = pgTable("vendor_projects", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  projectId: integer("project_id").references(() => projectsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  stage: text("stage").notNull().default("submitted"),
  estimatedValue: numeric("estimated_value", { precision: 15, scale: 2 }),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  handoverDate: date("handover_date"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorProjectSchema = createInsertSchema(vendorProjectsTable).omit({ id: true, submittedAt: true, createdAt: true, updatedAt: true });
export type InsertVendorProject = z.infer<typeof insertVendorProjectSchema>;
export type VendorProject = typeof vendorProjectsTable.$inferSelect;
