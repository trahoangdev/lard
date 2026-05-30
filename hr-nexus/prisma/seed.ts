import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.employee.upsert({
    where: { id: "emp_001" },
    create: { id: "emp_001", name: "Ava Nguyen", role: Role.EMPLOYEE },
    update: { name: "Ava Nguyen", role: Role.EMPLOYEE },
  });

  await prisma.employee.upsert({
    where: { id: "mgr_001" },
    create: { id: "mgr_001", name: "Minh Tran", role: Role.MANAGER },
    update: { name: "Minh Tran", role: Role.MANAGER },
  });

  await prisma.employee.upsert({
    where: { id: "hr_001" },
    create: { id: "hr_001", name: "HR Admin", role: Role.HR_ADMIN },
    update: { name: "HR Admin", role: Role.HR_ADMIN },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    throw err;
  });
