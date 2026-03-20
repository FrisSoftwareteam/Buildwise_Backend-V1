import { Router, type IRouter } from "express";
import { db, vendorsTable, vendorProjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// VENDORS
router.get("/vendors", async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select().from(vendorsTable);
    if (status) {
      const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.status, status as string));
      return res.json(vendors);
    }
    const vendors = await query.orderBy(vendorsTable.name);
    res.json(vendors);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { name, contactName, contactEmail, contactPhone, country, status, specialization, registrationNumber } = req.body;
    const [vendor] = await db.insert(vendorsTable).values({
      name, contactName, contactEmail, contactPhone, country, status: status || "pending", specialization, registrationNumber
    }).returning();
    res.status(201).json(vendor);
  } catch (e) {
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
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
    const [vendor] = await db.update(vendorsTable).set({
      name, contactName, contactEmail, contactPhone, country, status, specialization, registrationNumber
    }).where(eq(vendorsTable.id, id)).returning();
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vendorsTable).where(eq(vendorsTable.id, id));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

// VENDOR PROJECTS
router.get("/vendor-projects", async (req, res) => {
  try {
    const { vendorId, stage } = req.query;
    let vps = await db.select().from(vendorProjectsTable).orderBy(vendorProjectsTable.createdAt);
    if (vendorId) vps = vps.filter(vp => vp.vendorId === parseInt(vendorId as string));
    if (stage) vps = vps.filter(vp => vp.stage === stage);
    res.json(vps);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch vendor projects" });
  }
});

router.post("/vendor-projects", async (req, res) => {
  try {
    const { vendorId, title, description, estimatedValue, handoverDate } = req.body;
    const [vp] = await db.insert(vendorProjectsTable).values({
      vendorId, title, description, estimatedValue, handoverDate, stage: "submitted"
    }).returning();
    res.status(201).json(vp);
  } catch (e) {
    res.status(500).json({ error: "Failed to create vendor project" });
  }
});

router.get("/vendor-projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [vp] = await db.select().from(vendorProjectsTable).where(eq(vendorProjectsTable.id, id));
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
    const updates: Record<string, unknown> = { title, description, estimatedValue, handoverDate, reviewNotes, projectId, updatedAt: new Date() };
    if (stage) {
      updates.stage = stage;
      if (stage === "under_review" || stage === "negotiation") updates.reviewedAt = new Date();
      if (stage === "approved") updates.approvedAt = new Date();
    }
    const [vp] = await db.update(vendorProjectsTable).set(updates).where(eq(vendorProjectsTable.id, id)).returning();
    if (!vp) return res.status(404).json({ error: "Vendor project not found" });
    res.json(vp);
  } catch (e) {
    res.status(500).json({ error: "Failed to update vendor project" });
  }
});

export default router;
