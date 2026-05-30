import path from "node:path";
import fs from "node:fs/promises";
import { downloadObject, uploadObject } from "@/lib/supabase/storage";
import { isSupabaseStorageEnabled } from "@/lib/supabase/server";

export function storageRoot() {
  return path.join(process.cwd(), "storage");
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function runFolder(runId: number, isoDate: string) {
  return `${isoDate}/${runId}`;
}

export function inputXlsxKey(runKey: string, originalName: string) {
  const safe = originalName.replace(/[^\w.-]+/g, "_");
  return `${runKey}/input_${safe}`;
}

export function bankBatchKey(runKey: string) {
  return `${runKey}/bank_batch.csv`;
}

export function payrollResultKey(runKey: string) {
  return `${runKey}/payroll_result.xlsx`;
}

export function runFolderLocal(runId: number, isoDate: string) {
  return path.join(storageRoot(), isoDate, String(runId));
}

export function inputXlsxPath(runDir: string, originalName: string) {
  const safe = originalName.replace(/[^\w.-]+/g, "_");
  return path.join(runDir, `input_${safe}`);
}

export function bankBatchPath(runDir: string) {
  return path.join(runDir, "bank_batch.csv");
}

export function payrollResultPath(runDir: string) {
  return path.join(runDir, "payroll_result.xlsx");
}

function isRelativeStorageKey(storedPath: string) {
  return !path.isAbsolute(storedPath);
}

function isObjectKey(storedPath: string) {
  return isRelativeStorageKey(storedPath) && /^\d{4}-\d{2}-\d{2}\/\d+\//.test(storedPath);
}

function localPathForKey(key: string) {
  return path.join(storageRoot(), key);
}

async function writeLocal(storedPath: string, data: Buffer) {
  await ensureDir(path.dirname(storedPath));
  await fs.writeFile(storedPath, data);
  return storedPath;
}

export async function writeArtifact(storedPath: string, data: Buffer, contentType?: string) {
  if (isRelativeStorageKey(storedPath)) {
    if (isSupabaseStorageEnabled()) {
      try {
        return await uploadObject(storedPath, data, contentType);
      } catch {
        await writeLocal(localPathForKey(storedPath), data);
        return storedPath;
      }
    }

    await writeLocal(localPathForKey(storedPath), data);
    return storedPath;
  }

  return writeLocal(storedPath, data);
}

export async function readArtifact(storedPath: string) {
  if (path.isAbsolute(storedPath)) {
    return fs.readFile(storedPath);
  }

  if (isRelativeStorageKey(storedPath)) {
    if (isSupabaseStorageEnabled()) {
      try {
        return await downloadObject(storedPath);
      } catch {
        /* try local fallback */
      }
    }

    const underStorage = localPathForKey(storedPath);
    try {
      return await fs.readFile(underStorage);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return fs.readFile(storedPath);
      }
      throw err;
    }
  }

  return fs.readFile(storedPath);
}

export function resolveRunDir(storedPath: string) {
  if (isObjectKey(storedPath)) {
    return path.posix.dirname(storedPath);
  }
  return path.dirname(storedPath);
}
