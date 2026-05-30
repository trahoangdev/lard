import path from "node:path";
import fs from "node:fs/promises";

export function storageRoot() {
  return path.join(process.cwd(), "storage");
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function runFolder(runId: number, isoDate: string) {
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

