import { Router, type IRouter } from "express";
import { db, tasksTable, sprintsTable, commentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// TASKS
router.get("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { sprintId, title, description, status, priority, type, assigneeId, reporterId, storyPoints, dueDate, label, position } = req.body;
    const [task] = await db.update(tasksTable).set({
      sprintId, title, description, status, priority, type,
      assigneeId, reporterId, storyPoints, dueDate, label,
      position: position !== undefined ? position : undefined,
      updatedAt: new Date()
    }).where(eq(tasksTable.id, id)).returning();
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// SPRINTS
router.put("/sprints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, goal, status, startDate, endDate } = req.body;
    const [sprint] = await db.update(sprintsTable).set({ name, goal, status, startDate, endDate }).where(eq(sprintsTable.id, id)).returning();
    if (!sprint) return res.status(404).json({ error: "Sprint not found" });
    res.json(sprint);
  } catch (e) {
    res.status(500).json({ error: "Failed to update sprint" });
  }
});

router.delete("/sprints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(sprintsTable).where(eq(sprintsTable.id, id));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete sprint" });
  }
});

// COMMENTS
router.get("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const comments = await db.select().from(commentsTable).where(eq(commentsTable.taskId, taskId)).orderBy(commentsTable.createdAt);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { authorId, content } = req.body;
    const [comment] = await db.insert(commentsTable).values({ taskId, authorId, content }).returning();
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

export default router;
