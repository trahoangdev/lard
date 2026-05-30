import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: true },
    take: 200,
  });

  return NextResponse.json(
    items.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.name,
      startDate: r.startDate,
      endDate: r.endDate,
      type: r.type,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      decidedAt: r.decidedAt,
      decidedBy: r.decidedBy,
      decisionReason: r.decisionReason,
    })),
  );
}

