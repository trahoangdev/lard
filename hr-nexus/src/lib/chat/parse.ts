import { clampText } from "@/lib/utils";

export type LeaveDraft = {
  startDate: string;
  endDate: string;
  type: "ANNUAL" | "SICK" | "UNPAID";
  reason: string;
};

export type ParsedIntent =
  | { kind: "leave_request"; draft: LeaveDraft }
  | { kind: "leave_balance" }
  | { kind: "leave_status"; id?: number }
  | { kind: "payroll_run" }
  | { kind: "help" };

const leaveTypeMap: Record<string, LeaveDraft["type"]> = {
  annual: "ANNUAL",
  sick: "SICK",
  unpaid: "UNPAID",
};

const weekdayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function nextWeekday(base: Date, targetDay: number, forceNext: boolean) {
  const day = base.getDay();
  let delta = (targetDay - day + 7) % 7;
  if (delta === 0 && forceNext) delta = 7;
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

function parseDateToken(token: string, now = new Date()) {
  const t = token.trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map((v) => Number(v));
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (t === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (t === "tomorrow") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + 1);
    return d;
  }

  const m = t.match(/^(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (m) {
    const forceNext = Boolean(m[1]);
    const target = weekdayMap[m[2]];
    return nextWeekday(new Date(now.getFullYear(), now.getMonth(), now.getDate()), target, forceNext);
  }

  return null;
}

export function parseIntent(message: string): ParsedIntent {
  const raw = message.trim();
  const text = raw.toLowerCase();

  if (!text) return { kind: "help" };

  if (/(help|what can you do|examples)/i.test(text)) return { kind: "help" };

  if (/(run payroll|do payroll|send salaries)/i.test(text)) return { kind: "payroll_run" };

  if (/(leave balance|balance|remaining leave)/i.test(text)) return { kind: "leave_balance" };

  const statusMatch = text.match(/leave request\s+(\d+)/i);
  if (/(leave status|status of my leave|is my leave)/i.test(text)) {
    const id = statusMatch ? Number(statusMatch[1]) : undefined;
    return { kind: "leave_status", id: Number.isFinite(id) ? id : undefined };
  }

  const leaveReq =
    raw.match(
      /(request|apply)\s+leave\s+(.+?)\s+to\s+(.+?)\s+(annual|sick|unpaid)\s+reason\s+(.+)/i,
    ) ??
    raw.match(
      /(request|apply)\s+leave\s+(.+?)\s+to\s+(.+?)\s+(annual|sick|unpaid)(?:\s+(.+))?/i,
    );

  if (leaveReq) {
    const startToken = clampText(String(leaveReq[2]), 40);
    const endToken = clampText(String(leaveReq[3]), 40);
    const typeKey = String(leaveReq[4]).toLowerCase();
    const reasonRaw = leaveReq[5] ? String(leaveReq[5]) : "N/A";

    const start = parseDateToken(startToken);
    const end = parseDateToken(endToken);
    const type = leaveTypeMap[typeKey];

    if (start && end && type) {
      const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
        start.getDate(),
      ).padStart(2, "0")}`;
      const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(
        end.getDate(),
      ).padStart(2, "0")}`;

      return {
        kind: "leave_request",
        draft: {
          startDate: startIso,
          endDate: endIso,
          type,
          reason: clampText(reasonRaw, 220),
        },
      };
    }
  }

  if (/(request|apply)\s+leave/i.test(text)) return { kind: "help" };

  return { kind: "help" };
}

