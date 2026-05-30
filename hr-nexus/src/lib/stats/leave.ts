import { prisma } from "@/lib/prisma";
import { annualEntitlement, SICK_ENTITLEMENT } from "@/lib/leave/policy";
import { getLeaveTimeline } from "@/lib/leave/workflow";

export async function getOrgLeaveStats() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: {
      leaveRequests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });

  const [pendingLeaves, approvedLeaves, rejectedLeaves, payrollPendingBoss, timeline] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED" } }),
    prisma.leaveRequest.count({ where: { status: "REJECTED" } }),
    prisma.payrollRun.count({ where: { status: "PENDING_BOSS" } }),
    getLeaveTimeline(30),
  ]);

  const staff = employees.filter((e) => e.id !== "applicant");
  const totalAnnualUsed = staff.reduce((s, e) => s + e.annualUsed, 0);
  const totalSickUsed = staff.reduce((s, e) => s + e.sickUsed, 0);
  const totalAnnualEntitlement = staff.reduce((s, e) => s + annualEntitlement(e.role), 0);

  const byEmployee = staff.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    annualUsed: e.annualUsed,
    annualTotal: annualEntitlement(e.role),
    annualRemaining: Math.max(0, annualEntitlement(e.role) - e.annualUsed),
    sickUsed: e.sickUsed,
    sickTotal: SICK_ENTITLEMENT,
    sickRemaining: Math.max(0, SICK_ENTITLEMENT - e.sickUsed),
    pendingRequests: e.leaveRequests.length,
  }));

  return {
    summary: {
      headcount: staff.length,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      payrollPendingBoss,
      totalAnnualUsed,
      totalSickUsed,
      totalAnnualEntitlement,
      avgAnnualUsed: staff.length ? Math.round((totalAnnualUsed / staff.length) * 10) / 10 : 0,
    },
    employees: byEmployee,
    timeline,
  };
}
