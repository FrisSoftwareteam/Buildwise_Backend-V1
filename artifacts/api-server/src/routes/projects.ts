import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable, sprintsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

// PROJECTS
router.get("/projects", async (req, res) => {
  try {
    const { type, status } = req.query;
    let projects = await db.select().from(projectsTable).orderBy(projectsTable.updatedAt);
    if (type) projects = projects.filter(p => p.type === type);
    if (status) projects = projects.filter(p => p.status === status);
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const { name, description, type, status, priority, country, startDate, endDate, budget, ownerId, vendorId } = req.body;
    const [project] = await db.insert(projectsTable).values({
      name, description, type: type || "internal", status: status || "planning",
      priority: priority || "medium", country, startDate, endDate,
      budget: budget ? String(budget) : undefined, ownerId, vendorId, completionRate: "0"
    }).returning();
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.put("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, type, status, priority, country, startDate, endDate, budget, completionRate, ownerId, vendorId } = req.body;
    const [project] = await db.update(projectsTable).set({
      name, description, type, status, priority, country, startDate, endDate,
      budget: budget !== undefined ? String(budget) : undefined,
      completionRate: completionRate !== undefined ? String(completionRate) : undefined,
      ownerId, vendorId, updatedAt: new Date()
    }).where(eq(projectsTable.id, id)).returning();
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// TASKS
router.get("/projects/:projectId/tasks", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { sprintId, status, assigneeId } = req.query;
    let tasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId)).orderBy(tasksTable.position);
    if (sprintId) tasks = tasks.filter(t => t.sprintId === parseInt(sprintId as string));
    if (status) tasks = tasks.filter(t => t.status === status);
    if (assigneeId) tasks = tasks.filter(t => t.assigneeId === parseInt(assigneeId as string));
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/projects/:projectId/tasks", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { sprintId, title, description, status, priority, type, assigneeId, reporterId, storyPoints, dueDate, label } = req.body;
    const existing = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    const position = existing.length;
    const [task] = await db.insert(tasksTable).values({
      projectId, sprintId, title, description, status: status || "backlog",
      priority: priority || "medium", type: type || "task",
      assigneeId, reporterId, storyPoints, dueDate, label, position
    }).returning();
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// SPRINTS
router.get("/projects/:projectId/sprints", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const sprints = await db.select().from(sprintsTable).where(eq(sprintsTable.projectId, projectId)).orderBy(sprintsTable.createdAt);
    res.json(sprints);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

router.post("/projects/:projectId/sprints", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { name, goal, status, startDate, endDate } = req.body;
    const [sprint] = await db.insert(sprintsTable).values({
      projectId, name, goal, status: status || "planned", startDate, endDate
    }).returning();
    res.status(201).json(sprint);
  } catch (e) {
    res.status(500).json({ error: "Failed to create sprint" });
  }
});

export default router;
