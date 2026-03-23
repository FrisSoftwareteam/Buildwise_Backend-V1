import { Router, type IRouter } from "express";
import {
  createProject,
  createSprint,
  createTask,
  deleteProject,
  getProjectById,
  listProjects,
  listSprintsByProject,
  listTasksByProject,
  updateProject,
} from "@workspace/db";

const router: IRouter = Router();

// PROJECTS
router.get("/projects", async (req, res) => {
  try {
    const { type, status } = req.query;
    const projects = await listProjects({
      type: typeof type === "string" ? type : undefined,
      status: typeof status === "string" ? status : undefined,
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const { name, description, type, status, priority, country, startDate, endDate, budget, ownerId, vendorId } = req.body;
    const project = await createProject({
      name, description, type: type || "internal", status: status || "planning",
      priority: priority || "medium", country, startDate, endDate,
      budget: budget ? String(budget) : undefined, ownerId, vendorId, completionRate: "0"
    });
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const project = await getProjectById(id);
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
    const project = await updateProject(id, {
      name, description, type, status, priority, country, startDate, endDate,
      budget: budget !== undefined ? String(budget) : undefined,
      completionRate: completionRate !== undefined ? String(completionRate) : undefined,
      ownerId, vendorId,
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteProject(id);
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
    const tasks = await listTasksByProject(projectId, {
      sprintId: typeof sprintId === "string" ? parseInt(sprintId) : undefined,
      status: typeof status === "string" ? status : undefined,
      assigneeId: typeof assigneeId === "string" ? parseInt(assigneeId) : undefined,
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/projects/:projectId/tasks", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { sprintId, title, description, status, priority, type, assigneeId, reporterId, storyPoints, dueDate, label } = req.body;
    const existing = await listTasksByProject(projectId);
    const position = existing.length;
    const task = await createTask({
      projectId, sprintId, title, description, status: status || "backlog",
      priority: priority || "medium", type: type || "task",
      assigneeId, reporterId, storyPoints, dueDate, label, position
    });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// SPRINTS
router.get("/projects/:projectId/sprints", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const sprints = await listSprintsByProject(projectId);
    res.json(sprints);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch sprints" });
  }
});

router.post("/projects/:projectId/sprints", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { name, goal, status, startDate, endDate } = req.body;
    const sprint = await createSprint({
      projectId, name, goal, status: status || "planned", startDate, endDate
    });
    res.status(201).json(sprint);
  } catch (e) {
    res.status(500).json({ error: "Failed to create sprint" });
  }
});

export default router;
