import { Router, type IRouter } from "express";
import {
  listAllTasks,
  listAllVendorProjects,
  listAllVendors,
  listProjects,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res) => {
  try {
    const projects = await listProjects();
    const tasks = await listAllTasks();
    const vendors = await listAllVendors();
    const vendorProjects = await listAllVendorProjects();

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === "in_progress").length;
    const completedProjects = projects.filter(p => p.status === "completed").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "done").length;
    const pendingVendorProjects = vendorProjects.filter(vp =>
      ["submitted", "under_review", "negotiation"].includes(vp.stage)
    ).length;
    const activeVendors = vendors.filter(v => v.status === "active").length;

    const avgCompletionRate = totalProjects > 0
      ? projects.reduce((sum, p) => sum + parseFloat(p.completionRate || "0"), 0) / totalProjects
      : 0;

    const statusCounts: Record<string, number> = {};
    for (const p of projects) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }
    const projectsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const taskStatusCounts: Record<string, number> = {};
    for (const t of tasks) {
      taskStatusCounts[t.status] = (taskStatusCounts[t.status] || 0) + 1;
    }
    const tasksByStatus = Object.entries(taskStatusCounts).map(([status, count]) => ({ status, count }));

    res.json({
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      pendingVendorProjects,
      activeVendors,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      projectsByStatus,
      tasksByStatus,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;
