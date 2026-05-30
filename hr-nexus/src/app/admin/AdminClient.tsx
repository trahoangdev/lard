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
  if (status === "APPROVED") return "bg-pale-gray text-glacier-blue";
  if (status === "PENDING") return "bg-pale-gray text-sunset-gold";
  if (status === "REJECTED") return "bg-pale-gray text-ocean-glimmer";
  return "bg-pale-gray text-slate-blue";
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
    <div className="card-floating">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-platinum-tint px-6 py-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Admin</div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-midnight-indigo">Leave Requests</div>
        </div>
        <div className="badge-info !rounded-full !px-4 !py-2">
          Pending: <span className="font-semibold">{pendingCount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">
            <tr className="border-b border-platinum-tint">
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
              <tr key={r.id} className="border-b border-platinum-tint last:border-b-0">
                <td className="px-6 py-4 font-mono text-xs text-slate-blue">#{r.id}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-midnight-indigo">{r.employeeName}</div>
                  <div className="mt-1 text-xs text-slate-blue">{r.reason}</div>
                </td>
                <td className="px-6 py-4 text-midnight-indigo">
                  {r.startDate} → {r.endDate}
                </td>
                <td className="px-6 py-4 text-midnight-indigo">{r.type}</td>
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
                        className="btn-primary disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void decide(r.id, "REJECT")}
                        className="rounded-lg border border-ocean-glimmer/30 bg-pale-gray px-4 py-2 text-sm font-semibold text-ocean-glimmer transition hover:bg-pale-gray/80 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-blue">
                      {r.decidedBy ? `By ${r.decidedBy}` : ""}
                      {r.decisionReason ? ` — ${r.decisionReason}` : ""}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-blue">
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
