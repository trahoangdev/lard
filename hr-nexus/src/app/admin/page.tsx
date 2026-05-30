import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";

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
    <div className="flex flex-1 bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(124,58,237,0.20),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.10),transparent_40%)]" />
      <main className="relative mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Demo Step</div>
            <div className="mt-2 text-sm font-semibold">Approve a request</div>
            <div className="mt-2 text-sm text-white/70">
              Pick a <span className="font-semibold text-white">PENDING</span> item and click Approve.
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Demo Step</div>
            <div className="mt-2 text-sm font-semibold">Switch back to Chat</div>
            <div className="mt-2 text-sm text-white/70">
              Ask <span className="font-semibold text-white">“Is my leave approved?”</span> to show status.
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Pro Tip</div>
            <div className="mt-2 text-sm font-semibold">Use demo identities</div>
            <div className="mt-2 text-sm text-white/70">
              Chat page identity switcher lets you act as Employee/Manager/Admin instantly.
            </div>
          </div>
        </div>

        <AdminClient initial={initial} />
      </main>
    </div>
  );
}

