import type { Request } from "express";
import { getUserByEmail, getUserById, type User } from "@workspace/db";

export async function getActingUser(req: Request): Promise<User | null> {
  const idHeader = req.get("x-buildwise-user-id")?.trim();
  if (idHeader && /^\d+$/.test(idHeader)) {
    const user = await getUserById(Number(idHeader));
    if (user) return user;
  }

  const emailHeader = req.get("x-buildwise-user-email")?.trim();
  if (emailHeader) {
    return getUserByEmail(emailHeader);
  }

  return null;
}

export function isVendorUser(user?: Pick<User, "role"> | null) {
  return user?.role === "vendor";
}
