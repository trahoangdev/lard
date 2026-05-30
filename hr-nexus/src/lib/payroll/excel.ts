import ExcelJS from "exceljs";

export type PayrollRow = {
  rowNumber: number;
  employeeName: string;
  email: string;
  bankAccount: string;
  amount: number;
  note?: string;
  issues: string[];
};

type HeaderMap = Record<string, number>;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getHeaderMap(worksheet: ExcelJS.Worksheet) {
  const row = worksheet.getRow(1);
  const map: HeaderMap = {};

  row.eachCell((cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (!key) return;
    map[key] = colNumber;
  });

  return map;
}

function cellString(row: ExcelJS.Row, col: number | undefined) {
  if (!col) return "";
  const raw = row.getCell(col).value;
  if (raw == null) return "";
  if (typeof raw === "object" && "text" in raw) return String((raw as { text?: unknown }).text ?? "").trim();
  return String(raw).trim();
}

function cellNumber(row: ExcelJS.Row, col: number | undefined) {
  if (!col) return NaN;
  const raw = row.getCell(col).value;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw);
  if (raw && typeof raw === "object" && "result" in raw) return Number((raw as { result?: unknown }).result);
  return Number(raw);
}

export async function parsePayrollWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in Excel file.");

  const headers = getHeaderMap(worksheet);

  const required = ["employeename", "email", "bankaccount", "amount"];
  const missing = required.filter((k) => !headers[k]);
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const noteCol = headers["note"];

  const rows: PayrollRow[] = [];

  for (let i = 2; i <= worksheet.rowCount; i += 1) {
    const row = worksheet.getRow(i);
    const employeeName = cellString(row, headers["employeename"]);
    const email = cellString(row, headers["email"]);
    const bankAccount = cellString(row, headers["bankaccount"]);
    const amount = cellNumber(row, headers["amount"]);
    const note = noteCol ? cellString(row, noteCol) : "";

    const issues: string[] = [];
    if (!employeeName) issues.push("EmployeeName is required");
    if (!bankAccount) issues.push("BankAccount is required");
    if (!Number.isFinite(amount) || amount <= 0) issues.push("Amount must be a number > 0");
    if (!email || !email.includes("@") || !email.includes(".")) issues.push("Email is invalid");

    const hasAny = employeeName || email || bankAccount || Number.isFinite(amount) || note;
    if (!hasAny) continue;

    rows.push({
      rowNumber: i,
      employeeName,
      email,
      bankAccount,
      amount: Number.isFinite(amount) ? amount : NaN,
      note: note || undefined,
      issues,
    });
  }

  return { workbook, worksheet, rows };
}

export async function buildPayrollResultXlsx(input: Buffer, rowStatusByRowNumber: Map<number, {
  status: string;
  message?: string | null;
  processedAt?: Date | null;
}>) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in Excel file.");

  const headerRow = worksheet.getRow(1);
  const baseCols = headerRow.cellCount;

  const statusCol = baseCols + 1;
  const messageCol = baseCols + 2;
  const processedAtCol = baseCols + 3;

  headerRow.getCell(statusCol).value = "Status";
  headerRow.getCell(messageCol).value = "Message";
  headerRow.getCell(processedAtCol).value = "ProcessedAt";
  headerRow.commit();

  for (let i = 2; i <= worksheet.rowCount; i += 1) {
    const status = rowStatusByRowNumber.get(i);
    if (!status) continue;
    const row = worksheet.getRow(i);
    row.getCell(statusCol).value = status.status;
    row.getCell(messageCol).value = status.message ?? "";
    row.getCell(processedAtCol).value = status.processedAt ? status.processedAt.toISOString() : "";
    row.commit();
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

