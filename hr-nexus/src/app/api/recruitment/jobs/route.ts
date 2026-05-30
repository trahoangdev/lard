import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await prisma.jobPosting.findMany({
    where: { status: "OPEN" },
    include: { _count: { select: { applications: true } } },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      requirements: j.requirements,
      applications: j._count.applications,
    })),
  });
}
