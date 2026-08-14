import { Router, type IRouter } from "express";
import { createUser, getUserByEmail, sanitizeUser, verifyUserPassword } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/auth/providers", (_req, res) => {
  return res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  });
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isPasswordValid = await verifyUserPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Login failed");
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const user = await createUser({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || "developer",
      department: department || "Engineering",
    });
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (e) {
    logger.error({ err: e }, "Signup failed");
    return res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
