import { Router, type IRouter } from "express";
import { listAllTasks, listProjects, listUsers, type Task, type User } from "@workspace/db";

const router: IRouter = Router();

function todayStamp(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOverdue(task: Task, today: string) {
  if (!task.dueDate || task.status === "done") return false;
  return task.dueDate < today;
}

function toNumber(value?: string | null) {
  const n = parseFloat(value || "0");
  return Number.isFinite(n) ? n : 0;
}

type LeanUser = Pick<User, "id" | "name" | "role" | "department">;

function computeUserMetrics(user: LeanUser, tasks: Task[], today: string, cutoff30: Date) {
  const assigned = tasks.filter((t) => t.assigneeId === user.id);
  const completed = assigned.filter((t) => t.status === "done");
  const active = assigned.filter((t) => t.status !== "done");
  const wip = assigned.filter((t) => t.status === "in_progress" || t.status === "in_review");
  const inProgress = assigned.filter((t) => t.status === "in_progress");
  const overdue = active.filter((t) => isOverdue(t, today));

  const completedWithDueDate = completed.filter((t) => t.dueDate);
  const onTimeCompleted = completedWithDueDate.filter((t) => {
    const completedStamp = todayStamp(new Date(t.updatedAt));
    return completedStamp <= (t.dueDate as string);
  });
  const onTimeRate = completedWithDueDate.length > 0
    ? Math.round((onTimeCompleted.length / completedWithDueDate.length) * 1000) / 10
    : null;

  const completedLast30d = completed.filter((t) => new Date(t.updatedAt) >= cutoff30);
  const storyPointsDelivered = completed.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const storyPointsInFlight = active.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const recentCompleted = completed
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      storyPoints: t.storyPoints ?? null,
      completedOn: todayStamp(new Date(t.updatedAt)),
    }));

  return {
    userId: user.id,
    name: user.name,
    role: user.role,
    department: user.department,
    assigned: assigned.length,
    completed: completed.length,
    completedLast30d: completedLast30d.length,
    active: active.length,
    wip: wip.length,
    inProgress: inProgress.length,
    overdue: overdue.length,
    onTimeRate,
    storyPointsDelivered,
    storyPointsInFlight,
    recentCompleted,
  };
}

router.get("/kpis", async (req, res) => {
  try {
    const [tasks, projects, users] = await Promise.all([
      listAllTasks(),
      listProjects(),
      listUsers(),
    ]);

    const today = todayStamp();
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);

    const completedTasks = tasks.filter((t) => t.status === "done");
    const activeTasks = tasks.filter((t) => t.status !== "done");
    const overdueTasks = activeTasks.filter((t) => isOverdue(t, today));
    const completedWithDueDate = completedTasks.filter((t) => t.dueDate);
    const onTimeCompleted = completedWithDueDate.filter((t) => {
      const stamp = todayStamp(new Date(t.updatedAt));
      return stamp <= (t.dueDate as string);
    });
    const orgOnTimeRate = completedWithDueDate.length > 0
      ? Math.round((onTimeCompleted.length / completedWithDueDate.length) * 1000) / 10
      : null;
    const throughput30d = completedTasks.filter((t) => new Date(t.updatedAt) >= cutoff30).length;
    const storyPointsDelivered = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const activeProjects = projects.filter((p) => p.status === "in_progress");
    const completedProjects = projects.filter((p) => p.status === "completed");
    const avgCompletionRate = projects.length > 0
      ? projects.reduce((sum, p) => sum + toNumber(p.completionRate), 0) / projects.length
      : 0;

    const projectOverdueCount = new Map<number, number>();
    for (const t of overdueTasks) {
      projectOverdueCount.set(t.projectId, (projectOverdueCount.get(t.projectId) || 0) + 1);
    }
    const atRiskProjects = activeProjects.filter((p) => {
      const rate = toNumber(p.completionRate);
      return rate < 50 || (projectOverdueCount.get(p.id) || 0) > 0;
    });

    const totalBudget = projects.reduce((sum, p) => sum + toNumber(p.budget), 0);

    // Leaderboard covers anyone who can own work in the software portal
    // (developers, managers, admins) plus anyone else currently holding tasks.
    const relevantUsers = users.filter(
      (u) =>
        u.role === "developer" ||
        u.role === "manager" ||
        u.role === "admin" ||
        tasks.some((t) => t.assigneeId === u.id)
    );
    const leaderboard = relevantUsers
      .map((u) => computeUserMetrics(u, tasks, today, cutoff30))
      .sort((a, b) => {
        // Rank by completed + in-progress work combined, so active work in
        // flight counts toward standing and not only fully finished tasks.
        const scoreA = a.completed + a.inProgress;
        const scoreB = b.completed + b.inProgress;
        return scoreB - scoreA || b.completed - a.completed || b.storyPointsDelivered - a.storyPointsDelivered;
      });

    let personal: ReturnType<typeof computeUserMetrics> | null = null;
    const userIdParam = req.query.userId;
    if (userIdParam) {
      const uid = parseInt(String(userIdParam), 10);
      const user = users.find((u) => u.id === uid);
      if (user) {
        personal = computeUserMetrics(user, tasks, today, cutoff30);
      }
    }

    res.json({
      generatedAt: new Date().toISOString(),
      org: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        onTimeRate: orgOnTimeRate,
        throughput30d,
        storyPointsDelivered,
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
        atRiskProjects: atRiskProjects.length,
        totalBudget,
      },
      leaderboard,
      personal,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to compute KPIs" });
  }
});

export default router;
