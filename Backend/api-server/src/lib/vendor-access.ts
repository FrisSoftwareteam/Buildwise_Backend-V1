import {
  listProjects,
  listVendorProjects,
  type User,
} from "@workspace/db";
import { getActingUser, isVendorUser } from "./acting-user";

export async function assignedProjectIdsForVendor(vendorId: number) {
  const [projects, vendorProjects] = await Promise.all([
    listProjects(),
    listVendorProjects({ vendorId }),
  ]);
  const ids = new Set<number>();
  for (const project of projects) {
    if (project.vendorId === vendorId) ids.add(project.id);
  }
  for (const row of vendorProjects) {
    if (row.projectId) ids.add(row.projectId);
  }
  return ids;
}

export async function vendorCanAccessProject(user: User | null, projectId: number) {
  if (!user || !isVendorUser(user)) return true;
  if (!user.vendorId) return false;
  const ids = await assignedProjectIdsForVendor(user.vendorId);
  return ids.has(projectId);
}

export async function rejectIfNoProjectAccess(
  req: import("express").Request,
  res: import("express").Response,
  projectId: number,
) {
  const user = await getActingUser(req);
  if (!(await vendorCanAccessProject(user, projectId))) {
    res.status(403).json({ error: "You can only access products assigned to your company." });
    return true;
  }
  return false;
}

export async function filterProjectsForUser<T extends { id: number; vendorId?: number | null }>(
  user: User | null,
  projects: T[],
) {
  if (!user || !isVendorUser(user)) return projects;
  if (!user.vendorId) return [];
  const ids = await assignedProjectIdsForVendor(user.vendorId);
  return projects.filter((project) => ids.has(project.id) || project.vendorId === user.vendorId);
}
