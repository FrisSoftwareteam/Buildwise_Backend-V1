import { Router, type IRouter } from "express";
import {
  addVendorStar,
  deleteMilestone,
  getMilestoneById,
  getVendorById,
  listMilestonesByProject,
  updateMilestone,
} from "@workspace/db";
import { getActingUser, isVendorUser } from "../lib/acting-user";
import { rejectIfNoProjectAccess } from "../lib/vendor-access";
import { isSuperAdminEmail } from "../lib/super-admin";
import {
  notifyMilestoneCompleted,
  notifyMilestoneEditRequest,
  notifyMilestoneReviewRequested,
  notifyMilestoneSubmitted,
} from "../lib/milestone-mail";

const router: IRouter = Router();

function isStaff(user: { role?: string | null; email?: string | null } | null) {
  return user?.role === "admin" || user?.role === "manager" || isSuperAdminEmail(user?.email);
}

async function loadMilestoneForActor(req: Parameters<typeof getActingUser>[0], res: Parameters<typeof rejectIfNoProjectAccess>[1], id: number) {
  const milestone = await getMilestoneById(id);
  if (!milestone) {
    res.status(404).json({ error: "Milestone not found" });
    return null;
  }
  if (await rejectIfNoProjectAccess(req, res, milestone.projectId)) return null;
  return milestone;
}

router.get("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    res.json(milestone);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch milestone" });
  }
});

router.put("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    const { title, dueDate, done, position } = req.body;
    const vendorOwned = milestone.source === "vendor";

    if (isVendorUser(user)) {
      const canEdit =
        milestone.workflow === "draft" || milestone.workflow === "editable";
      if (!canEdit) {
        return res.status(403).json({
          error: "Ask admin for permission before you can edit this milestone.",
        });
      }
      const updated = await updateMilestone(id, {
        title,
        dueDate,
        position,
      });
      return res.json(updated);
    }

    if (vendorOwned && !isStaff(user) && done !== undefined) {
      return res.status(403).json({ error: "Only admin can mark vendor milestones completed." });
    }

    const milestoneUpdate = await updateMilestone(id, { title, dueDate, done, position });
    res.json(milestoneUpdate);
  } catch (e) {
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

router.delete("/milestones/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (isVendorUser(user) && milestone.workflow !== "draft") {
      return res.status(403).json({ error: "Submitted milestones can only be changed after admin approval." });
    }
    await deleteMilestone(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

router.post("/projects/:projectId/milestones/submit", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (await rejectIfNoProjectAccess(req, res, projectId)) return;
    const user = await getActingUser(req);
    if (!isVendorUser(user) || !user?.vendorId) {
      return res.status(403).json({ error: "Only vendors can submit their milestones." });
    }
    const milestones = await listMilestonesByProject(projectId);
    const drafts = milestones.filter(
      (milestone) =>
        milestone.source === "vendor" &&
        milestone.vendorId === user.vendorId &&
        (milestone.workflow === "draft" || milestone.workflow === "editable"),
    );
    if (drafts.length === 0) {
      return res.status(400).json({ error: "Add at least one sub-milestone with a date before submitting." });
    }
    const missingDate = drafts.find((milestone) => !milestone.dueDate);
    if (missingDate) {
      return res.status(400).json({ error: "Every sub-milestone needs a date before you submit." });
    }
    const now = new Date();
    const submitted = [];
    for (const draft of drafts) {
      submitted.push(
        (await updateMilestone(draft.id, {
          workflow: "submitted",
          submittedAt: now,
        })) ?? draft,
      );
    }
    await notifyMilestoneSubmitted({
      projectId,
      vendorName: user.name,
      milestones: submitted,
    });
    res.json({ submitted: submitted.length, milestones: submitted });
  } catch (e) {
    res.status(500).json({ error: "Failed to submit milestones" });
  }
});

router.post("/milestones/:id/request-edit", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (!isVendorUser(user) || milestone.source !== "vendor") {
      return res.status(403).json({ error: "Only the vendor can request an edit." });
    }
    if (milestone.workflow === "draft" || milestone.workflow === "editable") {
      return res.status(400).json({ error: "You can already edit this milestone." });
    }
    if (milestone.workflow === "completed") {
      return res.status(400).json({ error: "Completed milestones cannot be edited." });
    }
    const reason = String(req.body?.reason || "").trim();
    const updated = await updateMilestone(id, {
      workflow: "edit_requested",
      editRequestReason: reason || "Vendor requested a change",
      editRequestedAt: new Date(),
    });
    await notifyMilestoneEditRequest(updated || milestone, reason, user.name);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to request milestone edit" });
  }
});

router.post("/milestones/:id/approve-edit", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (!isStaff(user)) {
      return res.status(403).json({ error: "Only admin can approve milestone edits." });
    }
    const updated = await updateMilestone(id, { workflow: "editable" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to approve milestone edit" });
  }
});

router.post("/milestones/:id/reject-edit", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (!isStaff(user)) {
      return res.status(403).json({ error: "Only admin can reject milestone edits." });
    }
    const updated = await updateMilestone(id, {
      workflow: "submitted",
      editRequestReason: null,
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to reject milestone edit" });
  }
});

router.post("/milestones/:id/request-review", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (!isVendorUser(user) || milestone.source !== "vendor") {
      return res.status(403).json({ error: "Only the vendor can request admin review." });
    }
    if (milestone.workflow !== "submitted" && milestone.workflow !== "editable") {
      return res.status(400).json({ error: "Submit the milestone before requesting review." });
    }
    const updated = await updateMilestone(id, {
      workflow: "review_requested",
      reviewRequestedAt: new Date(),
    });
    await notifyMilestoneReviewRequested(updated || milestone, user.name);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to request admin review" });
  }
});

router.post("/milestones/:id/complete", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const milestone = await loadMilestoneForActor(req, res, id);
    if (!milestone) return;
    const user = await getActingUser(req);
    if (!isStaff(user)) {
      return res.status(403).json({ error: "Only admin can mark a vendor milestone completed." });
    }
    if (milestone.source !== "vendor") {
      const updated = await updateMilestone(id, { done: true, workflow: "completed" });
      return res.json(updated);
    }
    let stars = 0;
    if (!milestone.starAwarded && milestone.vendorId) {
      const vendor = await addVendorStar(milestone.vendorId);
      stars = vendor?.stars || 1;
    } else if (milestone.vendorId) {
      const vendor = await getVendorById(milestone.vendorId);
      stars = vendor?.stars || 0;
    }
    const updated = await updateMilestone(id, {
      done: true,
      workflow: "completed",
      completedAt: new Date(),
      completedByEmail: user?.email || null,
      starAwarded: true,
    });
    await notifyMilestoneCompleted(updated || milestone, user?.name || "Admin", stars);
    res.json({ milestone: updated, stars });
  } catch (e) {
    res.status(500).json({ error: "Failed to complete milestone" });
  }
});

export default router;
