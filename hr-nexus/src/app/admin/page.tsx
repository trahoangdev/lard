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
    <div className="relative flex flex-1 bg-cloud-mist text-text-black">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,92,255,0.06),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(0,153,255,0.05),transparent_45%)]" />
      <main className="relative mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Demo Step</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">Approve a request</div>
            <div className="mt-2 text-sm text-slate-blue">
              Pick a <span className="font-semibold text-midnight-indigo">PENDING</span> item and click Approve.
            </div>
          </div>
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Demo Step</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">Switch back to Chat</div>
            <div className="mt-2 text-sm text-slate-blue">
              Ask <span className="font-semibold text-midnight-indigo">“Is my leave approved?”</span> to show status.
            </div>
          </div>
          <div className="card-floating p-5">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Pro Tip</div>
            <div className="mt-2 text-sm font-semibold text-midnight-indigo">Use demo identities</div>
            <div className="mt-2 text-sm text-slate-blue">
              Chat page identity switcher lets you act as Employee/Manager/Admin instantly.
            </div>
          </div>
        </div>

        <AdminClient initial={initial} />
      </main>
    </div>
  );
}
