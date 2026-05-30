import type { LeaveType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { annualEntitlement, SICK_ENTITLEMENT } from "@/lib/leave/policy";
import { daysBetweenInclusive } from "@/lib/utils";

export type LeaveBalanceView = {
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  role: Role;
  employeeName: string;
};

export async function getLeaveBalance(employeeId: string): Promise<LeaveBalanceView | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const annualTotal = annualEntitlement(employee.role);
  return {
    employeeName: employee.name,
    role: employee.role,
    annual: {
      total: annualTotal,
      used: employee.annualUsed,
      remaining: Math.max(0, annualTotal - employee.annualUsed),
    },
    sick: {
      total: SICK_ENTITLEMENT,
      used: employee.sickUsed,
      remaining: Math.max(0, SICK_ENTITLEMENT - employee.sickUsed),
    },
  };
}

export async function applyApprovedLeave(employeeId: string, type: LeaveType, days: number) {
  if (type === "ANNUAL") {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { annualUsed: { increment: days } },
    });
  } else if (type === "SICK") {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { sickUsed: { increment: days } },
    });
  }
}

export async function validateLeaveDraft(
  employeeId: string,
  type: LeaveType,
  startDate: Date,
  endDate: Date,
) {
  const balance = await getLeaveBalance(employeeId);
  if (!balance) return { ok: false as const, error: "Employee not found." };

  const days = daysBetweenInclusive(startDate, endDate);

  if (type === "ANNUAL" && days > balance.annual.remaining) {
    return {
      ok: false as const,
      error: `Not enough annual leave. You have ${balance.annual.remaining} day(s) left but requested ${days}.`,
    };
  }

  if (type === "SICK" && days > balance.sick.remaining) {
    return {
      ok: false as const,
      error: `Not enough sick leave. You have ${balance.sick.remaining} day(s) left but requested ${days}.`,
    };
  }

  return { ok: true as const, days };
}
