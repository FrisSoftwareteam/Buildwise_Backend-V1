import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const { password: _pw, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const [user] = await db.insert(usersTable).values({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "developer",
      department: department || "Engineering",
    }).returning();
    const { password: _pw, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  } catch (e) {
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;
