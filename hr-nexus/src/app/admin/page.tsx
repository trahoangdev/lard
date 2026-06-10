import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rows = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: true },
    take: 200,
  });

  const initial = rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employee.name,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    type: r.type,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    decidedBy: r.decidedBy ?? null,
    decisionReason: r.decisionReason ?? null,
  }));

  return (
    <div className="relative flex flex-1 bg-mist text-ink">
      <main className="relative mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">HR Step</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">Approve leave requests</div>
            <div className="mt-2 text-sm text-slate-blue">
              Employees submit via Chat. Pick a <span className="font-semibold text-midnight-indigo">PENDING</span> row and click Approve.
            </div>
          </div>
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Boss Step</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">View leave timeline</div>
            <div className="mt-2 text-sm text-slate-blue">
              Switch to Boss in Chat and ask <span className="font-semibold text-midnight-indigo">“Show leave statistics”</span> for requested / approved / leave dates.
            </div>
          </div>
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Employee Step</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">Track your request</div>
            <div className="mt-2 text-sm text-slate-blue">
              Ask <span className="font-semibold text-midnight-indigo">“Is my leave approved?”</span> in Chat to see status and dates.
            </div>
          </div>
        </div>

        <AdminClient initial={initial} />
      </main>
    </div>
  );
}
