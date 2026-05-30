import ExcelJS from "exceljs";
import type { Employee, Role } from "@prisma/client";

const TEST_EMAIL = process.env.PAYROLL_TEST_EMAIL?.trim() || "tanjosef33@gmail.com";

function employeeEmail(employee: Pick<Employee, "id" | "name">) {
  if (employee.id === "emp_001") return TEST_EMAIL;
  return `${employee.name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@hrnexus.demo`;
}

function defaultSalary(role: Role) {
  switch (role) {
    case "MANAGER":
      return 2200;
    case "HR_ADMIN":
      return 1800;
    default:
      return 1500;
  }
}

function bankAccount(id: string) {
  const digits = id.replace(/\D/g, "").padStart(8, "0").slice(-8);
  return `ACC${digits}${id.slice(-4).replace(/\W/g, "0")}`;
}

export async function buildPayrollWorkbook(employees: Pick<Employee, "id" | "name" | "role">[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payroll");

  sheet.addRow(["EmployeeName", "Email", "BankAccount", "Amount", "Note"]);

  for (const e of employees) {
    sheet.addRow([
      e.name,
      employeeEmail(e),
      bankAccount(e.id),
      defaultSalary(e.role),
      "Monthly salary",
    ]);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export { TEST_EMAIL as payrollTestEmail };
