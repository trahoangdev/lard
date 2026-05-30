import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const runs = await prisma.payrollRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      totalAmount: Number(r.totalAmount),
      inputFilename: r.inputFilename,
      artifactsReady: Boolean(r.bankBatchStoragePath && r.resultXlsxStoragePath),
    })),
  );
}

