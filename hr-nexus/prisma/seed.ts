import { PrismaClient, Role, LeaveStatus, LeaveType } from "@prisma/client";

const prisma = new PrismaClient();

const CORE = [
  { id: "emp_001", name: "Ava Nguyen", role: Role.EMPLOYEE, annualUsed: 3, sickUsed: 2 },
  { id: "mgr_001", name: "Minh Tran", role: Role.MANAGER, annualUsed: 5, sickUsed: 0 },
  { id: "hr_001", name: "Lan Pham", role: Role.HR_ADMIN, annualUsed: 1, sickUsed: 4 },
  { id: "applicant", name: "Job Applicant", role: Role.EMPLOYEE, annualUsed: 0, sickUsed: 0 },
];

const NEW_EMPLOYEES = [
  { id: "emp_002", name: "Bao Le", role: Role.EMPLOYEE, annualUsed: 2, sickUsed: 1 },
  { id: "emp_003", name: "Chi Vo", role: Role.EMPLOYEE, annualUsed: 0, sickUsed: 5 },
  { id: "emp_004", name: "Duc Hoang", role: Role.EMPLOYEE, annualUsed: 4, sickUsed: 0 },
  { id: "emp_005", name: "Emily Park", role: Role.EMPLOYEE, annualUsed: 1, sickUsed: 3 },
  { id: "emp_006", name: "Felix Chen", role: Role.EMPLOYEE, annualUsed: 6, sickUsed: 2 },
  { id: "emp_007", name: "Giang Do", role: Role.EMPLOYEE, annualUsed: 0, sickUsed: 0 },
  { id: "emp_008", name: "Hana Suzuki", role: Role.EMPLOYEE, annualUsed: 2, sickUsed: 8 },
  { id: "emp_009", name: "Ivan Petrov", role: Role.EMPLOYEE, annualUsed: 3, sickUsed: 1 },
  { id: "emp_010", name: "Jasmine Kim", role: Role.EMPLOYEE, annualUsed: 1, sickUsed: 0 },
  { id: "emp_011", name: "Khoa Ngo", role: Role.EMPLOYEE, annualUsed: 4, sickUsed: 6 },
];

const JOBS = [
  {
    id: "job_swe",
    title: "Senior Software Engineer",
    department: "Engineering",
    requirements:
      "TypeScript, React, Node.js, PostgreSQL, 5+ years experience, system design, REST APIs, team leadership, agile",
  },
  {
    id: "job_hr",
    title: "HR Coordinator",
    department: "People Ops",
    requirements: "HR administration, recruitment, onboarding, employee relations, Excel, communication, labor law basics",
  },
  {
    id: "job_sales",
    title: "Sales Executive",
    department: "Revenue",
    requirements: "B2B sales, CRM, negotiation, pipeline management, SaaS experience, presentation skills, quota achievement",
  },
];

const SAMPLE_APPLICATIONS = [
  {
    jobId: "job_swe",
    candidateName: "Alex Rivera",
    candidateEmail: "tanjosef33@gmail.com",
    matchScore: 92,
    criteria: [
      { label: "TypeScript", score: 95, matched: true, note: "5 years TypeScript across frontend and backend" },
      { label: "React", score: 90, matched: true, note: "Led React migration at previous company" },
      { label: "Node.js", score: 88, matched: true, note: "Built microservices with Node" },
      { label: "System design", score: 85, matched: true, note: "Designed event-driven architecture" },
      { label: "Leadership", score: 80, matched: true, note: "Mentored 3 junior developers" },
    ],
    parsedText:
      "Alex Rivera\nSenior Software Engineer\nSkills: TypeScript, React, Node.js, PostgreSQL, system design, REST APIs\nExperience: 6 years building SaaS products",
  },
  {
    jobId: "job_swe",
    candidateName: "Sam Okonkwo",
    candidateEmail: "sam.okonkwo@email.com",
    matchScore: 71,
    criteria: [
      { label: "TypeScript", score: 60, matched: false, note: "Mostly JavaScript experience" },
      { label: "React", score: 85, matched: true, note: "3 years React development" },
      { label: "Node.js", score: 75, matched: true, note: "Some backend Node projects" },
      { label: "PostgreSQL", score: 50, matched: false, note: "MySQL only listed" },
      { label: "Leadership", score: 55, matched: false, note: "Individual contributor role" },
    ],
    parsedText: "Sam Okonkwo\nFrontend Developer\nJavaScript, React, Vue, CSS\n3 years experience",
  },
  {
    jobId: "job_swe",
    candidateName: "Priya Sharma",
    candidateEmail: "priya.sharma@email.com",
    matchScore: 58,
    criteria: [
      { label: "TypeScript", score: 40, matched: false, note: "Python-focused background" },
      { label: "React", score: 45, matched: false, note: "Limited frontend exposure" },
      { label: "Node.js", score: 35, matched: false, note: "Django/FastAPI stack" },
      { label: "PostgreSQL", score: 70, matched: true, note: "Strong database skills" },
      { label: "System design", score: 65, matched: true, note: "Data pipeline architecture" },
    ],
    parsedText: "Priya Sharma\nData Engineer\nPython, SQL, PostgreSQL, Spark\n4 years in data platforms",
  },
  {
    jobId: "job_hr",
    candidateName: "Mia Chen",
    candidateEmail: "mia.chen@email.com",
    matchScore: 84,
    criteria: [
      { label: "Recruitment", score: 90, matched: true, note: "Full-cycle recruiting for 2 years" },
      { label: "Onboarding", score: 85, matched: true, note: "Designed onboarding playbook" },
      { label: "Employee relations", score: 80, matched: true, note: "Handled ER cases" },
      { label: "Excel", score: 75, matched: true, note: "HR analytics dashboards" },
    ],
    parsedText: "Mia Chen\nHR Coordinator\nRecruitment, onboarding, employee relations, HRIS, Excel",
  },
];

async function main() {
  for (const e of [...CORE, ...NEW_EMPLOYEES]) {
    await prisma.employee.upsert({
      where: { id: e.id },
      create: e,
      update: { name: e.name, role: e.role, annualUsed: e.annualUsed, sickUsed: e.sickUsed },
    });
  }

  for (const j of JOBS) {
    await prisma.jobPosting.upsert({
      where: { id: j.id },
      create: { ...j, status: "OPEN" },
      update: { title: j.title, department: j.department, requirements: j.requirements, status: "OPEN" },
    });
  }

  const appCount = await prisma.cvApplication.count();
  if (appCount === 0) {
    for (const a of SAMPLE_APPLICATIONS) {
      await prisma.cvApplication.create({
        data: {
          jobId: a.jobId,
          candidateName: a.candidateName,
          candidateEmail: a.candidateEmail,
          originalFilename: `${a.candidateName.replace(/\s+/g, "_")}_CV.txt`,
          storagePath: `recruitment/seed/${a.candidateEmail.replace(/@.*/, "")}.txt`,
          parsedText: a.parsedText,
          matchScore: a.matchScore,
          matchDetailsJson: JSON.stringify(a.criteria),
          status: "UNDER_REVIEW",
        },
      });
    }
  }

  const sampleLeaves: Array<{
    employeeId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason: string;
    status: LeaveStatus;
    decidedBy?: string;
  }> = [
    { employeeId: "emp_002", startDate: "2026-06-02", endDate: "2026-06-04", type: LeaveType.ANNUAL, reason: "Family trip", status: LeaveStatus.PENDING },
    { employeeId: "emp_003", startDate: "2026-05-28", endDate: "2026-05-30", type: LeaveType.SICK, reason: "Flu", status: LeaveStatus.PENDING },
    { employeeId: "emp_005", startDate: "2026-06-10", endDate: "2026-06-12", type: LeaveType.ANNUAL, reason: "Wedding", status: LeaveStatus.PENDING },
    { employeeId: "emp_006", startDate: "2026-05-15", endDate: "2026-05-16", type: LeaveType.ANNUAL, reason: "Personal", status: LeaveStatus.APPROVED, decidedBy: "hr_001" },
    { employeeId: "emp_008", startDate: "2026-04-01", endDate: "2026-04-03", type: LeaveType.SICK, reason: "Recovery", status: LeaveStatus.APPROVED, decidedBy: "hr_001" },
    { employeeId: "emp_009", startDate: "2026-03-10", endDate: "2026-03-10", type: LeaveType.ANNUAL, reason: "Errand", status: LeaveStatus.REJECTED, decidedBy: "hr_001" },
  ];

  const existing = await prisma.leaveRequest.count();
  if (existing === 0) {
    for (const l of sampleLeaves) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: l.employeeId,
          startDate: new Date(`${l.startDate}T00:00:00`),
          endDate: new Date(`${l.endDate}T00:00:00`),
          type: l.type,
          reason: l.reason,
          status: l.status,
          decidedBy: l.decidedBy ?? null,
          decidedAt: l.status !== LeaveStatus.PENDING ? new Date() : null,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    throw err;
  });
