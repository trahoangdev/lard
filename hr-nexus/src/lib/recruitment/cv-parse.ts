export type ParsedCv = {
  text: string;
  candidateName: string;
  candidateEmail: string;
  phone: string | null;
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;

export function isPdfBinaryGarbage(text: string) {
  const sample = text.slice(0, 400);
  return (
    /^\s*%PDF-/i.test(text) ||
    sample.includes("/Type /Catalog") ||
    sample.includes("endobj") ||
    sample.includes("<?xpacket")
  );
}

/** Decode common PDF literal strings e.g. (Josef Tan) or <48656C6C6F> */
function extractPdfStringLiterals(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const parts: string[] = [];

  for (const m of raw.matchAll(/\(([^\\()]{2,200})\)/g)) {
    const s = m[1].replace(/\\([nrtbf()\\])/g, (_, c) => {
      if (c === "n") return "\n";
      if (c === "r") return "\r";
      if (c === "t") return "\t";
      return c;
    });
    if (/[a-zA-Z]{2,}/.test(s) && !/^[\d\s./\\-]+$/.test(s)) parts.push(s);
  }

  for (const key of ["Author", "Title", "Subject", "Keywords"]) {
    const meta = raw.match(new RegExp(`/${key}\\s*\\(([^)]+)\\)`));
    if (meta?.[1]) parts.unshift(meta[1]);
  }

  return [...new Set(parts)].join("\n");
}

async function extractPdfTextWithParser(buffer: Buffer) {
  const mod = await import("pdf-parse");
  const pdfParse = (mod as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ?? mod;
  const result = await (pdfParse as (b: Buffer) => Promise<{ text?: string }>)(buffer);
  return (result.text ?? "").trim();
}

async function extractPdfText(buffer: Buffer) {
  try {
    const parsed = await extractPdfTextWithParser(buffer);
    if (parsed.length > 30 && !isPdfBinaryGarbage(parsed)) return parsed;
  } catch {
    /* try structural fallback */
  }

  const structural = extractPdfStringLiterals(buffer).trim();
  if (structural.length > 20 && !isPdfBinaryGarbage(structural)) return structural;

  throw new Error("Could not read text from this PDF. Try exporting as PDF (text) or upload a .txt copy.");
}

function extractPlainText(buffer: Buffer) {
  return buffer.toString("utf8");
}

function extractDocxText(buffer: Buffer) {
  const raw = buffer.toString("utf8");
  const chunks = [...raw.matchAll(/<w:t[^>]*>([^<]{2,})<\/w:t>/g)].map((m) => m[1]);
  if (chunks.length > 3) return chunks.join(" ");
  return raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
}

export async function extractCvText(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return extractPdfText(buffer);
  if (lower.endsWith(".txt")) return extractPlainText(buffer);
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return extractDocxText(buffer);
  throw new Error("Unsupported file type. Upload PDF or TXT.");
}

function guessName(text: string, filename: string) {
  const authorLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(l) && !EMAIL_RE.test(l));

  if (authorLine) return authorLine;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60);

  for (const line of lines.slice(0, 12)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/^(curriculum vitae|resume|cv|profile|experience|education|skills|canva)$/i.test(line)) continue;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line)) return line;
  }

  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (base.length > 2 && base.length < 50 && !/resume|cv/i.test(base)) return base;
  return "Unknown Candidate";
}

function extractEmail(text: string) {
  const matches = text.match(EMAIL_RE);
  const valid = matches?.find((e) => !e.endsWith("@applicant.local") && !e.includes("canva"));
  return valid?.toLowerCase() ?? matches?.[0]?.toLowerCase() ?? "";
}

function extractPhone(text: string) {
  const m = text.match(PHONE_RE);
  return m?.[0]?.trim() ?? null;
}

export function parseCvFields(text: string, filename: string): ParsedCv {
  const clean = isPdfBinaryGarbage(text) ? "" : text;
  const email = extractEmail(clean);
  const phone = extractPhone(clean);
  const candidateName = guessName(clean, filename);

  return {
    text: clean.slice(0, 12000),
    candidateName,
    candidateEmail: email || "unknown@applicant.local",
    phone,
  };
}

export function cvStorageKey(applicationId: number, filename: string) {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  return `recruitment/${applicationId}/${safe}`;
}
