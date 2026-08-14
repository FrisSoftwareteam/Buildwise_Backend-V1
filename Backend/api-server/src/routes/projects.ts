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
  removeProjectDocument,
  setProjectDocument,
  updateProject,
} from "@workspace/db";
import {
  deleteAllProjectDocumentFiles,
  deleteProjectDocumentFile,
  isProjectDocumentKind,
  projectDocumentPath,
  readProjectDocumentText,
  saveProjectDocumentFile,
} from "../lib/project-documents";

const router: IRouter = Router();

const WORK_PARTS = new Set(["frontend", "backend", "database", "integration", "cloud_hosting"]);

function moneyString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value);
}

function sanitizeContributors(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      name: String(item.name).trim(),
      userId: typeof item.userId === "number" ? item.userId : null,
      parts: Array.isArray(item.parts) ? item.parts.filter((part: string) => WORK_PARTS.has(part)) : [],
    }));
}

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
    const { name, description, type, status, priority, country, startDate, endDate, budget, initialCost, monthlyCost, ownerId, vendorId, contributors } = req.body;
    const setupCost = moneyString(initialCost ?? budget);
    const project = await createProject({
      name, description,
      type: type || "web", status: status || "planning",
      priority: priority || "medium", country, startDate, endDate,
      budget: setupCost, initialCost: setupCost, monthlyCost: moneyString(monthlyCost),
      ownerId, vendorId, completionRate: "0",
      contributors: sanitizeContributors(contributors) || [],
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
    const { name, description, type, status, priority, country, startDate, endDate, budget, initialCost, monthlyCost, completionRate, ownerId, vendorId, contributors } = req.body;
    const setupCost = moneyString(initialCost ?? budget);
    const project = await updateProject(id, {
      name, description, type, status, priority, country, startDate, endDate,
      budget: setupCost,
      initialCost: setupCost,
      monthlyCost: moneyString(monthlyCost),
      completionRate: completionRate !== undefined ? String(completionRate) : undefined,
      ownerId, vendorId,
      contributors: sanitizeContributors(contributors),
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
    await deleteAllProjectDocumentFiles(id);
    await deleteProject(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.post("/projects/:id/documents/:kind", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const kind = req.params.kind;
    if (!isProjectDocumentKind(kind)) {
      return res.status(400).json({ error: "Unknown document type" });
    }
    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { fileName, mimeType, content } = req.body || {};
    if (!fileName || !content) {
      return res.status(400).json({ error: "Choose a file to upload" });
    }

    const existing = (project.documents || []).find((item) => item.kind === kind);
    const saved = await saveProjectDocumentFile({
      projectId: id,
      kind,
      fileName: String(fileName),
      mimeType: String(mimeType || "application/octet-stream"),
      content: String(content),
    });
    if (existing?.storageName && existing.storageName !== saved.storageName) {
      await deleteProjectDocumentFile(id, existing.storageName);
    }
    const updated = await setProjectDocument(id, saved);
    res.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to upload document";
    res.status(400).json({ error: message });
  }
});

router.get("/projects/:id/documents/:kind", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const kind = req.params.kind;
    if (!isProjectDocumentKind(kind)) {
      return res.status(400).json({ error: "Unknown document type" });
    }
    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const document = (project.documents || []).find((item) => item.kind === kind);
    if (!document) return res.status(404).json({ error: "Document not uploaded yet" });
    res.download(projectDocumentPath(id, document.storageName), document.fileName);
  } catch (e) {
    res.status(500).json({ error: "Failed to download document" });
  }
});

router.get("/projects/:id/documents/:kind/text", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const kind = req.params.kind;
    if (!isProjectDocumentKind(kind)) {
      return res.status(400).json({ error: "Unknown document type" });
    }
    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const document = (project.documents || []).find((item) => item.kind === kind);
    if (!document) return res.status(404).json({ error: "Document not uploaded yet" });
    const text = await readProjectDocumentText(id, document);
    res.json({ kind, fileName: document.fileName, text });
  } catch (e) {
    res.status(500).json({ error: "Failed to read document" });
  }
});

router.delete("/projects/:id/documents/:kind", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const kind = req.params.kind;
    if (!isProjectDocumentKind(kind)) {
      return res.status(400).json({ error: "Unknown document type" });
    }
    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const existing = (project.documents || []).find((item) => item.kind === kind);
    await deleteProjectDocumentFile(id, existing?.storageName);
    const updated = await removeProjectDocument(id, kind);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to remove document" });
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
    if (!dueDate) {
      return res.status(400).json({ error: "Every task needs a timeline date" });
    }
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
