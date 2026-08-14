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
  initialCost?: string | null;
  monthlyCost?: string | null;
  completionRate: string;
  ownerId?: number | null;
  vendorId?: number | null;
  contributors?: ProjectContributor[];
  documents?: ProjectDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export const PROJECT_DOCUMENT_KINDS = ["scope", "manual", "technical", "sign_off"] as const;
export type ProjectDocumentKind = (typeof PROJECT_DOCUMENT_KINDS)[number];

export interface ProjectDocument {
  kind: ProjectDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  storageName: string;
  uploadedAt: Date;
}

export interface ProjectContributor {
  name: string;
  userId?: number | null;
  parts: string[];
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
  overdueReminderSentOn?: string | null;
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

export interface AgmMeeting {
  id: number;
  title: string;
  company: string;
  meetingDate: string;
  venue: string;
  status: string;
  agenda: string;
  quorumRequired: number;
  attendeesExpected: number;
  attendeesPresent: number;
  chair: string;
  secretary: string;
  noticeStatus: string;
  noticeSentAt?: string | null;
  packStatus: string;
  minutes: string;
  minutesStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgmDocument {
  id: number;
  meetingId: number;
  name: string;
  category: string;
  status: string;
  owner: string;
  createdAt: Date;
}

export interface AgmAttendee {
  id: number;
  meetingId: number;
  name: string;
  role: string;
  status: string;
  holding?: string | null;
}

export interface AgmAction {
  id: number;
  meetingId: number;
  title: string;
  owner: string;
  dueDate: string;
  status: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernanceAudit {
  id: number;
  meetingId?: number | null;
  actor: string;
  action: string;
  detail: string;
  createdAt: Date;
}

export interface AgmResolution {
  id: number;
  meetingId: number;
  title: string;
  description: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpsAlert {
  id: number;
  severity: string;
  title: string;
  source: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpsApproval {
  id: number;
  title: string;
  type: string;
  requester: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Playbook {
  id: number;
  name: string;
  category: string;
  ownerId: number;
  status: string;
  steps: string[];
  estimatedMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLog {
  id: number;
  playbookId: number;
  userId: number;
  activity: string;
  minutes: number;
  loggedAt: Date;
  notes?: string | null;
}

type CounterName =
  | "users"
  | "projects"
  | "tasks"
  | "sprints"
  | "comments"
  | "vendors"
  | "vendorProjects"
  | "agmMeetings"
  | "agmResolutions"
  | "opsAlerts"
  | "opsApprovals"
  | "playbooks"
  | "timeLogs"
  | "agmDocuments"
  | "agmAttendees"
  | "agmActions"
  | "governanceAudit";

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
  try {
    dbPromise ??= client.connect().then((connectedClient) => connectedClient.db(dbName));
    const db = await dbPromise;
    await ensureIndexes(db);
    seedPromise ??= ensureSeedData(db);
    await seedPromise;
    return db;
  } catch (error) {
    dbPromise = null;
    seedPromise = null;
    throw error;
  }
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

async function insertManyIfAny<T>(
  collection: { insertMany(docs: T[]): Promise<unknown> },
  docs: T[],
) {
  if (docs.length === 0) {
    return;
  }
  await collection.insertMany(docs);
}

async function ensureSeedData(db: Db) {
  const usersCollection = db.collection<User>("users");
  const existingUsers = await usersCollection.countDocuments();

  if (existingUsers > 0) {
    await ensureWorkItemSeed(db);
    await ensureOpsSeed(db);
    await ensureSoftwareProductKinds(db);
    await ensureSoftwareProductDates(db);
    await ensureSoftwareProductContributors(db);
    await ensureSoftwareProductCosts(db);
    await ensureTaskTimelines(db);
    await ensureVendorUser(db);
    await ensureProjectManagerUser(db);
    return;
  }

  const now = new Date();

  const sharedSeedPassword = await hashPassword("password123");

  const users: User[] = [
    {
      id: 1,
      name: "Segun Adeyemi",
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
    {
      id: 4,
      name: "Ifeanyi Ayodeji",
      email: "ifeanyiayodeji@firstregistrarsnigeria.com",
      password: sharedSeedPassword,
      role: "developer",
      department: "Software",
      avatarUrl: null,
      createdAt: now,
    },
    {
      id: 5,
      name: "Ifeoma Nnadi",
      email: "i.nnadi@crestadvisory.com",
      password: sharedSeedPassword,
      role: "vendor",
      department: "Crest Advisory",
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
      completionRate: "85",
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
      completionRate: "80",
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
      completionRate: "90",
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
      completionRate: "85",
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
      completionRate: "80",
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
      completionRate: "80",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 18,
      name: "Hostings, SSL, Cloud Security",
      description: "Category: Continuous. Ongoing infrastructure — hosting, SSL, and cloud security. This work does not complete.",
      type: "continuous",
      status: "in_progress",
      priority: "high",
      country: "Nigeria",
      budget: null,
      completionRate: "70",
      ownerId: null,
      vendorId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

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

  await insertManyIfAny(usersCollection, users);
  await insertManyIfAny(db.collection<Vendor>("vendors"), vendors);
  await insertManyIfAny(db.collection<Project>("projects"), projects);
  await insertManyIfAny(db.collection<VendorProject>("vendorProjects"), vendorProjects);

  await Promise.all([
    syncCounter("users", users.length, db),
    syncCounter("vendors", vendors.length, db),
    syncCounter("projects", projects.length, db),
    syncCounter("vendorProjects", vendorProjects.length, db),
  ]);

  await ensureWorkItemSeed(db);
  await ensureOpsSeed(db);
  await ensureSoftwareProductKinds(db);
  await ensureSoftwareProductDates(db);
  await ensureSoftwareProductContributors(db);
  await ensureSoftwareProductCosts(db);
  await ensureTaskTimelines(db);
  await ensureVendorUser(db);
  await ensureProjectManagerUser(db);
}

async function ensureVendorUser(db: Db) {
  const usersCollection = db.collection<User>("users");
  const email = "i.nnadi@crestadvisory.com";
  const existing = await usersCollection.findOne({ email });
  if (existing) {
    return;
  }

  const now = new Date();
  const id = await nextSequence("users", db);
  await usersCollection.insertOne({
    id,
    name: "Ifeoma Nnadi",
    email,
    password: await hashPassword("password123"),
    role: "vendor",
    department: "Crest Advisory",
    avatarUrl: null,
    createdAt: now,
  });
}

async function ensureProjectManagerUser(db: Db) {
  const usersCollection = db.collection<User>("users");
  const email = "projectmanager@gmail.com";
  const existing = await usersCollection.findOne({ email });
  if (existing) {
    return;
  }

  const now = new Date();
  const id = await nextSequence("users", db);
  await usersCollection.insertOne({
    id,
    name: "Project Manager",
    email,
    password: await hashPassword("Admin@123"),
    role: "manager",
    department: "Project Management Office",
    avatarUrl: null,
    createdAt: now,
  });
}

async function ensureSoftwareProductKinds(db: Db) {
  const kinds: Record<number, string> = {
    1: "web",
    2: "web",
    3: "web",
    4: "enterprise",
    5: "web",
    6: "mobile",
    7: "web",
    8: "enterprise",
    9: "enterprise",
    10: "enterprise",
    11: "enterprise",
    12: "web",
    13: "mobile",
    14: "enterprise",
    15: "web",
    16: "web",
    17: "desktop",
    18: "continuous",
  };

  await Promise.all(
    Object.entries(kinds).map(([id, type]) =>
      db.collection<Project>("projects").updateOne(
        { id: Number(id), type: { $in: ["internal", "vendor"] } },
        { $set: { type } },
      ),
    ),
  );

  await db.collection<Project>("projects").updateOne(
    { id: 18 },
    {
      $set: {
        type: "continuous",
        status: "in_progress",
        endDate: null,
        description:
          "Category: Continuous. Ongoing infrastructure — hosting, SSL, and cloud security. This work does not complete.",
      },
    },
  );
}

async function ensureSoftwareProductDates(db: Db) {
  const dates: Record<number, { startDate: string | null; endDate: string | null }> = {
    1: { startDate: "2026-01-13", endDate: null },
    2: { startDate: "2026-03-02", endDate: null },
    3: { startDate: "2026-03-10", endDate: null },
    4: { startDate: "2026-04-07", endDate: null },
    5: { startDate: "2026-02-16", endDate: null },
    6: { startDate: "2026-01-20", endDate: null },
    7: { startDate: "2025-11-03", endDate: null },
    8: { startDate: "2026-02-02", endDate: null },
    9: { startDate: "2025-06-02", endDate: "2026-03-28" },
    10: { startDate: "2025-05-12", endDate: "2026-02-20" },
    11: { startDate: "2025-09-01", endDate: "2026-04-15" },
    12: { startDate: "2026-08-04", endDate: null },
    13: { startDate: "2026-08-11", endDate: null },
    14: { startDate: null, endDate: null },
    15: { startDate: "2025-03-10", endDate: "2025-12-18" },
    16: { startDate: "2025-04-07", endDate: "2026-01-30" },
    17: { startDate: "2025-02-03", endDate: "2025-11-21" },
    18: { startDate: "2025-01-06", endDate: null },
  };

  await Promise.all(
    Object.entries(dates).map(([id, value]) =>
      db.collection<Project>("projects").updateOne(
        {
          id: Number(id),
          $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }],
        },
        { $set: { startDate: value.startDate, endDate: value.endDate } },
      ),
    ),
  );
}

async function ensureSoftwareProductContributors(db: Db) {
  const teams: Record<number, string[]> = {
    1: ["Colin", "Ifeanyi Ayodeji", "Pelumi"],
    2: ["Ifeanyi Ayodeji"],
    3: ["Ifeanyi Ayodeji"],
    4: ["Ifeanyi Ayodeji"],
    5: ["Colin", "Ifeanyi Ayodeji", "Pelumi"],
    6: ["Ifeanyi Ayodeji"],
    7: ["Ifeanyi Ayodeji"],
    8: ["Colin", "Pelumi"],
    9: ["Colin"],
    10: ["Colin"],
    11: ["Colin", "Ifeanyi Ayodeji", "Pelumi"],
    12: ["Colin", "Ifeanyi Ayodeji", "Pelumi"],
    13: ["Colin", "Ifeanyi Ayodeji", "Pelumi"],
    14: ["Colin"],
    15: ["Ifeanyi Ayodeji"],
  };

  const defaultParts = (type?: string, id?: number) => {
    if (id === 18 || type === "continuous") return ["cloud_hosting"];
    if (type === "mobile") return ["frontend", "integration"];
    if (type === "desktop") return ["frontend", "backend", "database"];
    if (type === "enterprise") return ["backend", "database", "integration"];
    return ["frontend", "backend"];
  };

  const projects = await db.collection<Project>("projects").find({
    $or: [{ contributors: { $exists: false } }, { contributors: { $size: 0 } }, { contributors: null }],
  }).toArray();

  const users = await db.collection<User>("users").find().toArray();
  const userIdFor = (name: string) => {
    const lower = name.toLowerCase();
    return users.find((user) => user.name.toLowerCase() === lower)?.id ?? null;
  };

  await Promise.all(
    projects.map((project) => {
      const names = teams[project.id] || [];
      if (names.length === 0 && project.id !== 18) {
        return Promise.resolve();
      }
      const people = project.id === 18 ? ["Ifeanyi Ayodeji"] : names;
      return db.collection<Project>("projects").updateOne(
        { id: project.id },
        {
          $set: {
            contributors: people.map((name) => ({
              name,
              userId: userIdFor(name),
              parts: defaultParts(project.type, project.id),
            })),
          },
        },
      );
    }),
  );
}

async function ensureSoftwareProductCosts(db: Db) {
  const costs: Record<number, { initialCost: string; monthlyCost: string }> = {
    1: { initialCost: "18000000", monthlyCost: "450000" },
    2: { initialCost: "8500000", monthlyCost: "120000" },
    3: { initialCost: "6200000", monthlyCost: "80000" },
    4: { initialCost: "15000000", monthlyCost: "250000" },
    5: { initialCost: "9000000", monthlyCost: "150000" },
    6: { initialCost: "12000000", monthlyCost: "200000" },
    7: { initialCost: "14000000", monthlyCost: "220000" },
    8: { initialCost: "11000000", monthlyCost: "180000" },
    9: { initialCost: "7500000", monthlyCost: "90000" },
    10: { initialCost: "5000000", monthlyCost: "70000" },
    11: { initialCost: "3200000", monthlyCost: "40000" },
    12: { initialCost: "4800000", monthlyCost: "60000" },
    13: { initialCost: "2700000", monthlyCost: "35000" },
    14: { initialCost: "4100000", monthlyCost: "55000" },
    15: { initialCost: "6500000", monthlyCost: "85000" },
    16: { initialCost: "8000000", monthlyCost: "100000" },
    17: { initialCost: "3600000", monthlyCost: "45000" },
    18: { initialCost: "2500000", monthlyCost: "1850000" },
  };

  await Promise.all(
    Object.entries(costs).map(([id, value]) =>
      db.collection<Project>("projects").updateOne(
        {
          id: Number(id),
          $or: [{ initialCost: { $exists: false } }, { initialCost: null }, { initialCost: "" }],
        },
        {
          $set: {
            initialCost: value.initialCost,
            monthlyCost: value.monthlyCost,
            budget: value.initialCost,
          },
        },
      ),
    ),
  );
}

function dateStamp(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysStamp(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return dateStamp(next);
}

async function ensureTaskTimelines(db: Db) {
  const tasks = await db.collection<Task>("tasks").find({
    $or: [{ dueDate: { $exists: false } }, { dueDate: null }, { dueDate: "" }],
  }).toArray();
  if (tasks.length === 0) {
    return;
  }

  const sprints = await db.collection<Sprint>("sprints").find().toArray();
  const sprintById = new Map(sprints.map((sprint) => [sprint.id, sprint]));

  await Promise.all(
    tasks.map((task) => {
      const sprint = task.sprintId ? sprintById.get(task.sprintId) : undefined;
      const dueDate = sprint?.endDate || addDaysStamp(task.createdAt, 14);
      return db.collection<Task>("tasks").updateOne(
        { id: task.id },
        { $set: { dueDate } },
      );
    }),
  );
}

async function ensureWorkItemSeed(db: Db) {
  const existingTasks = await db.collection<Task>("tasks").countDocuments();
  if (existingTasks > 0) {
    return;
  }

  const now = new Date();

  const sprints: Sprint[] = [
    {
      id: 1,
      projectId: 1,
      name: "Sprint 12 — Registry Core",
      goal: "Ship shareholder search and dividend file export for Web Estock.",
      status: "active",
      startDate: "2026-08-04",
      endDate: "2026-08-22",
      createdAt: now,
    },
    {
      id: 2,
      projectId: 1,
      name: "Sprint 11 — Data Integrity",
      goal: "Close register reconciliation defects from the last release.",
      status: "completed",
      startDate: "2026-07-14",
      endDate: "2026-08-01",
      createdAt: now,
    },
    {
      id: 3,
      projectId: 2,
      name: "Sprint 4 — Rebuild Foundations",
      goal: "Replace legacy requisition forms with the new workflow.",
      status: "active",
      startDate: "2026-08-04",
      endDate: "2026-08-22",
      createdAt: now,
    },
    {
      id: 4,
      projectId: 2,
      name: "Sprint 5 — Approvals",
      goal: "Add multi-level approval routing and an audit trail.",
      status: "planned",
      startDate: "2026-08-25",
      endDate: "2026-09-12",
      createdAt: now,
    },
  ];

  const tasks: Task[] = [
    {
      id: 1,
      projectId: 1,
      sprintId: 1,
      title: "Shareholder search by CSCS and certificate number",
      description: "Build the Estock search that registry officers use during transfer and dividend queries.",
      status: "in_progress",
      priority: "high",
      type: "story",
      assigneeId: 4,
      reporterId: 1,
      storyPoints: 8,
      dueDate: "2026-08-18",
      label: "estock",
      position: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      projectId: 1,
      sprintId: 1,
      title: "Dividend file export for Nigerian Breweries",
      description: "Generate bank-ready dividend schedules from the live register.",
      status: "todo",
      priority: "high",
      type: "story",
      assigneeId: 3,
      reporterId: 1,
      storyPoints: 5,
      dueDate: "2026-08-20",
      label: "dividends",
      position: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      projectId: 1,
      sprintId: 1,
      title: "Fix off-market transfer validation",
      description: "Signature and document checks are skipping expired IDs.",
      status: "in_review",
      priority: "critical",
      type: "bug",
      assigneeId: 4,
      reporterId: 2,
      storyPoints: 3,
      dueDate: "2026-08-10",
      label: "transfers",
      position: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      projectId: 1,
      sprintId: 2,
      title: "Reconcile duplicate shareholder records",
      description: "Completed cleanup of duplicate register entries from the CSCS sync.",
      status: "done",
      priority: "high",
      type: "task",
      assigneeId: 3,
      reporterId: 1,
      storyPoints: 5,
      dueDate: "2026-08-01",
      label: "data-quality",
      position: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      projectId: 1,
      sprintId: null,
      title: "Probate transmission workflow",
      description: "Capture death certificate, letter of administration, and beneficiary transfer in one flow.",
      status: "backlog",
      priority: "medium",
      type: "epic",
      assigneeId: null,
      reporterId: 2,
      storyPoints: 13,
      dueDate: "2026-09-12",
      label: "probate",
      position: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      projectId: 1,
      sprintId: null,
      title: "KYC refresh reminder for dormant accounts",
      description: "Notify investor services when BVN/NIN records are older than 24 months.",
      status: "backlog",
      priority: "medium",
      type: "story",
      assigneeId: 2,
      reporterId: 1,
      storyPoints: 5,
      dueDate: "2026-09-05",
      label: "kyc",
      position: 6,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 7,
      projectId: 2,
      sprintId: 3,
      title: "Rebuild requisition request form",
      description: "Replace the legacy form with department, budget code, and attachment support.",
      status: "in_progress",
      priority: "high",
      type: "story",
      assigneeId: 4,
      reporterId: 2,
      storyPoints: 8,
      dueDate: "2026-08-19",
      label: "v2",
      position: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 8,
      projectId: 2,
      sprintId: 3,
      title: "Manager approval queue",
      description: "Allow project managers to approve or return requisitions with comments.",
      status: "todo",
      priority: "high",
      type: "story",
      assigneeId: 2,
      reporterId: 1,
      storyPoints: 5,
      dueDate: "2026-08-21",
      label: "approvals",
      position: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 9,
      projectId: 2,
      sprintId: 3,
      title: "PDF preview fails for large attachments",
      description: "Files over 8MB time out in the rebuild preview pane.",
      status: "in_review",
      priority: "medium",
      type: "bug",
      assigneeId: 3,
      reporterId: 4,
      storyPoints: 2,
      dueDate: "2026-08-16",
      label: "attachments",
      position: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 10,
      projectId: 2,
      sprintId: null,
      title: "Finance posting integration",
      description: "Push approved requisitions into the finance ledger once Sprint 5 starts.",
      status: "backlog",
      priority: "medium",
      type: "story",
      assigneeId: null,
      reporterId: 1,
      storyPoints: 8,
      dueDate: "2026-09-12",
      label: "finance",
      position: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 11,
      projectId: 2,
      sprintId: null,
      title: "Audit trail for status changes",
      description: "Record who approved, returned, or cancelled each requisition.",
      status: "backlog",
      priority: "high",
      type: "task",
      assigneeId: 4,
      reporterId: 2,
      storyPoints: 3,
      dueDate: "2026-08-28",
      label: "compliance",
      position: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 12,
      projectId: 7,
      sprintId: null,
      title: "Online Access session timeout",
      description: "Shareholders stay signed in after idle timeout on the investor portal.",
      status: "todo",
      priority: "critical",
      type: "bug",
      assigneeId: 4,
      reporterId: 1,
      storyPoints: 3,
      dueDate: "2026-08-17",
      label: "security",
      position: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const comments: Comment[] = [
    {
      id: 1,
      taskId: 1,
      authorId: 1,
      content: "Please match the E-Stock search fields used by the call centre: name, CSCS, and certificate number.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      taskId: 3,
      authorId: 2,
      content: "Legal flagged expired IDs on two off-market transfers last week. This should block submission.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      taskId: 7,
      authorId: 4,
      content: "Draft form is in review. Budget code is now required before a request can be submitted.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await insertManyIfAny(db.collection<Sprint>("sprints"), sprints);
  await insertManyIfAny(db.collection<Task>("tasks"), tasks);
  await insertManyIfAny(db.collection<Comment>("comments"), comments);

  await Promise.all([
    syncCounter("sprints", sprints.length, db),
    syncCounter("tasks", tasks.length, db),
    syncCounter("comments", comments.length, db),
  ]);
}

async function ensureOpsSeed(db: Db) {
  const existingMeetings = await db.collection<AgmMeeting>("agmMeetings").countDocuments();
  if (existingMeetings > 0) {
    await ensureAgmBoardSeed(db);
    return;
  }

  const now = new Date();

  const meetings: AgmMeeting[] = [
    {
      id: 1,
      title: "2026 Annual General Meeting",
      company: "First Registrars and Investor Services",
      meetingDate: "2026-09-18",
      venue: "Civic Centre, Victoria Island, Lagos",
      status: "planning",
      agenda: "Chairman’s report, audited accounts, dividend declaration, appointment of directors, and auditor reappointment.",
      quorumRequired: 60,
      attendeesExpected: 420,
      attendeesPresent: 0,
      chair: "Segun Adeyemi",
      secretary: "Amaka Eze",
      noticeStatus: "draft",
      noticeSentAt: null,
      packStatus: "assembling",
      minutes: "",
      minutesStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      title: "Extraordinary General Meeting — Dividend",
      company: "Nigerian Breweries Plc",
      meetingDate: "2026-08-28",
      venue: "Iganmu House, Lagos",
      status: "notice_issued",
      agenda: "Special resolution on interim dividend and mandate update for unclaimed dividends.",
      quorumRequired: 50,
      attendeesExpected: 180,
      attendeesPresent: 64,
      chair: "Segun Adeyemi",
      secretary: "Amaka Eze",
      noticeStatus: "distributed",
      noticeSentAt: "2026-08-07",
      packStatus: "distributed",
      minutes: "",
      minutesStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      title: "Class Meeting — Probate Beneficiaries",
      company: "Access Holdings Plc",
      meetingDate: "2026-08-21",
      venue: "First Registrars Boardroom, Yaba",
      status: "voting",
      agenda: "Transmission of shares and approval of beneficiary register updates.",
      quorumRequired: 40,
      attendeesExpected: 36,
      attendeesPresent: 29,
      chair: "Segun Adeyemi",
      secretary: "Ifeanyi Ayodeji",
      noticeStatus: "distributed",
      noticeSentAt: "2026-08-08",
      packStatus: "distributed",
      minutes: "The class meeting opened at 10:05. Quorum was confirmed. Resolution PH-2044 was put to a vote.",
      minutesStatus: "draft",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const resolutions: AgmResolution[] = [
    {
      id: 1,
      meetingId: 1,
      title: "Adopt 2025 audited financial statements",
      description: "Receive and adopt the audited accounts and directors’ report for the year ended 31 December 2025.",
      status: "draft",
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      meetingId: 2,
      title: "Approve interim dividend of N1.20 per share",
      description: "Authorize payment of an interim dividend to shareholders on the register as at the qualification date.",
      status: "open",
      votesFor: 112,
      votesAgainst: 8,
      votesAbstain: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      meetingId: 3,
      title: "Approve probate transmission batch PH-2044",
      description: "Authorize update of the register for deceased shareholders with completed letters of administration.",
      status: "open",
      votesFor: 21,
      votesAgainst: 2,
      votesAbstain: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      meetingId: 3,
      title: "Reject incomplete probate files",
      description: "Return files missing death certificates or bank mandates to Investor Services.",
      status: "passed",
      votesFor: 28,
      votesAgainst: 3,
      votesAbstain: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const alerts: OpsAlert[] = [
    {
      id: 1,
      severity: "critical",
      title: "NB EGM quorum is 14 attendees short of the required 50%",
      source: "AGM Operations",
      status: "open",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      severity: "high",
      title: "Dividend schedule checksum mismatch for Nigerian Breweries",
      source: "Dividend Engine",
      status: "acknowledged",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      severity: "medium",
      title: "2,140 investor KYC records expire within 30 days",
      source: "1stCheck / CleCheck",
      status: "open",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      severity: "low",
      title: "AGM notice publication window opens in 5 days",
      source: "Compliance Playbook",
      status: "resolved",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const approvals: OpsApproval[] = [
    {
      id: 1,
      title: "Publish FRIS 2026 AGM notice in The Guardian",
      type: "agm",
      requester: "Segun Adeyemi",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      title: "Off-market transfer batch OT-8891",
      type: "transfer",
      requester: "Amaka Eze",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      title: "Release Nexa Infra milestone invoice",
      type: "vendor",
      requester: "David Okon",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      title: "NB interim dividend file to paying bank",
      type: "dividend",
      requester: "Ifeanyi Ayodeji",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const playbooks: Playbook[] = [
    {
      id: 1,
      name: "AGM meeting-day runbook",
      category: "AGM",
      ownerId: 1,
      status: "active",
      steps: [
        "Confirm venue, registration desks, and proxy packs",
        "Open attendance register and verify quorum",
        "Run resolutions and capture votes",
        "Prepare minutes and file with SEC/CAC",
      ],
      estimatedMinutes: 240,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      name: "Dividend processing",
      category: "Registry",
      ownerId: 2,
      status: "active",
      steps: [
        "Lock qualification register",
        "Generate bank-ready dividend schedule",
        "Reconcile unclaimed dividends",
        "Release payment file and exception report",
      ],
      estimatedMinutes: 180,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      name: "Probate transmission",
      category: "Investor Services",
      ownerId: 4,
      status: "active",
      steps: [
        "Receive death certificate and letter of administration",
        "Verify beneficiary KYC and bank mandate",
        "Update register and issue new certificates",
        "Close the file with audit notes",
      ],
      estimatedMinutes: 120,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      name: "Share transfer verification",
      category: "Compliance",
      ownerId: 3,
      status: "draft",
      steps: [
        "Collect transfer form and share certificate",
        "Verify signatures against the specimen card",
        "Screen against watchlists",
        "Approve and post to E-Stock",
      ],
      estimatedMinutes: 90,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const timeLogs: TimeLog[] = [
    {
      id: 1,
      playbookId: 1,
      userId: 1,
      activity: "Drafted AGM notice and agenda pack",
      minutes: 95,
      loggedAt: now,
      notes: "Legal review still outstanding for special resolutions.",
    },
    {
      id: 2,
      playbookId: 2,
      userId: 2,
      activity: "Reconciled NB dividend exceptions",
      minutes: 70,
      loggedAt: now,
      notes: "Checksum mismatch escalated to Operations Center.",
    },
    {
      id: 3,
      playbookId: 3,
      userId: 4,
      activity: "Processed probate batch PH-2044",
      minutes: 110,
      loggedAt: now,
      notes: "Three files returned for missing bank mandates.",
    },
    {
      id: 4,
      playbookId: 1,
      userId: 3,
      activity: "Configured e-voting test for class meeting",
      minutes: 45,
      loggedAt: now,
      notes: null,
    },
  ];

  await insertManyIfAny(db.collection<AgmMeeting>("agmMeetings"), meetings);
  await insertManyIfAny(db.collection<AgmResolution>("agmResolutions"), resolutions);
  await insertManyIfAny(db.collection<OpsAlert>("opsAlerts"), alerts);
  await insertManyIfAny(db.collection<OpsApproval>("opsApprovals"), approvals);
  await insertManyIfAny(db.collection<Playbook>("playbooks"), playbooks);
  await insertManyIfAny(db.collection<TimeLog>("timeLogs"), timeLogs);

  await Promise.all([
    syncCounter("agmMeetings", meetings.length, db),
    syncCounter("agmResolutions", resolutions.length, db),
    syncCounter("opsAlerts", alerts.length, db),
    syncCounter("opsApprovals", approvals.length, db),
    syncCounter("playbooks", playbooks.length, db),
    syncCounter("timeLogs", timeLogs.length, db),
  ]);

  await ensureAgmBoardSeed(db);
}

async function ensureAgmBoardSeed(db: Db) {
  await db.collection<AgmMeeting>("agmMeetings").updateOne(
    { id: 1, packStatus: { $exists: false } },
    {
      $set: {
        attendeesPresent: 0,
        chair: "Segun Adeyemi",
        secretary: "Amaka Eze",
        noticeStatus: "draft",
        noticeSentAt: null,
        packStatus: "assembling",
        minutes: "",
        minutesStatus: "not_started",
      },
    },
  );
  await db.collection<AgmMeeting>("agmMeetings").updateOne(
    { id: 2, packStatus: { $exists: false } },
    {
      $set: {
        attendeesPresent: 64,
        chair: "Segun Adeyemi",
        secretary: "Amaka Eze",
        noticeStatus: "distributed",
        noticeSentAt: "2026-08-07",
        packStatus: "distributed",
        minutes: "",
        minutesStatus: "not_started",
      },
    },
  );
  await db.collection<AgmMeeting>("agmMeetings").updateOne(
    { id: 3, packStatus: { $exists: false } },
    {
      $set: {
        attendeesPresent: 29,
        chair: "Segun Adeyemi",
        secretary: "Ifeanyi Ayodeji",
        noticeStatus: "distributed",
        noticeSentAt: "2026-08-08",
        packStatus: "distributed",
        minutes: "The class meeting opened at 10:05. Quorum was confirmed. Resolution PH-2044 was put to a vote.",
        minutesStatus: "draft",
      },
    },
  );

  const existingDocuments = await db.collection<AgmDocument>("agmDocuments").countDocuments();
  if (existingDocuments > 0) {
    return;
  }

  const now = new Date();
  const documents: AgmDocument[] = [
    { id: 1, meetingId: 1, name: "AGM notice (draft)", category: "notice", status: "draft", owner: "Amaka Eze", createdAt: now },
    { id: 2, meetingId: 1, name: "Agenda and chairman’s script", category: "agenda", status: "draft", owner: "Segun Adeyemi", createdAt: now },
    { id: 3, meetingId: 1, name: "2025 audited accounts", category: "accounts", status: "approved", owner: "Finance", createdAt: now },
    { id: 4, meetingId: 1, name: "Proxy and attendance forms", category: "proxy", status: "draft", owner: "Registry", createdAt: now },
    { id: 5, meetingId: 2, name: "EGM notice — The Guardian", category: "notice", status: "distributed", owner: "Amaka Eze", createdAt: now },
    { id: 6, meetingId: 2, name: "Dividend circular and qualification list", category: "accounts", status: "distributed", owner: "Dividend Engine", createdAt: now },
    { id: 7, meetingId: 2, name: "Special resolution pack", category: "resolution", status: "distributed", owner: "Legal", createdAt: now },
    { id: 8, meetingId: 3, name: "Class meeting notice", category: "notice", status: "distributed", owner: "Ifeanyi Ayodeji", createdAt: now },
    { id: 9, meetingId: 3, name: "Probate batch PH-2044 schedule", category: "resolution", status: "distributed", owner: "Investor Services", createdAt: now },
    { id: 10, meetingId: 3, name: "Draft minutes", category: "minutes", status: "draft", owner: "Ifeanyi Ayodeji", createdAt: now },
  ];

  const attendees: AgmAttendee[] = [
    { id: 1, meetingId: 1, name: "Segun Adeyemi", role: "chairman", status: "confirmed", holding: null },
    { id: 2, meetingId: 1, name: "Amaka Eze", role: "secretary", status: "confirmed", holding: null },
    { id: 3, meetingId: 1, name: "Institutional proxy — ARM", role: "shareholder", status: "invited", holding: "12.4%" },
    { id: 4, meetingId: 2, name: "Segun Adeyemi", role: "chairman", status: "present", holding: null },
    { id: 5, meetingId: 2, name: "NB Company Secretary", role: "secretary", status: "present", holding: null },
    { id: 6, meetingId: 2, name: "Stanbic IBTC Nominees", role: "shareholder", status: "proxy", holding: "9.1%" },
    { id: 7, meetingId: 2, name: "Retail shareholders (pooled)", role: "shareholder", status: "confirmed", holding: "18.6%" },
    { id: 8, meetingId: 3, name: "Segun Adeyemi", role: "chairman", status: "present", holding: null },
    { id: 9, meetingId: 3, name: "Estate of A. Okonkwo", role: "shareholder", status: "present", holding: "1.2%" },
    { id: 10, meetingId: 3, name: "Estate of M. Balogun", role: "shareholder", status: "proxy", holding: "0.8%" },
    { id: 11, meetingId: 3, name: "Ifeanyi Ayodeji", role: "registrar", status: "present", holding: null },
  ];

  const actions: AgmAction[] = [
    { id: 1, meetingId: 1, title: "Legal sign-off on special resolutions", owner: "Amaka Eze", dueDate: "2026-08-22", status: "open", source: "Meeting planning", createdAt: now, updatedAt: now },
    { id: 2, meetingId: 1, title: "Book Guardian notice slot", owner: "Segun Adeyemi", dueDate: "2026-08-20", status: "in_progress", source: "Notice distribution", createdAt: now, updatedAt: now },
    { id: 3, meetingId: 2, title: "File EGM outcome with SEC", owner: "Amaka Eze", dueDate: "2026-09-04", status: "open", source: "Compliance", createdAt: now, updatedAt: now },
    { id: 4, meetingId: 3, title: "Post PH-2044 to E-Stock after vote", owner: "Ifeanyi Ayodeji", dueDate: "2026-08-22", status: "in_progress", source: "Resolutions", createdAt: now, updatedAt: now },
    { id: 5, meetingId: 3, title: "Circulate draft minutes to the chair", owner: "Ifeanyi Ayodeji", dueDate: "2026-08-23", status: "open", source: "Minutes", createdAt: now, updatedAt: now },
  ];

  const audit: GovernanceAudit[] = [
    { id: 1, meetingId: 1, actor: "Segun Adeyemi", action: "Created meeting", detail: "Opened the 2026 AGM workspace and assigned secretary.", createdAt: now },
    { id: 2, meetingId: 2, actor: "Amaka Eze", action: "Distributed notice", detail: "Published EGM notice in The Guardian and emailed the board pack.", createdAt: now },
    { id: 3, meetingId: 3, actor: "Ifeanyi Ayodeji", action: "Opened voting", detail: "Quorum confirmed at 29 of 36 expected attendees.", createdAt: now },
    { id: 4, meetingId: 3, actor: "Segun Adeyemi", action: "Passed resolution", detail: "Incomplete probate files resolution marked passed.", createdAt: now },
  ];

  await insertManyIfAny(db.collection<AgmDocument>("agmDocuments"), documents);
  await insertManyIfAny(db.collection<AgmAttendee>("agmAttendees"), attendees);
  await insertManyIfAny(db.collection<AgmAction>("agmActions"), actions);
  await insertManyIfAny(db.collection<GovernanceAudit>("governanceAudit"), audit);

  await Promise.all([
    syncCounter("agmDocuments", documents.length, db),
    syncCounter("agmAttendees", attendees.length, db),
    syncCounter("agmActions", actions.length, db),
    syncCounter("governanceAudit", audit.length, db),
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
    documents: project.documents ?? [],
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

export async function setProjectDocument(id: number, document: ProjectDocument) {
  const project = await getProjectById(id);
  if (!project) return null;
  const documents = [...(project.documents || []).filter((item) => item.kind !== document.kind), document];
  return updateProject(id, { documents });
}

export async function removeProjectDocument(id: number, kind: ProjectDocumentKind) {
  const project = await getProjectById(id);
  if (!project) return null;
  const documents = (project.documents || []).filter((item) => item.kind !== kind);
  return updateProject(id, { documents });
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
  }) as Record<string, unknown>;
  if (updates.dueDate !== undefined && updates.overdueReminderSentOn === undefined) {
    set.overdueReminderSentOn = null;
  }
  await db.collection<Task>("tasks").updateOne({ id }, { $set: set });
  return getTaskById(id);
}

export function todayDateStamp(value = new Date()) {
  return dateStamp(value);
}

export async function listProjectManagers() {
  const db = await getDb();
  const users = await db.collection<User>("users").find({
    role: { $in: ["admin", "manager"] },
  }).sort({ name: 1 }).toArray();
  return stripMongoIds(users);
}

export async function listOverdueOpenTasks() {
  const db = await getDb();
  const today = dateStamp();
  const tasks = await db.collection<Task>("tasks").find({
    status: { $ne: "done" },
    dueDate: { $type: "string", $lt: today },
  }).sort({ dueDate: 1, id: 1 }).toArray();
  return stripMongoIds(tasks);
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

export async function listAgmMeetings() {
  const db = await getDb();
  const meetings = await db.collection<AgmMeeting>("agmMeetings").find().sort({ meetingDate: 1 }).toArray();
  return stripMongoIds(meetings);
}

export async function createAgmMeeting(
  meeting: Omit<AgmMeeting, "id" | "createdAt" | "updatedAt"> & Partial<Pick<AgmMeeting, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const now = new Date();
  const doc: AgmMeeting = {
    attendeesPresent: 0,
    chair: "Segun Adeyemi",
    secretary: "",
    noticeStatus: "draft",
    noticeSentAt: null,
    packStatus: "assembling",
    minutes: "",
    minutesStatus: "not_started",
    id: await nextSequence("agmMeetings"),
    createdAt: meeting.createdAt ?? now,
    updatedAt: meeting.updatedAt ?? now,
    ...meeting,
  };
  await db.collection<AgmMeeting>("agmMeetings").insertOne(doc);
  await recordGovernanceEvent({
    meetingId: doc.id,
    actor: doc.chair || "System",
    action: "Created meeting",
    detail: `Opened ${doc.title} in the AGM board workspace.`,
  });
  return doc;
}

export async function updateAgmMeeting(id: number, updates: Partial<Omit<AgmMeeting, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<AgmMeeting>("agmMeetings").updateOne(
    { id },
    { $set: removeUndefined({ ...updates, updatedAt: new Date() }) },
  );
  const meeting = await db.collection<AgmMeeting>("agmMeetings").findOne({ id });
  return stripMongoId(meeting);
}

export async function listAgmResolutions(meetingId?: number) {
  const db = await getDb();
  const query = meetingId ? { meetingId } : {};
  const resolutions = await db.collection<AgmResolution>("agmResolutions").find(query).sort({ id: 1 }).toArray();
  return stripMongoIds(resolutions);
}

export async function createAgmResolution(
  resolution: Omit<AgmResolution, "id" | "createdAt" | "updatedAt" | "votesFor" | "votesAgainst" | "votesAbstain"> &
    Partial<Pick<AgmResolution, "votesFor" | "votesAgainst" | "votesAbstain" | "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const now = new Date();
  const doc: AgmResolution = {
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    id: await nextSequence("agmResolutions"),
    createdAt: resolution.createdAt ?? now,
    updatedAt: resolution.updatedAt ?? now,
    ...resolution,
  };
  await db.collection<AgmResolution>("agmResolutions").insertOne(doc);
  return doc;
}

export async function voteOnResolution(id: number, choice: "for" | "against" | "abstain") {
  const db = await getDb();
  const field = choice === "for" ? "votesFor" : choice === "against" ? "votesAgainst" : "votesAbstain";
  await db.collection<AgmResolution>("agmResolutions").updateOne(
    { id },
    { $inc: { [field]: 1 }, $set: { updatedAt: new Date(), status: "open" } },
  );
  const resolution = await db.collection<AgmResolution>("agmResolutions").findOne({ id });
  return stripMongoId(resolution);
}

export async function updateAgmResolution(id: number, updates: Partial<Omit<AgmResolution, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<AgmResolution>("agmResolutions").updateOne(
    { id },
    { $set: removeUndefined({ ...updates, updatedAt: new Date() }) },
  );
  const resolution = await db.collection<AgmResolution>("agmResolutions").findOne({ id });
  return stripMongoId(resolution);
}

export async function listOpsAlerts() {
  const db = await getDb();
  const alerts = await db.collection<OpsAlert>("opsAlerts").find().sort({ createdAt: -1 }).toArray();
  return stripMongoIds(alerts);
}

export async function updateOpsAlert(id: number, updates: Partial<Omit<OpsAlert, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<OpsAlert>("opsAlerts").updateOne(
    { id },
    { $set: removeUndefined({ ...updates, updatedAt: new Date() }) },
  );
  const alert = await db.collection<OpsAlert>("opsAlerts").findOne({ id });
  return stripMongoId(alert);
}

export async function listOpsApprovals() {
  const db = await getDb();
  const approvals = await db.collection<OpsApproval>("opsApprovals").find().sort({ createdAt: -1 }).toArray();
  return stripMongoIds(approvals);
}

export async function updateOpsApproval(id: number, updates: Partial<Omit<OpsApproval, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<OpsApproval>("opsApprovals").updateOne(
    { id },
    { $set: removeUndefined({ ...updates, updatedAt: new Date() }) },
  );
  const approval = await db.collection<OpsApproval>("opsApprovals").findOne({ id });
  return stripMongoId(approval);
}

export async function listPlaybooks() {
  const db = await getDb();
  const playbooks = await db.collection<Playbook>("playbooks").find().sort({ name: 1 }).toArray();
  return stripMongoIds(playbooks);
}

export async function createPlaybook(
  playbook: Omit<Playbook, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Playbook, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const now = new Date();
  const doc: Playbook = {
    id: await nextSequence("playbooks"),
    createdAt: playbook.createdAt ?? now,
    updatedAt: playbook.updatedAt ?? now,
    ...playbook,
  };
  await db.collection<Playbook>("playbooks").insertOne(doc);
  return doc;
}

export async function listTimeLogs() {
  const db = await getDb();
  const logs = await db.collection<TimeLog>("timeLogs").find().sort({ loggedAt: -1 }).toArray();
  return stripMongoIds(logs);
}

export async function createTimeLog(
  log: Omit<TimeLog, "id" | "loggedAt"> & Partial<Pick<TimeLog, "loggedAt">>,
) {
  const db = await getDb();
  const doc: TimeLog = {
    id: await nextSequence("timeLogs"),
    loggedAt: log.loggedAt ?? new Date(),
    ...log,
  };
  await db.collection<TimeLog>("timeLogs").insertOne(doc);
  return doc;
}

export async function getOperationsSummary() {
  const [meetings, resolutions, alerts, approvals, playbooks, timeLogs] = await Promise.all([
    listAgmMeetings(),
    listAgmResolutions(),
    listOpsAlerts(),
    listOpsApprovals(),
    listPlaybooks(),
    listTimeLogs(),
  ]);

  return {
    openAlerts: alerts.filter((alert) => alert.status === "open").length,
    pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
    activeMeetings: meetings.filter((meeting) => meeting.status !== "completed").length,
    openResolutions: resolutions.filter((resolution) => resolution.status === "open").length,
    activePlaybooks: playbooks.filter((playbook) => playbook.status === "active").length,
    minutesLogged: timeLogs.reduce((sum, log) => sum + log.minutes, 0),
    openActions: (await listAgmActions()).filter((action) => action.status !== "completed").length,
  };
}

export async function recordGovernanceEvent(entry: Omit<GovernanceAudit, "id" | "createdAt">) {
  const db = await getDb();
  const doc: GovernanceAudit = {
    id: await nextSequence("governanceAudit"),
    createdAt: new Date(),
    ...entry,
  };
  await db.collection<GovernanceAudit>("governanceAudit").insertOne(doc);
  return doc;
}

export async function listAgmDocuments(meetingId?: number) {
  const db = await getDb();
  const query = meetingId ? { meetingId } : {};
  return stripMongoIds(await db.collection<AgmDocument>("agmDocuments").find(query).sort({ id: 1 }).toArray());
}

export async function updateAgmDocument(id: number, updates: Partial<Omit<AgmDocument, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<AgmDocument>("agmDocuments").updateOne({ id }, { $set: removeUndefined(updates) });
  return stripMongoId(await db.collection<AgmDocument>("agmDocuments").findOne({ id }));
}

export async function listAgmAttendees(meetingId?: number) {
  const db = await getDb();
  const query = meetingId ? { meetingId } : {};
  return stripMongoIds(await db.collection<AgmAttendee>("agmAttendees").find(query).sort({ id: 1 }).toArray());
}

export async function updateAgmAttendee(id: number, updates: Partial<Omit<AgmAttendee, "id">>) {
  const db = await getDb();
  await db.collection<AgmAttendee>("agmAttendees").updateOne({ id }, { $set: removeUndefined(updates) });
  const attendee = stripMongoId(await db.collection<AgmAttendee>("agmAttendees").findOne({ id }));
  if (attendee) {
    const present = (await listAgmAttendees(attendee.meetingId)).filter((item) => item.status === "present" || item.status === "proxy").length;
    await updateAgmMeeting(attendee.meetingId, { attendeesPresent: present });
  }
  return attendee;
}

export async function listAgmActions(meetingId?: number) {
  const db = await getDb();
  const query = meetingId ? { meetingId } : {};
  return stripMongoIds(await db.collection<AgmAction>("agmActions").find(query).sort({ dueDate: 1 }).toArray());
}

export async function createAgmAction(
  action: Omit<AgmAction, "id" | "createdAt" | "updatedAt"> & Partial<Pick<AgmAction, "createdAt" | "updatedAt">>,
) {
  const db = await getDb();
  const now = new Date();
  const doc: AgmAction = {
    id: await nextSequence("agmActions"),
    createdAt: action.createdAt ?? now,
    updatedAt: action.updatedAt ?? now,
    ...action,
  };
  await db.collection<AgmAction>("agmActions").insertOne(doc);
  return doc;
}

export async function updateAgmAction(id: number, updates: Partial<Omit<AgmAction, "id" | "createdAt">>) {
  const db = await getDb();
  await db.collection<AgmAction>("agmActions").updateOne(
    { id },
    { $set: removeUndefined({ ...updates, updatedAt: new Date() }) },
  );
  return stripMongoId(await db.collection<AgmAction>("agmActions").findOne({ id }));
}

export async function listGovernanceAudit(meetingId?: number) {
  const db = await getDb();
  const query = meetingId ? { meetingId } : {};
  return stripMongoIds(await db.collection<GovernanceAudit>("governanceAudit").find(query).sort({ createdAt: -1 }).toArray());
}

export async function getAgmWorkspace(meetingId: number) {
  const db = await getDb();
  const meeting = stripMongoId(await db.collection<AgmMeeting>("agmMeetings").findOne({ id: meetingId }));
  if (!meeting) return null;
  const [documents, attendees, resolutions, actions, audit] = await Promise.all([
    listAgmDocuments(meetingId),
    listAgmAttendees(meetingId),
    listAgmResolutions(meetingId),
    listAgmActions(meetingId),
    listGovernanceAudit(meetingId),
  ]);
  const present = attendees.filter((item) => item.status === "present" || item.status === "proxy").length;
  const quorumMet = meeting.attendeesExpected > 0
    ? (present / meeting.attendeesExpected) * 100 >= meeting.quorumRequired
    : present > 0;
  return { meeting, documents, attendees, resolutions, actions, audit, present, quorumMet };
}
