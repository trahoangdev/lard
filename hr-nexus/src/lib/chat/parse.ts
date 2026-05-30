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
  | { kind: "leave_stats" }
  | { kind: "payroll_run" }
  | { kind: "payroll_pending" }
  | { kind: "payroll_approve"; runId?: number }
  | { kind: "job_list" }
  | { kind: "job_apply"; jobId?: string; jobTitle?: string }
  | { kind: "job_details"; jobTitle?: string }
  | { kind: "cv_applications"; jobId?: string; jobTitle?: string }
  | { kind: "cv_profile"; applicationId: number }
  | { kind: "recruitment_submit_boss" }
  | { kind: "recruitment_boss_pending" }
  | { kind: "recruitment_boss_approve" }
  | { kind: "recruitment_dataset" }
  | { kind: "job_draft" }
  | { kind: "application_status"; email?: string }
  | { kind: "help" }
  | { kind: "general_chat" };

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

  if (/(leave stats|team stats|hr stats|statistics|headcount|dashboard)/i.test(text)) {
    return { kind: "leave_stats" };
  }

  if (/(pending payroll|payroll approvals|salary approvals)/i.test(text)) {
    return { kind: "payroll_pending" };
  }

  const payrollApproveMatch = text.match(/approve payroll(?:\s+run)?\s+(\d+)/i);
  if (/(approve payroll|approve salary|sign off payroll)/i.test(text)) {
    const id = payrollApproveMatch ? Number(payrollApproveMatch[1]) : undefined;
    return { kind: "payroll_approve", runId: Number.isFinite(id) ? id : undefined };
  }

  if (/(run payroll|do payroll|send salaries|monthly salary|process payroll)/i.test(text)) {
    return { kind: "payroll_run" };
  }

  if (/(recruitment dataset|hiring dataset|export candidates|talent dataset)/i.test(text)) {
    return { kind: "recruitment_dataset" };
  }

  if (/(pending recruitment|pending candidates|boss recruitment|shortlist approval)/i.test(text)) {
    return { kind: "recruitment_boss_pending" };
  }

  if (/(approve recruitment|approve candidates|approve shortlist)/i.test(text)) {
    return { kind: "recruitment_boss_approve" };
  }

  if (/(submit shortlist|send shortlist to boss|submit candidates to boss)/i.test(text)) {
    return { kind: "recruitment_submit_boss" };
  }

  if (/(draft job|create job posting|write job description|new job posting|generate job description)/i.test(text)) {
    return { kind: "job_draft" };
  }

  const profileMatch = text.match(/(?:candidate|application|profile|resume)\s+#?(\d+)/i);
  if (profileMatch) {
    const id = Number(profileMatch[1]);
    if (Number.isFinite(id)) return { kind: "cv_profile", applicationId: id };
  }

  if (
    /(how many cv|how many cvs|how many applicants|who applied|show candidates|list candidates|cv stats|recruitment stats|rank candidates)/i.test(
      text,
    )
  ) {
    const jobMatch = text.match(/for\s+(.+?)(?:\?|$)/i);
    return { kind: "cv_applications", jobTitle: jobMatch?.[1]?.trim() };
  }

  const applyMatch = text.match(/apply(?:\s+for)?\s+(.+)/i);
  if (/(apply for|submit cv|upload cv|job application)/i.test(text) && !/(tell me|what is|describe|details|about)/i.test(text)) {
    const title = applyMatch?.[1]?.replace(/\s*(job|position|role)\s*$/i, "").trim();
    return { kind: "job_apply", jobTitle: title || undefined };
  }

  const detailMatch =
    raw.match(/(?:about|for|on|of)\s+(?:the\s+)?(.+?)(?:\?|\.|$)/i) ??
    raw.match(/(?:tell me about|describe|details?(?:\s+on|\s+for|\s+about)?|what is|what's|more info(?:rmation)?(?:\s+on|\s+about)?)\s+(?:the\s+)?(.+)/i);

  if (
    /(job description|role description|position description|job details|role details|what does|what do|tell me about|describe the|requirements for|more about|more info|who are you looking for|what is the|what's the|salary|benefits|day.?to.?day|responsibilities)/i.test(
      text,
    )
  ) {
    const title = detailMatch?.[1]?.replace(/\s*(job|position|role|opening)\s*$/i, "").trim();
    return { kind: "job_details", jobTitle: title || undefined };
  }

  if (/(open jobs|job openings|available jobs|show jobs|browse jobs)/i.test(text)) {
    return { kind: "job_list" };
  }

  const statusEmail = text.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  if (/(application status|my application|hiring progress|interview status)/i.test(text)) {
    return { kind: "application_status", email: statusEmail?.[1]?.toLowerCase() };
  }

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

