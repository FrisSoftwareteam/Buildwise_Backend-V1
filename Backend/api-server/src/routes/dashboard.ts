import { Router, type IRouter } from "express";
import {
  listAllTasks,
  listAllVendorProjects,
  listAllVendors,
  listProjects,
} from "@workspace/db";
import { getActingUser } from "../lib/acting-user";
import { filterProjectsForUser } from "../lib/vendor-access";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const user = await getActingUser(req);
    const allProjects = await listProjects();
    const projects = await filterProjectsForUser(user, allProjects);
    const assignedIds = new Set(projects.map((project) => project.id));
    const tasks = (await listAllTasks()).filter((task) => assignedIds.has(task.projectId) || assignedIds.size === allProjects.length);
    const vendors = await listAllVendors();
    const vendorProjects = (await listAllVendorProjects()).filter((row) =>
      !user || user.role !== "vendor" || (user.vendorId && row.vendorId === user.vendorId),
    );

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
