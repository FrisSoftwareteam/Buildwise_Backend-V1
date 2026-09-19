import { Router, type IRouter } from "express";
import {
  createComment,
  deleteSprint,
  deleteTask,
  getTaskById,
  listCommentsByTask,
  updateSprint,
  updateTask,
} from "@workspace/db";
import { rejectIfNoProjectAccess } from "../lib/vendor-access";

const router: IRouter = Router();

// TASKS
router.get("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const task = await getTaskById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (await rejectIfNoProjectAccess(req, res, task.projectId)) return;
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await getTaskById(id);
    if (!existing) return res.status(404).json({ error: "Task not found" });
    if (await rejectIfNoProjectAccess(req, res, existing.projectId)) return;
    const { sprintId, title, description, status, priority, type, assigneeId, reporterId, storyPoints, dueDate, label, position } = req.body;
    const task = await updateTask(id, {
      sprintId, title, description, status, priority, type,
      assigneeId, reporterId, storyPoints, dueDate, label,
      position: position !== undefined ? position : undefined,
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await getTaskById(id);
    if (!existing) return res.status(404).json({ error: "Task not found" });
    if (await rejectIfNoProjectAccess(req, res, existing.projectId)) return;
    await deleteTask(id);
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
    const sprint = await updateSprint(id, { name, goal, status, startDate, endDate });
    if (!sprint) return res.status(404).json({ error: "Sprint not found" });
    res.json(sprint);
  } catch (e) {
    res.status(500).json({ error: "Failed to update sprint" });
  }
});

router.delete("/sprints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteSprint(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete sprint" });
  }
});

// COMMENTS
router.get("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await getTaskById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (await rejectIfNoProjectAccess(req, res, task.projectId)) return;
    const comments = await listCommentsByTask(taskId);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await getTaskById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (await rejectIfNoProjectAccess(req, res, task.projectId)) return;
    const { authorId, content } = req.body;
    const comment = await createComment({ taskId, authorId, content });
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

export default router;
