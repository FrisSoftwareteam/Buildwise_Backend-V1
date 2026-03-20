import { Router, type IRouter } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  sanitizeUser,
  updateUser,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/users", async (_req, res) => {
  try {
    const users = await listUsers();
    return res.json(users.map((user) => sanitizeUser(user)));
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, role, department, avatarUrl } = req.body;
    const user = await createUser({ name, email, role, department, avatarUrl });
    return res.status(201).json(sanitizeUser(user));
  } catch (e) {
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(sanitizeUser(user));
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, department, avatarUrl } = req.body;
    const user = await updateUser(id, {
      name,
      email,
      role,
      department,
      avatarUrl,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(sanitizeUser(user));
  } catch (e) {
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteUser(id);
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
