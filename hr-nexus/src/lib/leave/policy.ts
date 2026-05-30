import type { Role } from "@prisma/client";

/** Sick leave entitlement — same for all roles */
export const SICK_ENTITLEMENT = 60;

/** Annual leave by role: Employee 10, HR 12, Boss 21 */
export function annualEntitlement(role: Role) {
  switch (role) {
    case "MANAGER":
      return 21;
    case "HR_ADMIN":
      return 12;
    default:
      return 10;
  }
}

export function leavePolicyLabel(role: Role) {
  return {
    annual: annualEntitlement(role),
    sick: SICK_ENTITLEMENT,
  };
}
