import { Router, type IRouter } from "express";
import { deleteMilestone, getMilestoneById, updateMilestone } from "@workspace/db";

const router: IRouter = Router();

router.get("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await getMilestoneById(id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });
    res.json(milestone);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch milestone" });
  }
});

router.put("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, dueDate, done, position } = req.body;
    const milestone = await updateMilestone(id, { title, dueDate, done, position });
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });
    res.json(milestone);
  } catch (e) {
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

router.delete("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteMilestone(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

export default router;
