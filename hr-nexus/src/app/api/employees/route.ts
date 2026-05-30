import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, annualUsed: true, sickUsed: true },
  });

  return NextResponse.json({ employees });
}
