import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectDocument, ProjectDocumentKind } from "@workspace/db";

export const PROJECT_DOCUMENT_KIND_SET = new Set<ProjectDocumentKind>([
  "scope",
  "manual",
  "technical",
  "sign_off",
]);

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".rtf",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
]);

const uploadRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/projects",
);

export function isProjectDocumentKind(value: string): value is ProjectDocumentKind {
  return PROJECT_DOCUMENT_KIND_SET.has(value as ProjectDocumentKind);
}

function projectDir(projectId: number) {
  return path.join(uploadRoot, String(projectId));
}

function sanitizeFileName(fileName: string) {
  const base = path.basename(fileName).replace(/[^\w.\- ()]/g, "_").trim();
  return (base || "document").slice(0, 120);
}

function fileExtension(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

export function decodeDocumentContent(content: string) {
  const payload = content.includes(",") ? content.slice(content.lastIndexOf(",") + 1) : content;
  return Buffer.from(payload, "base64");
}

export async function saveProjectDocumentFile(input: {
  projectId: number;
  kind: ProjectDocumentKind;
  fileName: string;
  mimeType: string;
  content: string;
}): Promise<ProjectDocument> {
  const fileName = sanitizeFileName(input.fileName);
  const ext = fileExtension(fileName);
  if (!ext) {
    throw new Error("Upload a PDF, Word, Excel, PowerPoint, text, or image file");
  }

  const buffer = decodeDocumentContent(input.content);
  if (!buffer.length) {
    throw new Error("The uploaded file is empty");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error("Each document must be 10 MB or smaller");
  }

  const storageName = `${input.kind}${ext}`;
  const directory = projectDir(input.projectId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storageName), buffer);

  return {
    kind: input.kind,
    fileName,
    mimeType: input.mimeType || "application/octet-stream",
    size: buffer.length,
    storageName,
    uploadedAt: new Date(),
  };
}

export function projectDocumentPath(projectId: number, storageName: string) {
  const resolved = path.resolve(projectDir(projectId), storageName);
  if (!resolved.startsWith(projectDir(projectId))) {
    throw new Error("Invalid document path");
  }
  return resolved;
}

export async function readProjectDocumentText(projectId: number, document: ProjectDocument) {
  const ext = path.extname(document.storageName).toLowerCase();
  if (![".txt", ".md", ".rtf"].includes(ext) && !document.mimeType.startsWith("text/")) {
    return null;
  }
  const buffer = await readFile(projectDocumentPath(projectId, document.storageName));
  return buffer.toString("utf8").slice(0, 20_000);
}

export async function deleteProjectDocumentFile(projectId: number, storageName?: string | null) {
  if (!storageName) return;
  await unlink(projectDocumentPath(projectId, storageName)).catch(() => undefined);
}

export async function deleteAllProjectDocumentFiles(projectId: number) {
  await rm(projectDir(projectId), { recursive: true, force: true });
}
