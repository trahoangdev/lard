import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(root, ".env");

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const checks = {};

function set(name, ok, detail) {
  checks[name] = { ok, detail };
}

const dbUrl = process.env.DATABASE_URL ?? "";
const isPg = dbUrl.startsWith("postgresql");

set("DATABASE_URL", Boolean(dbUrl), isPg ? "PostgreSQL" : dbUrl.startsWith("file:") ? "SQLite local" : "set");
set(
  "DIRECT_URL",
  Boolean(process.env.DIRECT_URL) || !isPg,
  process.env.DIRECT_URL ? "set" : isPg ? "MISSING" : "n/a",
);
set("SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing");
set("SUPABASE_PUBLISHABLE", Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), "set");
set("SUPABASE_SECRET", Boolean(process.env.SUPABASE_SECRET_KEY), process.env.SUPABASE_SECRET_KEY ? "set" : "missing");
set(
  "SUPABASE_STORAGE",
  process.env.SUPABASE_USE_STORAGE !== "false",
  process.env.SUPABASE_USE_STORAGE !== "false" ? "enabled" : "disabled",
);
set("OPENAI_KEY", Boolean(process.env.OPENAI_API_KEY?.trim()), process.env.OPENAI_MODEL ?? "gpt-4o-mini");

try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const count = await prisma.employee.count();
  await prisma.$disconnect();
  set("PRISMA_DB", true, `connected (${count} employees)`);
} catch (e) {
  set("PRISMA_DB", false, e instanceof Error ? e.message : String(e));
}

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.auth.getSession();
  if (error) throw error;
  set("SUPABASE_API", true, "connected");
} catch (e) {
  set("SUPABASE_API", false, e instanceof Error ? e.message : String(e));
}

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "payroll-artifacts";
  if (process.env.SUPABASE_USE_STORAGE === "false") {
    set("STORAGE_BUCKET", true, "skipped (local disk mode)");
  } else {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(bucket).list("", { limit: 1 });
    if (error) throw error;
    set("STORAGE_BUCKET", true, `bucket "${bucket}" ok`);
  }
} catch (e) {
  set("STORAGE_BUCKET", false, e instanceof Error ? e.message : String(e));
}

try {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("missing key");
  const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  set("OPENAI", res.ok, res.ok ? "connected" : `HTTP ${res.status}`);
} catch (e) {
  set("OPENAI", false, e instanceof Error ? e.message : String(e));
}

console.log(JSON.stringify(checks, null, 2));
