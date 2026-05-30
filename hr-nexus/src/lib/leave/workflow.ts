import { prisma } from "@/lib/prisma";
import { daysBetweenInclusive } from "@/lib/utils";
import { applyApprovedLeave } from "@/lib/leave/balance";

export async function getPendingLeaveForHr() {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
}

export async function hrDecideLeave(
  leaveId: number,
  actorId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string,
) {
  const actor = await prisma.employee.findUnique({ where: { id: actorId } });
  if (actor?.role !== "HR_ADMIN") {
    throw new Error("Only HR can approve or reject leave requests.");
  }

  const existing = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!existing) throw new Error("Leave request not found.");
  if (existing.status !== "PENDING") {
    throw new Error("This leave request is no longer pending HR review.");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      decidedAt: new Date(),
      decidedBy: actorId,
      decisionReason: reason ?? null,
    },
    include: { employee: true },
  });

  if (decision === "APPROVE") {
    const days = daysBetweenInclusive(existing.startDate, existing.endDate);
    await applyApprovedLeave(existing.employeeId, existing.type, days);
  }

  await prisma.auditLog.create({
    data: {
      action: "LEAVE_DECISION",
      payloadJson: JSON.stringify({ leaveId, decision, decidedBy: actorId }),
    },
  });

  return updated;
}

export async function getLeaveTimeline(limit = 30) {
  const rows = await prisma.leaveRequest.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    employeeName: r.employee.name,
    employeeId: r.employeeId,
    type: r.type,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    reason: r.reason,
    status: r.status,
    requestedAt: r.createdAt.toISOString(),
    approvedAt: r.decidedAt?.toISOString() ?? null,
    decidedBy: r.decidedBy,
  }));
}
