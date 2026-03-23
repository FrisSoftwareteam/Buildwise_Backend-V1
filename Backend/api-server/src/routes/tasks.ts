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

const router: IRouter = Router();

// TASKS
router.get("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const task = await getTaskById(id);
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
    const comments = await listCommentsByTask(taskId);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/tasks/:taskId/comments", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { authorId, content } = req.body;
    const comment = await createComment({ taskId, authorId, content });
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

export default router;
