"use client";

import { useMemo, useState } from "react";

type LeaveRow = {
  id: number;
  employeeName: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionReason?: string | null;
};

function badgeTone(status: string) {
  if (status === "APPROVED") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  if (status === "PENDING") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30";
  if (status === "REJECTED") return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30";
  return "bg-white/10 text-white/70 ring-1 ring-white/15";
}

export function AdminClient({ initial }: { initial: LeaveRow[] }) {
  const [rows, setRows] = useState<LeaveRow[]>(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const pendingCount = useMemo(() => rows.filter((r) => r.status === "PENDING").length, [rows]);

  async function decide(id: number, decision: "APPROVE" | "REJECT") {
    setBusyId(id);
    try {
      const reason = decision === "REJECT" ? window.prompt("Rejection reason (optional):") ?? undefined : undefined;
      const res = await fetch(`/api/leave-requests/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reason, decidedBy: "mgr_001" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Decision failed");

      const updated = json.leaveRequest as {
        id: number;
        status: string;
        decidedAt: string | null;
        decidedBy: string | null;
        decisionReason: string | null;
      };

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: updated.status,
                decidedAt: updated.decidedAt,
                decidedBy: updated.decidedBy,
                decisionReason: updated.decisionReason,
              }
            : r,
        ),
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Admin</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">Leave Requests</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/75">
          Pending: <span className="font-semibold text-white">{pendingCount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.22em] text-white/50">
            <tr className="border-b border-white/10">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/10 last:border-b-0">
                <td className="px-6 py-4 font-mono text-xs text-white/70">#{r.id}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-white">{r.employeeName}</div>
                  <div className="mt-1 text-xs text-white/60">{r.reason}</div>
                </td>
                <td className="px-6 py-4 text-white/80">
                  {r.startDate} → {r.endDate}
                </td>
                <td className="px-6 py-4 text-white/80">{r.type}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {r.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r.id, "APPROVE")}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r.id, "REJECT")}
                        className="rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">
                      {r.decidedBy ? `By ${r.decidedBy}` : ""}
                      {r.decisionReason ? ` — ${r.decisionReason}` : ""}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-white/60">
                  No leave requests yet. Create one from the Chat page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

