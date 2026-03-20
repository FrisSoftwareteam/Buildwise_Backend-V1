import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, role, department, avatarUrl } = req.body;
    const [user] = await db.insert(usersTable).values({ name, email, role, department, avatarUrl }).returning();
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, department, avatarUrl } = req.body;
    const [user] = await db.update(usersTable).set({ name, email, role, department, avatarUrl }).where(eq(usersTable.id, id)).returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
