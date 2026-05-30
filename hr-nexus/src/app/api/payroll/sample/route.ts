import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payroll");

  sheet.addRow(["EmployeeName", "Email", "BankAccount", "Amount", "Note"]);
  sheet.addRow(["Ava Nguyen", "ava.nguyen@example.com", "123456789012", 1500, "May salary"]);
  sheet.addRow(["Minh Tran", "minh.tran@example.com", "998877665544", 2200, "May salary"]);
  sheet.addRow(["Bad Email", "bad-email", "111122223333", 900, "Invalid email"]);
  sheet.addRow(["Bad Amount", "amount@example.com", "444455556666", -10, "Invalid amount"]);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="payroll.xlsx"',
      "cache-control": "no-store",
    },
  });
}

