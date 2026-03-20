import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MongoClient, type Db } from "mongodb";

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string | null;
  role: string;
  roles?: string[] | null;
  department: string;
  avatarUrl?: string | null;
  createdAt: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | null;
  completionRate: string;
  ownerId?: number | null;
  vendorId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: number;
  projectId: number;
  sprintId?: number | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  assigneeId?: number | null;
  reporterId?: number | null;
  storyPoints?: number | null;
  dueDate?: string | null;
  label?: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sprint {
  id: number;
  projectId: number;
  name: string;
  goal?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
}

export interface Comment {
  id: number;
  taskId: number;
  authorId?: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: number;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  country?: string | null;
  status: string;
  specialization?: string | null;
  registrationNumber?: string | null;
  createdAt: Date;
}

export interface VendorProject {
  id: number;
  vendorId: number;
  projectId?: number | null;
  title: string;
  description?: string | null;
  stage: string;
  estimatedValue?: string | null;
  submittedAt: Date;
  reviewedAt?: Date | null;
  approvedAt?: Date | null;
  handoverDate?: string | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CounterName =
  | "users"
  | "projects"
  | "tasks"
  | "sprints"
  | "comments"
  | "vendors"
  | "vendorProjects";

type CounterDocument = {
  _id: CounterName;
  value: number;
};

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEYLEN = 64;

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error(
    "MONGODB_URI must be set. Did you forget to provision MongoDB?",
  );
}

const dbName = process.env.MONGODB_DB ?? resolveDbName(mongoUri);
const client = new MongoClient(mongoUri);

let dbPromise: Promise<Db> | null = null;
let seedPromise: Promise<void> | null = null;

function resolveDbName(uri: string) {
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, "");
    return pathname || "buildwise";
  } catch {
    return "buildwise";
  }
}

function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

async function getDb() {
  dbPromise ??= client.connect().then((connectedClient) => connectedClient.db(dbName));
  const db = await dbPromise;
  await ensureIndexes(db);
  seedPromise ??= ensureSeedData(db);
  await seedPromise;
  return db;
}

async function ensureIndexes(db: Db) {
  await db.collection<User>("users").createIndex({ email: 1 }, { unique: true });
}

async function nextSequence(name: CounterName, dbOverride?: Db) {
  const db = dbOverride ?? await getDb();
  const result = await db.collection<CounterDocument>("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  return result?.value ?? 1;
}

async function syncCounter(name: CounterName, currentValue: number, dbOverride?: Db) {
  const db = dbOverride ?? await getDb();
  await db.collection<CounterDocument>("counters").updateOne(
    { _id: name },
    { $max: { value: currentValue } },
    { upsert: true },
  );
}

function stripMongoId<T extends { _id?: unknown }>(doc: T | null) {
  if (!doc) return null;
  const { _id: _discarded, ...rest } = doc;
  return rest;
}

function stripMongoIds<T extends { _id?: unknown }>(docs: T[]) {
  return docs.map((doc) => {
    const { _id: _discarded, ...rest } = doc;
    return rest;
  });
}

async function ensureSeedData(db: Db) {
  const usersCollection = db.collection<User>("users");
  const existingUsers = await usersCollection.countDocuments();

  if (existingUsers > 0) {
    return;
  }

  const now = new Date();

  const sharedSeedPassword = await hashPassword("password123");

  const users: User[] = [
    {
      id: 1,
      name: "Chinedu Obi",
      email: "c.obi@firstregistrars.com",
      password: sharedSeedPassword,
      role: "admin",
      department: "Operations",
      avatarUrl: null,
      createdAt: now,
    },
    {
      id: 2,
      name: "Amaka Eze",
      email: "a.eze@firstregistrars.com",
      password: sharedSeedPassword,
      role: "manager",
      department: "Project Delivery",
      avatarUrl: null,
      createdAt: now,
    },
    {
      id: 3,
      name: "David Okon",
      email: "d.okon@firstregistrars.com",
      password: sharedSeedPassword,
      role: "developer",
      department: "Technology",
      avatarUrl: null,
      createdAt: now,
    },
  ];

  const vendors: Vendor[] = [
    {
      id: 1,
      name: "Nexa Infra",
      contactName: "Lekan Adeyemi",
      contactEmail: "lekan@nexainfra.com",
      contactPhone: "+2348010001000",
      country: "Nigeria",
      status: "active",
      specialization: "Infrastructure",
      registrationNumber: "NG-REG-1001",
      createdAt: now,
    },
    {
      id: 2,
      name: "Atlas Digital",
      contactName: "Mariam Yusuf",
      contactEmail: "mariam@atlasdigital.africa",
      contactPhone: "+2348010002000",
      country: "Ghana",
      status: "active",
      specialization: "Digital Transformation",
      registrationNumber: "GH-REG-2044",
      createdAt: now,
    },
    {
      id: 3,
      name: "Crest Advisory",
      contactName: "Ifeoma Nnadi",
      contactEmail: "ifeoma@crestadvisory.com",
      contactPhone: "+2348010003000",
      country: "Kenya",
      status: "pending",
      specialization: "Compliance",
      registrationNumber: "KE-REG-7780",
      createdAt: now,
    },
  ];

  const projects: Project[] = [
    {
      id: 1,
      name: "Project T (Web Estock)",
      description: "Category: Core Business and Operations. Team: Colin, Ifeanyi, Pelumi.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "75",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      name: "Requisition Portal - Rebuild",
      description: "Category: Core Business and Operations. Team: Ifeanyi. Release: Version 2.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "50",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      name: "Digital PDF - Rebuild",
      description: "Category: Core Business and Operations. Team: Ifeanyi. Release: Version 2.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "50",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      name: "FRISOPS - Deployment Support",
      description: "Category: Core Business and Operations. Team: Ifeanyi.",
      type: "internal",
      status: "in_progress",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "40",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      name: "CleCheck - Recovery",
      description: "Category: Core Business and Operations. Team: Colin, Ifeanyi, Pelumi.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "50",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      name: "FRISMOBILE - Upgrade",
      description: "Category: Core Business and Operations. Team: Ifeanyi. Release: Version 2.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "65",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 7,
      name: "Online Access",
      description: "Category: Core Business and Operations. Team: Ifeanyi. Release: Version 2.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "90",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 8,
      name: "Dividend Solution for NB",
      description: "Category: Core Business and Operations. Team: Colin, Pelumi. Release: Version 1.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "90",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 9,
      name: "Customer Care CRM",
      description: "Category: Customer & Service Platforms. Team: Colin. Platform: Zoho CRM.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 10,
      name: "Mail Division System (Correspondence Solution)",
      description: "Category: Customer & Service Platforms. Team: Colin.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 11,
      name: "FRIS Software Unit Documentation Solution",
      description: "Category: Internal Tools & Documentation. Team: Colin, Ifeanyi, Pelumi.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 12,
      name: "SoluMap",
      description: "Category: New Products & Innovation Initiatives. Team: Colin, Ifeanyi, Pelumi.",
      type: "internal",
      status: "planning",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "5",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 13,
      name: "QR Code Solution",
      description: "Category: New Products & Innovation Initiatives. Team: Colin, Ifeanyi, Pelumi.",
      type: "internal",
      status: "planning",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "5",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 14,
      name: "Appraisal Solution - Upgrade",
      description: "Category: New Products & Innovation Initiatives. Team: Colin. Release: Version 1. Completion rate not provided in source list.",
      type: "internal",
      status: "planning",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "0",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 15,
      name: "First Registrars Website",
      description: "Category: Corporate Web & Digital Presence. Team: Ifeanyi. Release: Version 2.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 16,
      name: "Company Secretarial Portal",
      description: "Category: Corporate Web & Digital Presence. Release: Version 1.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 17,
      name: "Time Attendance Solution",
      description: "Category: Corporate Web & Digital Presence. Release: Version 1.",
      type: "internal",
      status: "completed",
      priority: "medium",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 18,
      name: "Hostings, SSL, Cloud Security",
      description: "Category: Corporate Web & Digital Presence. Ongoing infrastructure, hosting, SSL, and cloud security work. Source completion value: continuous.",
      type: "internal",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "100",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const sprints: Sprint[] = [];

  const tasks: Task[] = [];

  const comments: Comment[] = [];

  const vendorProjects: VendorProject[] = [
    {
      id: 1,
      vendorId: 1,
      projectId: 2,
      title: "Onboarding automation rollout",
      description: "Vendor proposal to accelerate onboarding operations.",
      stage: "negotiation",
      estimatedValue: "4200000",
      submittedAt: now,
      reviewedAt: now,
      approvedAt: null,
      handoverDate: "2026-04-01",
      reviewNotes: "Commercial terms under review.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      vendorId: 3,
      projectId: null,
      title: "Cross-border compliance support",
      description: "Proposal for regional compliance delivery.",
      stage: "submitted",
      estimatedValue: "2500000",
      submittedAt: now,
      reviewedAt: null,
      approvedAt: null,
      handoverDate: null,
      reviewNotes: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await usersCollection.insertMany(users);
  await db.collection<Vendor>("vendors").insertMany(vendors);
  await db.collection<Project>("projects").insertMany(projects);
  await db.collection<Sprint>("sprints").insertMany(sprints);
  await db.collection<Task>("tasks").insertMany(tasks);
  await db.collection<Comment>("comments").insertMany(comments);
  await db.collection<VendorProject>("vendorProjects").insertMany(vendorProjects);

  await Promise.all([
    syncCounter("users", users.length, db),
    syncCounter("vendors", vendors.length, db),
    syncCounter("projects", projects.length, db),
    syncCounter("sprints", sprints.length, db),
    syncCounter("tasks", tasks.length, db),
    syncCounter("comments", comments.length, db),
    syncCounter("vendorProjects", vendorProjects.length, db),
  ]);
}

export async function listUsers() {
  const db = await getDb();
  const users = await db.collection<User>("users").find().sort({ name: 1 }).toArray();
  return stripMongoIds(users);
}

export async function getUserById(id: number) {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ id });
  return stripMongoId(user);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ email });
  return stripMongoId(user);
}

async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEYLEN)) as Buffer;
  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

function isPasswordHash(value: string) {
  return value.startsWith(`${PASSWORD_HASH_PREFIX}:`);
}

async function verifyHashedPassword(password: string, hashedPassword: string) {
  const [prefix, salt, storedHash] = hashedPassword.split(":");
  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !salt ||
    !storedHash
  ) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, PASSWORD_KEYLEN)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function verifyUserPassword(user: Pick<User, "id" | "password">, password: string) {
  if (!user.password) {
    return false;
  }

  if (isPasswordHash(user.password)) {
    return verifyHashedPassword(password, user.password);
  }

  const isLegacyPasswordMatch = user.password === password;
  if (isLegacyPasswordMatch) {
    await updateUser(user.id, { password });
  }
  return isLegacyPasswordMatch;
}

export function sanitizeUser<T extends Pick<User, "password">>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function createUser(
  user: Omit<User, "id" | "createdAt"> & Partial<Pick<User, "createdAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("users");
  const { password, ...rest } = user;
  const doc: User = {
    id: nextId,
    createdAt: user.createdAt ?? new Date(),
    ...rest,
    ...(password ? { password: await hashPassword(password) } : {}),
  };
  await db.collection<User>("users").insertOne(doc);
  return doc;
}

export async function updateUser(
  id: number,
  updates: Partial<Omit<User, "id" | "createdAt">>,
) {
  const db = await getDb();
  const { password, ...rest } = updates;
  const set = removeUndefined({
    ...rest,
    ...(password ? { password: await hashPassword(password) } : {}),
  });
  if (Object.keys(set).length === 0) {
    return getUserById(id);
  }
  await db.collection<User>("users").updateOne({ id }, { $set: set });
  return getUserById(id);
}

export async function deleteUser(id: number) {
  const db = await getDb();
  const result = await db.collection<User>("users").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function listProjects(filters?: {
  type?: string;
  status?: string;
}) {
  const db = await getDb();
  const query = removeUndefined({
    type: filters?.type,
    status: filters?.status,
  });
  const projects = await db
    .collection<Project>("projects")
    .find(query)
    .sort({ updatedAt: 1 })
    .toArray();
  return stripMongoIds(projects);
}

export async function getProjectById(id: number) {
  const db = await getDb();
  const project = await db.collection<Project>("projects").findOne({ id });
  return stripMongoId(project);
}

export async function createProject(
  project: Omit<Project, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<Project, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("projects");
  const now = new Date();
  const doc: Project = {
    id: nextId,
    createdAt: project.createdAt ?? now,
    updatedAt: project.updatedAt ?? now,
    ...project,
  };
  await db.collection<Project>("projects").insertOne(doc);
  return doc;
}

export async function updateProject(
  id: number,
  updates: Partial<Omit<Project, "id" | "createdAt">>,
) {
  const db = await getDb();
  const set = removeUndefined({
    ...updates,
    updatedAt: new Date(),
  });
  await db.collection<Project>("projects").updateOne({ id }, { $set: set });
  return getProjectById(id);
}

export async function deleteProject(id: number) {
  const db = await getDb();
  const result = await db.collection<Project>("projects").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function listTasksByProject(
  projectId: number,
  filters?: {
    sprintId?: number;
    status?: string;
    assigneeId?: number;
  },
) {
  const db = await getDb();
  const query = removeUndefined({
    projectId,
    sprintId: filters?.sprintId,
    status: filters?.status,
    assigneeId: filters?.assigneeId,
  });
  const tasks = await db
    .collection<Task>("tasks")
    .find(query)
    .sort({ position: 1 })
    .toArray();
  return stripMongoIds(tasks);
}

export async function listAllTasks() {
  const db = await getDb();
  const tasks = await db.collection<Task>("tasks").find().toArray();
  return stripMongoIds(tasks);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  const task = await db.collection<Task>("tasks").findOne({ id });
  return stripMongoId(task);
}

export async function createTask(
  task: Omit<Task, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<Task, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("tasks");
  const now = new Date();
  const doc: Task = {
    id: nextId,
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
    ...task,
  };
  await db.collection<Task>("tasks").insertOne(doc);
  return doc;
}

export async function updateTask(
  id: number,
  updates: Partial<Omit<Task, "id" | "createdAt">>,
) {
  const db = await getDb();
  const set = removeUndefined({
    ...updates,
    updatedAt: new Date(),
  });
  await db.collection<Task>("tasks").updateOne({ id }, { $set: set });
  return getTaskById(id);
}

export async function deleteTask(id: number) {
  const db = await getDb();
  const result = await db.collection<Task>("tasks").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function listSprintsByProject(projectId: number) {
  const db = await getDb();
  const sprints = await db
    .collection<Sprint>("sprints")
    .find({ projectId })
    .sort({ createdAt: 1 })
    .toArray();
  return stripMongoIds(sprints);
}

export async function createSprint(
  sprint: Omit<Sprint, "id" | "createdAt"> & Partial<Pick<Sprint, "createdAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("sprints");
  const doc: Sprint = {
    id: nextId,
    createdAt: sprint.createdAt ?? new Date(),
    ...sprint,
  };
  await db.collection<Sprint>("sprints").insertOne(doc);
  return doc;
}

export async function updateSprint(
  id: number,
  updates: Partial<Omit<Sprint, "id" | "createdAt" | "projectId">>,
) {
  const db = await getDb();
  const set = removeUndefined(updates);
  if (Object.keys(set).length === 0) {
    return getSprintById(id);
  }
  await db.collection<Sprint>("sprints").updateOne({ id }, { $set: set });
  return getSprintById(id);
}

export async function getSprintById(id: number) {
  const db = await getDb();
  const sprint = await db.collection<Sprint>("sprints").findOne({ id });
  return stripMongoId(sprint);
}

export async function deleteSprint(id: number) {
  const db = await getDb();
  const result = await db.collection<Sprint>("sprints").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function listCommentsByTask(taskId: number) {
  const db = await getDb();
  const comments = await db
    .collection<Comment>("comments")
    .find({ taskId })
    .sort({ createdAt: 1 })
    .toArray();
  return stripMongoIds(comments);
}

export async function createComment(
  comment: Omit<Comment, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<Comment, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("comments");
  const now = new Date();
  const doc: Comment = {
    id: nextId,
    createdAt: comment.createdAt ?? now,
    updatedAt: comment.updatedAt ?? now,
    ...comment,
  };
  await db.collection<Comment>("comments").insertOne(doc);
  return doc;
}

export async function listVendors(filters?: { status?: string }) {
  const db = await getDb();
  const query = removeUndefined({ status: filters?.status });
  const vendors = await db
    .collection<Vendor>("vendors")
    .find(query)
    .sort({ name: 1 })
    .toArray();
  return stripMongoIds(vendors);
}

export async function getVendorById(id: number) {
  const db = await getDb();
  const vendor = await db.collection<Vendor>("vendors").findOne({ id });
  return stripMongoId(vendor);
}

export async function createVendor(
  vendor: Omit<Vendor, "id" | "createdAt"> & Partial<Pick<Vendor, "createdAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("vendors");
  const doc: Vendor = {
    id: nextId,
    createdAt: vendor.createdAt ?? new Date(),
    ...vendor,
  };
  await db.collection<Vendor>("vendors").insertOne(doc);
  return doc;
}

export async function updateVendor(
  id: number,
  updates: Partial<Omit<Vendor, "id" | "createdAt">>,
) {
  const db = await getDb();
  const set = removeUndefined(updates);
  if (Object.keys(set).length === 0) {
    return getVendorById(id);
  }
  await db.collection<Vendor>("vendors").updateOne({ id }, { $set: set });
  return getVendorById(id);
}

export async function deleteVendor(id: number) {
  const db = await getDb();
  const result = await db.collection<Vendor>("vendors").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function listVendorProjects(filters?: {
  vendorId?: number;
  stage?: string;
}) {
  const db = await getDb();
  const query = removeUndefined({
    vendorId: filters?.vendorId,
    stage: filters?.stage,
  });
  const vendorProjects = await db
    .collection<VendorProject>("vendorProjects")
    .find(query)
    .sort({ createdAt: 1 })
    .toArray();
  return stripMongoIds(vendorProjects);
}

export async function getVendorProjectById(id: number) {
  const db = await getDb();
  const vendorProject = await db
    .collection<VendorProject>("vendorProjects")
    .findOne({ id });
  return stripMongoId(vendorProject);
}

export async function createVendorProject(
  vendorProject: Omit<VendorProject, "id" | "submittedAt" | "createdAt" | "updatedAt"> &
    Partial<Pick<VendorProject, "submittedAt" | "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const nextId = await nextSequence("vendorProjects");
  const now = new Date();
  const doc: VendorProject = {
    id: nextId,
    submittedAt: vendorProject.submittedAt ?? now,
    createdAt: vendorProject.createdAt ?? now,
    updatedAt: vendorProject.updatedAt ?? now,
    ...vendorProject,
  };
  await db.collection<VendorProject>("vendorProjects").insertOne(doc);
  return doc;
}

export async function updateVendorProject(
  id: number,
  updates: Partial<Omit<VendorProject, "id" | "submittedAt" | "createdAt">>,
) {
  const db = await getDb();
  const set = removeUndefined({
    ...updates,
    updatedAt: new Date(),
  });
  await db.collection<VendorProject>("vendorProjects").updateOne(
    { id },
    { $set: set },
  );
  return getVendorProjectById(id);
}

export async function listAllVendorProjects() {
  const db = await getDb();
  const vendorProjects = await db.collection<VendorProject>("vendorProjects").find().toArray();
  return stripMongoIds(vendorProjects);
}

export async function listAllVendors() {
  const db = await getDb();
  const vendors = await db.collection<Vendor>("vendors").find().toArray();
  return stripMongoIds(vendors);
}
