"use client";

import { useMemo, useRef, useState } from "react";

type ChatContext =
  | { kind: "pending_leave_request"; draft: { startDate: string; endDate: string; type: string; reason: string } }
  | { kind: "payroll_uploaded"; runId: number }
  | { kind: "pending_payroll_confirm"; runId: number };

type LeaveRequestCard = {
  type: "leave_request";
  id: number;
  status: string;
  typeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  decidedBy?: string | null;
  decisionReason?: string | null;
};

type LeaveBalanceCard = {
  type: "leave_balance";
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
};

type PayrollStartCard = {
  type: "payroll_start";
  sampleUrl: string;
};

type PayrollPreviewInvalidRow = {
  rowNumber: number;
  employeeName: string;
  email: string;
  bankAccountMasked: string;
  issues: string[];
};

type PayrollPreviewCard = {
  type: "payroll_preview";
  runId: number;
  inputFilename: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  totalAmount: number;
  invalidRows: PayrollPreviewInvalidRow[];
};

type PayrollRunCard = {
  type: "payroll_run";
  runId: number;
  totalAmount: number;
  validCount: number;
  invalidCount: number;
  artifacts: { bankBatchUrl: string; payrollResultUrl: string };
};

type CardPayload = LeaveRequestCard | LeaveBalanceCard | PayrollStartCard | PayrollPreviewCard | PayrollRunCard;

type BotMessage =
  | { kind: "text"; text: string }
  | { kind: "card"; card: CardPayload }
  | { kind: "actions"; actions: Array<{ id: string; label: string; tone?: "primary" | "danger" }> };

type TranscriptItem =
  | { id: string; from: "user"; text: string }
  | { id: string; from: "bot"; payload: BotMessage };

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value,
  );
}

function badgeTone(status: string) {
  if (status === "APPROVED" || status === "DONE") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30";
  if (status === "PENDING" || status === "DRAFT") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30";
  if (status === "REJECTED" || status === "FAILED") return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30";
  return "bg-white/10 text-white/70 ring-1 ring-white/15";
}

export default function Home() {
  const [actorEmployeeId, setActorEmployeeId] = useState("emp_001");
  const [input, setInput] = useState("");
  const [pendingContext, setPendingContext] = useState<ChatContext | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<TranscriptItem[]>([
    {
      id: uid(),
      from: "bot",
      payload: {
        kind: "text",
        text: "Welcome to HR Nexus. Try: “Request leave 2026-06-10 to 2026-06-12 annual reason family” or “Run payroll”.",
      },
    },
  ]);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const quickCommands = useMemo(
    () => [
      "Request leave 2026-06-10 to 2026-06-12 annual reason family",
      "What’s my leave balance?",
      "Is my leave approved?",
      "Run payroll",
    ],
    [],
  );

  async function callChat(message: string, context?: ChatContext) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorEmployeeId, message, context }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as { messages?: BotMessage[]; context?: ChatContext };
  }

  async function send(message: string, context?: ChatContext) {
    const trimmed = message.trim();
    if (!trimmed) return;

    setItems((prev) => [...prev, { id: uid(), from: "user", text: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const response = await callChat(trimmed, context);
      const bot = (response.messages ?? []).map((m) => ({ id: uid(), from: "bot" as const, payload: m }));
      setItems((prev) => [...prev, ...bot]);
      setPendingContext(response.context);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setItems((prev) => [
        ...prev,
        { id: uid(), from: "bot", payload: { kind: "text", text: `Error: ${message}` } },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
    }
  }

  async function handleAction(actionId: string) {
    if (actionId === "upload_payroll") {
      fileRef.current?.click();
      return;
    }

    if (actionId === "confirm") {
      await send("confirm", pendingContext);
      return;
    }

    if (actionId === "confirm_payroll") {
      await send("confirm", pendingContext);
      return;
    }

    if (actionId === "cancel") {
      await send("cancel", pendingContext);
    }
  }

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/payroll/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      await send(`Uploaded ${file.name}`, { kind: "payroll_uploaded", runId: json.runId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setItems((prev) => [
        ...prev,
        { id: uid(), from: "bot", payload: { kind: "text", text: `Upload error: ${message}` } },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
    }
  }

  return (
    <div className="flex flex-1 bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.25),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(34,211,238,0.18),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_40%)]" />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Demo Identity</div>
            <div className="mt-2 text-lg font-semibold tracking-tight">Who are you?</div>
            <select
              value={actorEmployeeId}
              onChange={(e) => setActorEmployeeId(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-0 focus:border-white/30"
            >
              <option value="emp_001">Ava Nguyen (Employee)</option>
              <option value="mgr_001">Minh Tran (Manager)</option>
              <option value="hr_001">HR Admin</option>
            </select>

            <div className="mt-8 text-xs uppercase tracking-[0.22em] text-white/50">Quick Commands</div>
            <div className="mt-3 flex flex-col gap-2">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => setInput(cmd)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/50">Chat</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">Command → Confirm → Artifact</div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 md:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              Demo ready
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-4">
              {items.map((it) =>
                it.from === "user" ? (
                  <div key={it.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl bg-white px-4 py-3 text-sm text-black shadow">
                      {it.text}
                    </div>
                  </div>
                ) : it.payload.kind === "text" ? (
                  <div key={it.id} className="flex justify-start">
                    <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/90">
                      {it.payload.text}
                    </div>
                  </div>
                ) : it.payload.kind === "actions" ? (
                  <div key={it.id} className="flex justify-start">
                    <div className="flex flex-wrap gap-2">
                      {it.payload.actions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void handleAction(a.id)}
                          className={[
                            "rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60",
                            a.tone === "danger"
                              ? "border border-rose-500/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20"
                              : "border border-white/15 bg-white/10 text-white hover:bg-white/15",
                          ].join(" ")}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={it.id} className="flex justify-start">
                    <Card card={it.payload.card} badgeTone={badgeTone} money={money} />
                  </div>
                ),
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/40 px-6 py-4">
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input, pendingContext?.kind?.startsWith("pending_") ? pendingContext : undefined);
              }}
            >
              <div className="flex-1">
                <div className="text-xs uppercase tracking-[0.22em] text-white/50">Message</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  placeholder="Type a command…"
                  className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-12 shrink-0 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
              >
                Send
              </button>
            </form>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onUpload(file);
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({
  card,
  badgeTone,
  money,
}: {
  card: CardPayload;
  badgeTone: (status: string) => string;
  money: (v: number) => string;
}) {
  if (card?.type === "leave_request") {
    return (
      <div className="max-w-[82%] rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight">Leave Request #{card.id}</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(card.status)}`}>
            {card.status}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/85 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Type</div>
            <div className="mt-1 font-medium">{String(card.typeName)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Dates</div>
            <div className="mt-1 font-medium">
              {card.startDate} → {card.endDate}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 sm:col-span-2">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Reason</div>
            <div className="mt-1 font-medium">{card.reason}</div>
          </div>
        </div>
        {card.decidedBy ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Decision</div>
            <div className="mt-1 font-medium">
              By {card.decidedBy}
              {card.decisionReason ? ` — ${card.decisionReason}` : ""}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (card?.type === "leave_balance") {
    return (
      <div className="max-w-[82%] rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold tracking-tight">Leave Balance</div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["annual", "sick"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.22em] text-white/50">{k}</div>
              <div className="mt-2 text-sm text-white/85">
                <div className="flex items-center justify-between">
                  <span>Remaining</span>
                  <span className="font-semibold">{card[k].remaining}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-white/60">
                  <span>Used</span>
                  <span>{card[k].used}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-white/60">
                  <span>Total</span>
                  <span>{card[k].total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card?.type === "payroll_start") {
    return (
      <div className="max-w-[82%] rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold tracking-tight">Payroll Run</div>
        <div className="mt-2 text-sm text-white/75">
          Need a file? Download a demo-ready <span className="font-semibold text-white">payroll.xlsx</span> with both
          valid and invalid rows.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={card.sampleUrl}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Download sample payroll.xlsx
          </a>
        </div>
      </div>
    );
  }

  if (card?.type === "payroll_preview") {
    return (
      <div className="max-w-[82%] rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight">Payroll Preview (Run #{card.runId})</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("DRAFT")}`}>DRAFT</div>
        </div>
        <div className="mt-2 text-xs text-white/60">{card.inputFilename}</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Rows</div>
            <div className="mt-1 text-lg font-semibold">{card.rowCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Valid</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">{card.validCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Invalid</div>
            <div className="mt-1 text-lg font-semibold text-rose-200">{card.invalidCount}</div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Valid Total</div>
          <div className="mt-1 text-lg font-semibold">{money(card.totalAmount)}</div>
        </div>

        {card.invalidRows?.length ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Invalid rows (first {card.invalidRows.length})</div>
            <div className="mt-3 flex flex-col gap-3">
              {card.invalidRows.map((r: PayrollPreviewInvalidRow) => (
                <div key={r.rowNumber} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">
                      Row {r.rowNumber} — {r.employeeName || "Unknown"}
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("FAILED")}`}>FAILED</div>
                  </div>
                  <div className="mt-2 text-white/70">
                    <div>{r.email}</div>
                    <div className="mt-1 font-mono text-xs text-white/60">{r.bankAccountMasked}</div>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-rose-100/90">
                    {r.issues.map((x: string) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (card?.type === "payroll_run") {
    return (
      <div className="max-w-[82%] rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight">Payroll Run #{card.runId}</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("DONE")}`}>DONE</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Total</div>
            <div className="mt-1 text-lg font-semibold">{money(card.totalAmount)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Sent (simulated)</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">{card.validCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.22em] text-white/50">Failed</div>
            <div className="mt-1 text-lg font-semibold text-rose-200">{card.invalidCount}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={card.artifacts.bankBatchUrl}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Download bank_batch.csv
          </a>
          <a
            href={card.artifacts.payrollResultUrl}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Download payroll_result.xlsx
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[82%] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80">
      Unsupported card
    </div>
  );
}
