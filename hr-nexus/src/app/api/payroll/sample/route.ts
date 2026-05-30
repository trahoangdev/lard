import { NextResponse } from "next/server";
import { buildPayrollWorkbook } from "@/lib/payroll/generate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });

  const buffer = await buildPayrollWorkbook(employees);

  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="payroll.xlsx"',
      "cache-control": "no-store",
      "x-payroll-row-count": String(employees.length),
    },
  });
}
