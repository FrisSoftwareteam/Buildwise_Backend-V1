import { Router, type IRouter } from "express";
import {
  createVendor,
  createVendorProject,
  deleteVendor,
  getVendorById,
  getVendorProjectById,
  listVendorProjects,
  listVendors,
  updateVendor,
  updateVendorProject,
} from "@workspace/db";

const router: IRouter = Router();

// VENDORS
router.get("/vendors", async (req, res) => {
  try {
    const { status } = req.query;
    const vendors = await listVendors({
      status: typeof status === "string" ? status : undefined,
    });
    res.json(vendors);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { name, contactName, contactEmail, contactPhone, country, status, specialization, registrationNumber } = req.body;
    const vendor = await createVendor({
      name, contactName, contactEmail, contactPhone, country, status: status || "pending", specialization, registrationNumber
    });
    res.status(201).json(vendor);
  } catch (e) {
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendor = await getVendorById(id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.put("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactName, contactEmail, contactPhone, country, status, specialization, registrationNumber } = req.body;
    const vendor = await updateVendor(id, {
      name, contactName, contactEmail, contactPhone, country, status, specialization, registrationNumber
    });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteVendor(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// VENDOR PROJECTS
router.get("/vendor-projects", async (req, res) => {
  try {
    const { vendorId, stage } = req.query;
    const vps = await listVendorProjects({
      vendorId: typeof vendorId === "string" ? parseInt(vendorId) : undefined,
      stage: typeof stage === "string" ? stage : undefined,
    });
    res.json(vps);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendor projects" });
  }
});

router.post("/vendor-projects", async (req, res) => {
  try {
    const { vendorId, title, description, estimatedValue, handoverDate } = req.body;
    const vp = await createVendorProject({
      vendorId, title, description, estimatedValue, handoverDate, stage: "submitted"
    });
    res.status(201).json(vp);
  } catch (e) {
    res.status(500).json({ error: "Failed to create vendor project" });
  }
});

router.get("/vendor-projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vp = await getVendorProjectById(id);
    if (!vp) return res.status(404).json({ error: "Vendor project not found" });
    res.json(vp);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendor project" });
  }
});

router.put("/vendor-projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, stage, estimatedValue, handoverDate, reviewNotes, projectId } = req.body;
    const updates: Record<string, unknown> = { title, description, estimatedValue, handoverDate, reviewNotes, projectId };
    if (stage) {
      updates.stage = stage;
      if (stage === "under_review" || stage === "negotiation") updates.reviewedAt = new Date();
      if (stage === "approved") updates.approvedAt = new Date();
    }
    const vp = await updateVendorProject(id, updates);
    if (!vp) return res.status(404).json({ error: "Vendor project not found" });
    res.json(vp);
  } catch (e) {
    res.status(500).json({ error: "Failed to update vendor project" });
  }
});

export default router;
