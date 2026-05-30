"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApplicationStatusCard,
  CandidateProfileCard,
  CvSubmittedCard,
  JobApplyCard,
  JobDetailCard,
  JobDraftPreviewCard,
  JobListCard,
  LeaderboardCard,
  RecruitmentBossPendingCard,
  RecruitmentDatasetCard,
} from "@/components/recruitment-ui";

type JobDraftPayload = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  summary: string;
  highlights: string[];
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  fullDescription: string;
};

type ChatContext =
  | { kind: "pending_leave_request"; draft: { startDate: string; endDate: string; type: string; reason: string } }
  | { kind: "payroll_uploaded"; runId: number }
  | { kind: "pending_payroll_hr_submit"; runId: number }
  | { kind: "pending_payroll_boss_approve"; runId: number }
  | { kind: "pending_cv_apply"; jobId: string; jobTitle: string }
  | { kind: "cv_uploaded"; applicationId: number }
  | { kind: "pending_recruitment_boss" }
  | { kind: "pending_job_intake"; step: string; answers: Record<string, string | undefined> }
  | { kind: "pending_job_publish"; notes: string; answers: Record<string, string | undefined>; draft: JobDraftPayload };

type EmployeeOption = { id: string; name: string; role: string };

type LeaveStatsCard = {
  type: "leave_stats";
  actorRole?: string;
  summary: {
    headcount: number;
    pendingLeaves: number;
    approvedLeaves: number;
    rejectedLeaves: number;
    payrollPendingBoss: number;
    totalAnnualUsed: number;
    totalSickUsed: number;
    totalAnnualEntitlement: number;
    avgAnnualUsed: number;
  };
  employees: Array<{
    id: string;
    name: string;
    role: string;
    annualUsed: number;
    annualTotal: number;
    annualRemaining: number;
    sickUsed: number;
    sickTotal: number;
    sickRemaining: number;
    pendingRequests: number;
  }>;
  timeline: Array<{
    id: number;
    employeeName: string;
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    requestedAt: string;
    approvedAt: string | null;
    decidedBy: string | null;
  }>;
};

type LeavePendingListCard = {
  type: "leave_pending_list";
  requests: Array<{
    id: number;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestedAt: string;
  }>;
};

type PayrollPendingListCard = {
  type: "payroll_pending_list";
  runs: Array<{ runId: number; totalAmount: number; filename: string; requestedBy: string | null; requestedAt: string | null }>;
};

type PayrollSubmittedCard = {
  type: "payroll_submitted";
  runId: number;
  totalAmount: number;
  status: string;
};

type MatchCriterion = { label: string; score: number; matched: boolean; note: string };

type RecruitmentLeaderboardCard = {
  type: "recruitment_leaderboard";
  jobTitle: string | null;
  totalApplications: number;
  openJobs: Array<{ id: string; title: string; department: string; count: number }>;
  candidates: Array<{
    id: number;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    matchScore: number;
    status: string;
    hrShortlisted: boolean;
    bossApproved: boolean;
    criteria: MatchCriterion[];
  }>;
  actorRole: string;
};

type CandidateProfileCardPayload = {
  type: "candidate_profile";
  id: number;
  candidateName: string;
  candidateEmail: string;
  phone: string | null;
  jobTitle: string;
  department: string;
  matchScore: number;
  status: string;
  hrShortlisted: boolean;
  bossApproved: boolean;
  criteria: MatchCriterion[];
  parsedExcerpt: string;
  cvUrl: string;
  decisionReason: string | null;
  actorRole: string;
};

type JobListCardPayload = {
  type: "job_list";
  jobs: Array<{ id: string; title: string; department: string; applications: number; requirements?: string }>;
};

type ChatAction = {
  id: string;
  label: string;
  tone?: "primary" | "danger";
  job?: { id: string; title: string; department: string; requirements: string };
  email?: string;
  runId?: number;
  leaveId?: number;
};

type JobApplyCardPayload = {
  type: "job_apply";
  job: { id: string; title: string; department: string; requirements: string };
};

type JobDetailCardPayload = {
  type: "job_detail";
  job: {
    id: string;
    title: string;
    department: string;
    requirements: string;
    summary: string;
    highlights: string[];
    location: string;
    employmentType: string;
    applications: number;
  };
};

type CvSubmittedCardPayload = {
  type: "cv_submitted";
  id: number;
  candidateName: string;
  jobTitle: string;
  matchScore: number;
  criteria: MatchCriterion[];
  cvUrl: string;
};

type ApplicationStatusCardPayload = {
  type: "application_status";
  email: string;
  applications: Array<{
    id: number;
    jobTitle: string;
    status: string;
    matchScore: number;
    submittedAt: string;
    decisionReason: string | null;
  }>;
};

type RecruitmentDatasetCardPayload = {
  type: "recruitment_dataset";
  summary: Record<string, unknown>;
  jobs: Array<{ id: string; title: string; department: string; status: string; applications: number }>;
  recent: Array<{ id: number; candidateName: string; jobTitle: string; matchScore: number; status: string }>;
  csvUrl: string;
};

type RecruitmentBossPendingCardPayload = {
  type: "recruitment_boss_pending";
  candidates: Array<{ id: number; candidateName: string; jobTitle: string; matchScore: number }>;
};

type RecruitmentBossDoneCard = {
  type: "recruitment_boss_done";
  approved: number;
  ids: number[];
};

type JobDraftPreviewPayload = {
  type: "job_draft_preview";
  notes: string;
  draft: JobDraftPayload;
};

type LeaveRequestCard = {
  type: "leave_request";
  id: number;
  status: string;
  typeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  requestedAt?: string;
  approvedAt?: string | null;
  decidedBy?: string | null;
  decisionReason?: string | null;
};

type LeaveBalanceCard = {
  type: "leave_balance";
  role?: string;
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
};

type PayrollStartCard = {
  type: "payroll_start";
  sampleUrl: string;
  employeeCount?: number;
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
  emailStats?: { sent: number; simulated: number; failed: number };
  artifacts: { bankBatchUrl: string; payrollResultUrl: string };
};

type CardPayload =
  | LeaveRequestCard
  | LeaveBalanceCard
  | LeaveStatsCard
  | PayrollStartCard
  | PayrollPreviewCard
  | PayrollRunCard
  | PayrollPendingListCard
  | PayrollSubmittedCard
  | LeavePendingListCard
  | RecruitmentLeaderboardCard
  | CandidateProfileCardPayload
  | JobListCardPayload
  | JobApplyCardPayload
  | JobDetailCardPayload
  | CvSubmittedCardPayload
  | ApplicationStatusCardPayload
  | RecruitmentDatasetCardPayload
  | RecruitmentBossPendingCardPayload
  | RecruitmentBossDoneCard
  | JobDraftPreviewPayload;

type BotMessage =
  | { kind: "text"; text: string }
  | { kind: "card"; card: CardPayload }
  | { kind: "actions"; actions: ChatAction[] };

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

type ActorSession = { items: TranscriptItem[]; pendingContext?: ChatContext };

function roleLabel(role: string, id?: string) {
  if (id === "applicant") return "Applicant";
  if (role === "MANAGER") return "Boss";
  if (role === "HR_ADMIN") return "HR";
  return "Employee";
}

function welcomeFor(role: string, id?: string) {
  if (id === "applicant") return "Welcome! Tap a job below to apply — no typing needed.";
  if (role === "HR_ADMIN") return "HR workspace — approve leave requests, payroll, recruitment, and job drafts.";
  if (role === "MANAGER") return "Boss workspace — approve payroll, review leave timeline & team statistics.";
  return "Employee workspace — request leave, check balance, track status.";
}

function defaultSession(role: string, id?: string): ActorSession {
  return {
    items: [{ id: uid(), from: "bot", payload: { kind: "text", text: welcomeFor(role, id) } }],
    pendingContext: undefined,
  };
}
function badgeTone(status: string) {
  if (status === "APPROVED" || status === "DONE" || status === "ACCEPTED" || status === "BOSS_APPROVED" || status === "INTERVIEW_INVITED")
    return "bg-pale-gray text-glacier-blue";
  if (status === "PENDING" || status === "DRAFT" || status === "SUBMITTED" || status === "UNDER_REVIEW")
    return "bg-pale-gray text-sunset-gold";
  if (status === "PENDING_BOSS" || status === "HR_SHORTLISTED") return "bg-pale-gray text-royal-amethyst";
  if (status === "REJECTED" || status === "FAILED") return "bg-pale-gray text-ocean-glimmer";
  return "bg-pale-gray text-slate-blue";
}

export default function Home() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [actorEmployeeId, setActorEmployeeId] = useState("emp_001");
  const [sessions, setSessions] = useState<Record<string, ActorSession>>({});
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [supabaseStorage, setSupabaseStorage] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [cvApplyJob, setCvApplyJob] = useState<{ jobId: string; jobTitle: string } | null>(null);

  const currentRole = employees.find((e) => e.id === actorEmployeeId)?.role ?? (actorEmployeeId === "applicant" ? "APPLICANT" : "EMPLOYEE");
  const session = sessions[actorEmployeeId] ?? defaultSession(currentRole, actorEmployeeId);
  const items = session.items;
  const pendingContext = session.pendingContext;

  function updateSession(actorId: string, patch: Partial<ActorSession>) {
    setSessions((prev) => {
      const base = prev[actorId] ?? defaultSession(employees.find((e) => e.id === actorId)?.role ?? "EMPLOYEE", actorId);
      return { ...prev, [actorId]: { ...base, ...patch } };
    });
  }

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((json: { employees?: EmployeeOption[] }) => {
        setEmployees(json.employees ?? []);
      })
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    fetch(`/api/chat/history?sessionId=${encodeURIComponent(actorEmployeeId)}`)
      .then((r) => r.json())
      .then((json: { messages?: Array<{ id: string; role: string; payload: unknown }> }) => {
        if (!json.messages?.length) return;
        const loaded: TranscriptItem[] = json.messages.map((m) =>
          m.role === "user"
            ? { id: m.id, from: "user", text: (m.payload as { text: string }).text }
            : { id: m.id, from: "bot", payload: m.payload as BotMessage },
        );
        updateSession(actorEmployeeId, { items: loaded });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorEmployeeId]);

  useEffect(() => {
    fetch("/api/chat/status")
      .then((r) => r.json())
      .then((json: { aiEnabled?: boolean; model?: string | null }) => {
        setAiEnabled(Boolean(json.aiEnabled));
        setAiModel(json.model ?? null);
      })
      .catch(() => {
        setAiEnabled(false);
      });

    fetch("/api/supabase/status")
      .then((r) => r.json())
      .then((json: { connected?: boolean; storageEnabled?: boolean }) => {
        setSupabaseConnected(Boolean(json.connected));
        setSupabaseStorage(Boolean(json.storageEnabled));
      })
      .catch(() => {
        setSupabaseConnected(false);
      });
  }, []);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const cvFileRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  function scrollChatToBottom() {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    scrollChatToBottom();
  }, [items, busy]);

  useEffect(() => {
    if (pendingContext?.kind === "pending_cv_apply") {
      setCvApplyJob({ jobId: pendingContext.jobId, jobTitle: pendingContext.jobTitle });
    }
  }, [pendingContext]);

  useEffect(() => {
    if (actorEmployeeId !== "applicant") setCvApplyJob(null);
  }, [actorEmployeeId]);

  const quickCommands = useMemo(() => {
    if (actorEmployeeId === "applicant") {
      return ["__browse_jobs__", "__job_details__", "__check_status__", "__upload_cv__"];
    }
    if (currentRole === "HR_ADMIN") {
      return ["Show pending leave requests", "Run payroll", "Draft job posting", "How many CVs for Software Engineer?", "Submit shortlist to boss", "Recruitment dataset"];
    }
    if (currentRole === "MANAGER") {
      return ["Show pending payroll approvals", "Pending recruitment approvals", "Show leave statistics"];
    }
    return aiEnabled
      ? [
          "I need sick leave next Monday through Wednesday",
          "How many vacation days do I have left?",
          "Has my latest leave been approved?",
        ]
      : [
          "Request leave 2026-06-10 to 2026-06-12 annual reason family",
          "What's my leave balance?",
          "Is my leave approved?",
        ];
  }, [aiEnabled, currentRole, actorEmployeeId]);

  type JobOption = { id: string; title: string; department: string; requirements: string; applications?: number };

  function jobBoardMessages(jobs: JobOption[]): BotMessage[] {
    return [
      {
        kind: "card",
        card: {
          type: "job_list",
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            department: j.department,
            applications: j.applications ?? 0,
            requirements: j.requirements,
          })),
        },
      },
      { kind: "text", text: "Tap any role above, or use a button below." },
      {
        kind: "actions",
        actions: jobs.map((j) => ({
          id: "select_job",
          label: j.title,
          tone: "primary" as const,
          job: { id: j.id, title: j.title, department: j.department, requirements: j.requirements },
        })),
      },
    ];
  }

  function selectJob(job: JobOption) {
    setCvApplyJob({ jobId: job.id, jobTitle: job.title });
    const userItem: TranscriptItem = { id: uid(), from: "user", text: `Apply for ${job.title}` };
    const botPayloads: BotMessage[] = [
      { kind: "card", card: { type: "job_apply", job } },
      { kind: "text", text: `You're applying for ${job.title}. Upload your CV when ready.` },
      { kind: "actions", actions: [{ id: "upload_cv", label: "Upload CV", tone: "primary" }] },
    ];
    updateSession(actorEmployeeId, {
      items: [
        ...items,
        userItem,
        ...botPayloads.map((p) => ({ id: uid(), from: "bot" as const, payload: p })),
      ],
      pendingContext: { kind: "pending_cv_apply", jobId: job.id, jobTitle: job.title },
    });
  }

  async function loadApplicantJobBoard() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/recruitment/jobs");
      const json = (await res.json()) as {
        jobs?: Array<{ id: string; title: string; department: string; requirements: string; applications: number }>;
      };
      const jobs = json.jobs ?? [];
      if (!jobs.length) {
        updateSession(actorEmployeeId, {
          items: [
            ...items,
            { id: uid(), from: "bot", payload: { kind: "text", text: "No open jobs right now. Check back soon." } },
          ],
        });
        return;
      }
      const board = jobBoardMessages(jobs);
      updateSession(actorEmployeeId, {
        items: [
          ...items,
          ...board.map((p) => ({ id: uid(), from: "bot" as const, payload: p })),
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  async function checkApplicantStatus(email = "tanjosef33@gmail.com") {
    await send(`Application status ${email}`);
  }

  useEffect(() => {
    if (actorEmployeeId !== "applicant") return;
    const s = sessions[actorEmployeeId];
    if (s && s.items.length > 1) return;
    void loadApplicantJobBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorEmployeeId]);

  async function callChat(message: string, context?: ChatContext) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorEmployeeId, message, context }),
      signal: AbortSignal.timeout(45_000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Request failed");
    return json as { messages?: BotMessage[]; context?: ChatContext };
  }

  async function send(message: string, context?: ChatContext) {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userItem = { id: uid(), from: "user" as const, text: trimmed };
    const baseItems = [...items, userItem];
    updateSession(actorEmployeeId, { items: baseItems });
    setInput("");
    setBusy(true);

    const isGeneratingJob =
      context?.kind === "pending_job_intake" &&
      context.step === "ready" &&
      /^(generate|confirm)$/i.test(trimmed);

    if (isGeneratingJob) {
      updateSession(actorEmployeeId, {
        items: [
          ...baseItems,
          {
            id: uid(),
            from: "bot",
            payload: { kind: "text", text: "Drafting your job posting… usually under 15 seconds." },
          },
        ],
      });
    }

    try {
      const response = await callChat(trimmed, context);
      const bot = (response.messages ?? []).map((m) => ({ id: uid(), from: "bot" as const, payload: m }));
      updateSession(actorEmployeeId, {
        items: [...baseItems, ...bot],
        pendingContext: response.context,
      });
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Something went wrong.";
      updateSession(actorEmployeeId, {
        items: [
          ...baseItems,
          { id: uid(), from: "bot", payload: { kind: "text", text: `Error: ${errText}` } },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleShortlist(applicationId: number, shortlisted: boolean) {
    try {
      await fetch(`/api/recruitment/applications/${applicationId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorEmployeeId, action: shortlisted ? "shortlist" : "unshortlist" }),
      });
    } catch {
      /* non-blocking */
    }
  }

  async function handleRecruitmentDecision(applicationId: number, action: "accept" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(`/api/recruitment/applications/${applicationId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actorEmployeeId, action }),
      });
      const json = await res.json();
      const msg = json.email?.message ?? `Candidate ${action}ed.`;
      updateSession(actorEmployeeId, {
        items: [
          ...items,
          { id: uid(), from: "bot", payload: { kind: "text", text: msg } },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveDecision(leaveId: number, decision: "APPROVE" | "REJECT") {
    setBusy(true);
    try {
      const reason = decision === "REJECT" ? window.prompt("Rejection reason (optional):") ?? undefined : undefined;
      const res = await fetch(`/api/leave-requests/${leaveId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, actorEmployeeId, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Decision failed");

      const updated = json.leaveRequest as {
        id: number;
        status: string;
        type: string;
        reason: string;
        startDate: string;
        endDate: string;
        decidedAt: string | null;
        decidedBy: string | null;
        decisionReason: string | null;
        createdAt: string;
      };

      updateSession(actorEmployeeId, {
        items: [
          ...items,
          {
            id: uid(),
            from: "bot",
            payload: {
              kind: "text",
              text: `Leave request #${leaveId} ${decision === "APPROVE" ? "approved" : "rejected"}.`,
            },
          },
          {
            id: uid(),
            from: "bot",
            payload: {
              kind: "card",
              card: {
                type: "leave_request",
                id: updated.id,
                status: updated.status,
                typeName: updated.type,
                startDate: updated.startDate.slice(0, 10),
                endDate: updated.endDate.slice(0, 10),
                reason: updated.reason,
                requestedAt: updated.createdAt,
                approvedAt: updated.decidedAt,
                decidedBy: updated.decidedBy,
                decisionReason: updated.decisionReason,
              } satisfies LeaveRequestCard,
            },
          },
        ],
      });
    } catch (err) {
      updateSession(actorEmployeeId, {
        items: [
          ...items,
          {
            id: uid(),
            from: "bot",
            payload: {
              kind: "text",
              text: `Leave decision error: ${err instanceof Error ? err.message : "Failed"}`,
            },
          },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action: ChatAction) {
    if (action.id === "select_job" && action.job) {
      selectJob(action.job);
      return;
    }

    if (action.id === "check_status") {
      await checkApplicantStatus(action.email);
      return;
    }

    if (action.id === "upload_payroll") {
      fileRef.current?.click();
      return;
    }

    if (action.id === "upload_cv") {
      cvFileRef.current?.click();
      return;
    }

    if (action.id === "generate_job_draft") {
      await send("generate", pendingContext);
      return;
    }

    if (action.id === "publish_job_draft") {
      await send("confirm", pendingContext);
      return;
    }

    if (action.id === "regenerate_job_draft") {
      await send("regenerate", pendingContext);
      return;
    }

    if (action.id === "approve_payroll_run" && action.runId) {
      await send(`approve payroll run ${action.runId}`, undefined);
      return;
    }

    if (action.id === "approve_leave" && action.leaveId) {
      await handleLeaveDecision(action.leaveId, "APPROVE");
      return;
    }

    if (action.id === "reject_leave" && action.leaveId) {
      await handleLeaveDecision(action.leaveId, "REJECT");
      return;
    }

    if (action.id === "confirm" || action.id === "submit_payroll_boss" || action.id === "approve_payroll_boss" || action.id === "approve_recruitment_boss") {
      await send("confirm", pendingContext);
      return;
    }

    if (action.id === "cancel") {
      await send("cancel", pendingContext);
    }
  }

  function runQuickCommand(cmd: string) {
    if (cmd === "__browse_jobs__") {
      void loadApplicantJobBoard();
      return;
    }
    if (cmd === "__job_details__") {
      void send("Tell me about the open job roles");
      return;
    }
    if (cmd === "__check_status__") {
      void checkApplicantStatus();
      return;
    }
    if (cmd === "__upload_cv__") {
      if (cvApplyJob) cvFileRef.current?.click();
      else void loadApplicantJobBoard();
      return;
    }
    void send(cmd, undefined);
  }

  async function onCvUpload(file: File) {
    const jobCtx =
      cvApplyJob ?? (pendingContext?.kind === "pending_cv_apply" ? pendingContext : null);

    if (!jobCtx) {
      updateSession(actorEmployeeId, {
        items: [
          ...items,
          {
            id: uid(),
            from: "bot",
            payload: {
              kind: "text",
              text: 'Say “Apply for Senior Software Engineer” first, then click Upload CV.',
            },
          },
        ],
      });
      return;
    }

    const userItem = { id: uid(), from: "user" as const, text: `Uploading CV: ${file.name}` };
    const progressItem = {
      id: uid(),
      from: "bot" as const,
      payload: {
        kind: "text" as const,
        text: `Scanning your CV for ${jobCtx.jobTitle}… AI scoring usually takes 15–30 seconds.`,
      },
    };
    const baseItems = [...items, userItem, progressItem];
    updateSession(actorEmployeeId, { items: baseItems });
    setBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("jobId", jobCtx.jobId);
      form.append("actorEmployeeId", actorEmployeeId);
      const res = await fetch("/api/recruitment/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");

      const chatRes = await callChat(`Submitted CV for ${jobCtx.jobTitle}`, {
        kind: "cv_uploaded",
        applicationId: json.applicationId,
      });
      const bot = (chatRes.messages ?? []).map((m) => ({ id: uid(), from: "bot" as const, payload: m }));
      setCvApplyJob(null);
      updateSession(actorEmployeeId, {
        items: [...baseItems, ...bot],
        pendingContext: chatRes.context,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      updateSession(actorEmployeeId, {
        items: [
          ...baseItems,
          { id: uid(), from: "bot", payload: { kind: "text", text: `CV upload error: ${message}` } },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("actorEmployeeId", actorEmployeeId);
      const res = await fetch("/api/payroll/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      await send(`Uploaded ${file.name}`, { kind: "payroll_uploaded", runId: json.runId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      updateSession(actorEmployeeId, {
        items: [
          ...items,
          { id: uid(), from: "bot", payload: { kind: "text", text: `Upload error: ${message}` } },
        ],
      });
    } finally {
      setBusy(false);
    }
  }

  const chatSubtitle =
    actorEmployeeId === "applicant"
      ? "Jobs · Apply · Upload CV · Track status"
      : roleLabel(currentRole, actorEmployeeId);

  return (
    <div className="relative flex h-[calc(100dvh-73px)] min-h-0 flex-1 overflow-hidden bg-cloud-mist text-text-black">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(229,92,255,0.08),transparent_40%),radial-gradient(circle_at_85%_60%,rgba(0,153,255,0.07),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(0,107,255,0.05),transparent_40%)]" />

      <main className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl gap-6 px-6 py-4">
        <aside className="hidden h-full min-h-0 w-80 shrink-0 overflow-y-auto lg:block">
          <div className="card-floating p-6">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Demo Identity</div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-midnight-indigo">Who are you?</div>
            <select
              value={actorEmployeeId}
              onChange={(e) => setActorEmployeeId(e.target.value)}
              className="mt-4 w-full rounded-lg border border-platinum-tint bg-snow-white px-4 py-3 text-sm text-text-black outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
            >
              {employees.length === 0 ? (
                <>
                  <option value="emp_001">Ava Nguyen (Employee)</option>
                  <option value="mgr_001">Minh Tran (Boss)</option>
                  <option value="hr_001">Lan Pham (HR)</option>
                </>
              ) : (
                employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({roleLabel(e.role, e.id)})
                  </option>
                ))
              )}
            </select>
            <div className="mt-3 text-xs text-slate-blue">Each person has a separate chat history.</div>

            <div className="mt-8 text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">
              {actorEmployeeId === "applicant" ? "Quick actions" : "Quick Commands"}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {(actorEmployeeId === "applicant"
                ? [
                    { key: "__browse_jobs__", label: "Browse open jobs" },
                    { key: "__job_details__", label: "Job descriptions" },
                    { key: "__upload_cv__", label: cvApplyJob ? `Upload CV · ${cvApplyJob.jobTitle}` : "Upload CV" },
                    { key: "__check_status__", label: "Check application status" },
                  ]
                : quickCommands.map((cmd) => ({ key: cmd, label: cmd }))
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => runQuickCommand(key)}
                  className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 text-left text-sm text-midnight-indigo transition hover:border-action-blue/30 hover:bg-pale-gray"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="card-floating flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-platinum-tint px-6 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Chat</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-midnight-indigo">{chatSubtitle}</div>
              {cvApplyJob && actorEmployeeId === "applicant" ? (
                <div className="mt-1 text-xs text-action-blue">
                  Ready to upload CV for {cvApplyJob.jobTitle}
                </div>
              ) : null}
            </div>
            <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
              <div className="badge-info flex items-center gap-2 !rounded-full !px-3 !py-1.5">
                <div className={`h-2 w-2 rounded-full ${supabaseConnected ? "bg-skybound-blue" : "bg-steel-gray"}`} />
                {supabaseConnected ? (supabaseStorage ? "Supabase · Storage" : "Supabase") : "Supabase off"}
              </div>
              <div className="badge-info flex items-center gap-2 !rounded-full !px-3 !py-1.5">
                <div className={`h-2 w-2 rounded-full ${aiEnabled ? "bg-royal-amethyst" : "bg-action-blue"}`} />
                {aiEnabled ? `AI · ${aiModel ?? "enabled"}` : "Rules mode"}
              </div>
            </div>
          </div>

          <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            <div className="flex flex-col gap-4">
              {items.map((it) =>
                it.from === "user" ? (
                  <div key={it.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-lg bg-action-blue px-4 py-3 text-sm text-snow-white shadow-interactive">
                      {it.text}
                    </div>
                  </div>
                ) : it.payload.kind === "text" ? (
                  <div key={it.id} className="flex justify-start">
                    <div className="max-w-[82%] whitespace-pre-wrap rounded-lg border border-platinum-tint bg-pale-gray px-4 py-3 text-sm text-text-black">
                      {it.payload.text}
                    </div>
                  </div>
                ) : it.payload.kind === "actions" ? (
                  <div key={it.id} className="flex justify-start">
                    <div className="flex flex-wrap gap-2">
                      {it.payload.actions.map((a) => (
                        <button
                          key={`${a.id}-${a.label}`}
                          type="button"
                          disabled={busy}
                          onClick={() => void handleAction(a)}
                          className={[
                            "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60",
                            a.tone === "danger"
                              ? "border border-ocean-glimmer/30 bg-pale-gray text-ocean-glimmer hover:bg-pale-gray/80"
                              : "btn-primary",
                          ].join(" ")}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={it.id} className="flex justify-start">
                    <Card
                      card={it.payload.card}
                      badgeTone={badgeTone}
                      money={money}
                      actorEmployeeId={actorEmployeeId}
                      onProfile={(id) => void send(`candidate profile ${id}`)}
                      onShortlist={(id, s) => void handleShortlist(id, s)}
                      onDecision={(id, a) => void handleRecruitmentDecision(id, a)}
                      onSelectJob={selectJob}
                      onUploadCv={() => cvFileRef.current?.click()}
                      onApprovePayrollRun={(runId) => void send(`approve payroll run ${runId}`, undefined)}
                      onLeaveDecision={(id, d) => void handleLeaveDecision(id, d)}
                      selectedJobId={cvApplyJob?.jobId ?? null}
                      busy={busy}
                    />
                  </div>
                ),
              )}
              {busy ? (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-platinum-tint bg-pale-gray px-4 py-2 text-xs text-slate-blue">
                    Working…
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-platinum-tint bg-cloud-mist px-6 py-4">
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(
                  input,
                  pendingContext?.kind?.startsWith("pending_") || pendingContext?.kind === "cv_uploaded"
                    ? pendingContext
                    : undefined,
                );
              }}
            >
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Message</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  placeholder={
                    actorEmployeeId === "applicant"
                      ? "Browse jobs, apply, or check your application status…"
                      : aiEnabled
                        ? "Ask about leave, payroll, or recruitment…"
                        : "Type a command…"
                  }
                  className="mt-2 w-full resize-none rounded-lg border border-platinum-tint bg-snow-white px-4 py-3 text-sm text-text-black outline-none focus:border-action-blue focus:ring-2 focus:ring-action-blue/20"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary h-12 shrink-0 px-5 disabled:opacity-60"
              >
                {busy ? "…" : "Send"}
              </button>
            </form>

            {cvApplyJob && actorEmployeeId === "applicant" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => cvFileRef.current?.click()}
                className="mt-3 w-full rounded-lg border border-action-blue/30 bg-pale-gray px-4 py-2.5 text-sm font-medium text-action-blue transition hover:bg-pale-gray/80 disabled:opacity-60"
              >
                Upload CV for {cvApplyJob.jobTitle}
              </button>
            ) : null}

            <input
              ref={cvFileRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onCvUpload(file);
              }}
            />
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
  actorEmployeeId,
  onProfile,
  onShortlist,
  onDecision,
  onSelectJob,
  onUploadCv,
  onApprovePayrollRun,
  onLeaveDecision,
  selectedJobId,
  busy,
}: {
  card: CardPayload;
  badgeTone: (status: string) => string;
  money: (v: number) => string;
  actorEmployeeId: string;
  onProfile: (id: number) => void;
  onShortlist: (id: number, shortlisted: boolean) => void;
  onDecision: (id: number, action: "accept" | "reject") => void;
  onSelectJob?: (job: { id: string; title: string; department: string; requirements: string }) => void;
  onUploadCv?: () => void;
  onApprovePayrollRun?: (runId: number) => void;
  onLeaveDecision?: (leaveId: number, decision: "APPROVE" | "REJECT") => void;
  selectedJobId?: string | null;
  busy?: boolean;
}) {
  if (card?.type === "job_list") {
    return (
      <JobListCard
        jobs={card.jobs}
        selectedJobId={selectedJobId ?? null}
        onSelectJob={onSelectJob}
      />
    );
  }

  if (card?.type === "job_apply") {
    return (
      <JobApplyCard
        job={card.job}
        busy={busy}
        onUploadCv={onUploadCv}
      />
    );
  }

  if (card?.type === "job_detail") {
    return (
      <JobDetailCard
        job={card.job}
        busy={busy}
        onSelectJob={onSelectJob}
        onUploadCv={onUploadCv}
      />
    );
  }

  if (card?.type === "cv_submitted") {
    return (
      <CvSubmittedCard
        candidateName={card.candidateName}
        jobTitle={card.jobTitle}
        matchScore={card.matchScore}
        criteria={card.criteria}
        cvUrl={card.cvUrl}
      />
    );
  }

  if (card?.type === "recruitment_leaderboard") {
    return (
      <LeaderboardCard
        jobTitle={card.jobTitle}
        totalApplications={card.totalApplications}
        openJobs={card.openJobs}
        candidates={card.candidates}
        actorRole={card.actorRole}
        actorEmployeeId={actorEmployeeId}
        onProfile={onProfile}
        onShortlist={onShortlist}
        badgeTone={badgeTone}
      />
    );
  }

  if (card?.type === "candidate_profile") {
    return (
      <CandidateProfileCard
        profile={card}
        actorRole={card.actorRole}
        actorEmployeeId={actorEmployeeId}
        onDecision={onDecision}
        badgeTone={badgeTone}
      />
    );
  }

  if (card?.type === "application_status") {
    return <ApplicationStatusCard email={card.email} applications={card.applications} badgeTone={badgeTone} />;
  }

  if (card?.type === "recruitment_dataset") {
    return <RecruitmentDatasetCard summary={card.summary} jobs={card.jobs} recent={card.recent} csvUrl={card.csvUrl} />;
  }

  if (card?.type === "job_draft_preview") {
    return <JobDraftPreviewCard notes={card.notes} draft={card.draft} />;
  }

  if (card?.type === "recruitment_boss_pending") {
    return <RecruitmentBossPendingCard candidates={card.candidates} />;
  }

  if (card?.type === "leave_pending_list") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Pending Leave — HR Review</div>
        <div className="mt-1 text-xs text-slate-blue">{card.requests.length} request(s) awaiting approval</div>
        <div className="mt-4 flex flex-col gap-2">
          {card.requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-midnight-indigo">
                    #{r.id} · {r.employeeName}
                  </div>
                  <div className="mt-1 text-slate-blue">
                    {r.type} · {r.startDate} → {r.endDate}
                  </div>
                  <div className="mt-1 text-xs text-steel-gray">Requested {r.requestedAt.slice(0, 10)}</div>
                  <div className="mt-1 text-slate-blue">{r.reason}</div>
                </div>
                {onLeaveDecision ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onLeaveDecision(r.id, "APPROVE")}
                      className="btn-primary !px-3 !py-1.5 !text-xs disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onLeaveDecision(r.id, "REJECT")}
                      className="rounded-lg border border-ocean-glimmer/30 bg-pale-gray px-3 py-1.5 text-xs font-medium text-ocean-glimmer disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card?.type === "recruitment_boss_done") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="text-sm font-semibold text-midnight-indigo">Recruitment approved</div>
        <div className="mt-2 text-slate-blue">{card.approved} candidate(s) cleared for HR interview decisions.</div>
      </div>
    );
  }

  if (card?.type === "leave_request") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Leave Request #{card.id}</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(card.status)}`}>
            {card.status}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Type</div>
            <div className="mt-1 font-medium text-midnight-indigo">{String(card.typeName)}</div>
          </div>
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Leave dates</div>
            <div className="mt-1 font-medium text-midnight-indigo">
              {card.startDate} → {card.endDate}
            </div>
          </div>
          {card.requestedAt ? (
            <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Requested</div>
              <div className="mt-1 font-medium text-midnight-indigo">{card.requestedAt.slice(0, 10)}</div>
            </div>
          ) : null}
          {card.approvedAt ? (
            <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">HR approved</div>
              <div className="mt-1 font-medium text-midnight-indigo">{card.approvedAt.slice(0, 10)}</div>
            </div>
          ) : card.status === "PENDING" ? (
            <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Status</div>
              <div className="mt-1 font-medium text-sunset-gold">Awaiting HR review</div>
            </div>
          ) : null}
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 sm:col-span-2">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Reason</div>
            <div className="mt-1 font-medium text-midnight-indigo">{card.reason}</div>
          </div>
        </div>
        {card.decidedBy ? (
          <div className="mt-4 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 text-sm">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Decision</div>
            <div className="mt-1 font-medium text-midnight-indigo">
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
      <div className="card-floating max-w-[82%] p-5">
        <div className="text-sm font-semibold tracking-tight text-midnight-indigo">
          Leave Balance{card.role ? ` (${roleLabel(card.role)})` : ""}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["annual", "sick"] as const).map((k) => (
            <div key={k} className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">{k}</div>
              <div className="mt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-blue">Remaining</span>
                  <span className="font-semibold text-midnight-indigo">{card[k].remaining}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-steel-gray">
                  <span>Used</span>
                  <span>{card[k].used}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-steel-gray">
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

  if (card?.type === "leave_stats") {
    const isBoss = card.actorRole === "MANAGER";
    return (
      <div className="card-floating max-w-[95%] p-5">
        <div className="text-sm font-semibold tracking-tight text-midnight-indigo">
          {isBoss ? "Team Leave Timeline" : "Team Leave Statistics"}
        </div>
        {isBoss ? (
          <div className="mt-1 text-xs text-slate-blue">
            When each person requested leave, when HR approved, and the leave dates.
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Headcount", card.summary.headcount],
            ["Pending HR", card.summary.pendingLeaves],
            ["Approved", card.summary.approvedLeaves],
            ["Payroll waiting", card.summary.payrollPendingBoss],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-lg border border-platinum-tint bg-cloud-mist px-3 py-2 text-sm">
              <div className="text-xs text-steel-gray">{label}</div>
              <div className="mt-1 text-lg font-semibold text-midnight-indigo">{val}</div>
            </div>
          ))}
        </div>

        {card.timeline?.length ? (
          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-platinum-tint bg-cloud-mist">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-pale-gray text-steel-gray">
                <tr>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Leave dates</th>
                  <th className="px-3 py-2">Requested</th>
                  <th className="px-3 py-2">Approved</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {card.timeline.map((t) => (
                  <tr key={t.id} className="border-t border-platinum-tint text-midnight-indigo">
                    <td className="px-3 py-2 font-medium">{t.employeeName}</td>
                    <td className="px-3 py-2">{t.type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.startDate} → {t.endDate}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{t.requestedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.approvedAt ? t.approvedAt.slice(0, 10) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeTone(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!isBoss ? (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-platinum-tint bg-cloud-mist">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-pale-gray text-steel-gray">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Annual</th>
                  <th className="px-3 py-2">Sick</th>
                  <th className="px-3 py-2">Pending</th>
                </tr>
              </thead>
              <tbody>
                {card.employees.map((e) => (
                  <tr key={e.id} className="border-t border-platinum-tint text-midnight-indigo">
                    <td className="px-3 py-2">{e.name}</td>
                    <td className="px-3 py-2">
                      {e.annualRemaining}/{e.annualTotal}
                    </td>
                    <td className="px-3 py-2">
                      {e.sickRemaining}/{e.sickTotal}
                    </td>
                    <td className="px-3 py-2">{e.pendingRequests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  if (card?.type === "payroll_pending_list") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Pending Payroll Approvals</div>
        <div className="mt-3 flex flex-col gap-2">
          {card.runs.map((r) => (
            <div key={r.runId} className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-midnight-indigo">Run #{r.runId}</div>
                  <div className="mt-1 text-slate-blue">{r.filename}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-midnight-indigo">{money(r.totalAmount)}</span>
                  {onApprovePayrollRun ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onApprovePayrollRun(r.runId)}
                      className="btn-primary !px-4 !py-1.5 !text-xs disabled:opacity-50"
                    >
                      Review & approve →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card?.type === "payroll_submitted") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Payroll Run #{card.runId}</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(card.status)}`}>{card.status}</div>
        </div>
        <div className="mt-3 text-sm text-slate-blue">Submitted to Boss — waiting for approval.</div>
        <div className="mt-2 text-lg font-semibold text-midnight-indigo">{money(card.totalAmount)}</div>
      </div>
    );
  }

  if (card?.type === "payroll_start") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Payroll Run</div>
        <div className="mt-2 text-sm text-slate-blue">
          Download <span className="font-semibold text-midnight-indigo">payroll.xlsx</span>
          {card.employeeCount ? ` — includes all ${card.employeeCount} employees from the system.` : " with one row per employee."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={card.sampleUrl} className="btn-primary inline-block !no-underline">
            Download sample payroll.xlsx
          </a>
        </div>
      </div>
    );
  }

  if (card?.type === "payroll_preview") {
    return (
      <div className="card-floating max-w-[82%] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Payroll Preview (Run #{card.runId})</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("DRAFT")}`}>DRAFT</div>
        </div>
        <div className="mt-2 text-xs text-steel-gray">{card.inputFilename}</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Rows</div>
            <div className="mt-1 text-lg font-semibold text-midnight-indigo">{card.rowCount}</div>
          </div>
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Valid</div>
            <div className="mt-1 text-lg font-semibold text-glacier-blue">{card.validCount}</div>
          </div>
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Invalid</div>
            <div className="mt-1 text-lg font-semibold text-ocean-glimmer">{card.invalidCount}</div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Valid Total</div>
          <div className="mt-1 text-lg font-semibold text-midnight-indigo">{money(card.totalAmount)}</div>
        </div>

        {card.invalidRows?.length ? (
          <div className="mt-4 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Invalid rows (first {card.invalidRows.length})</div>
            <div className="mt-3 flex flex-col gap-3">
              {card.invalidRows.map((r: PayrollPreviewInvalidRow) => (
                <div key={r.rowNumber} className="rounded-lg border border-platinum-tint bg-snow-white px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-midnight-indigo">
                      Row {r.rowNumber} — {r.employeeName || "Unknown"}
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("FAILED")}`}>FAILED</div>
                  </div>
                  <div className="mt-2 text-slate-blue">
                    <div>{r.email}</div>
                    <div className="mt-1 font-mono text-xs text-steel-gray">{r.bankAccountMasked}</div>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-ocean-glimmer">
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
      <div className="card-floating max-w-[82%] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-tight text-midnight-indigo">Payroll Run #{card.runId}</div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone("DONE")}`}>DONE</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Total</div>
            <div className="mt-1 text-lg font-semibold text-midnight-indigo">{money(card.totalAmount)}</div>
          </div>
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Emails sent</div>
            <div className="mt-1 text-lg font-semibold text-glacier-blue">{card.emailStats?.sent ?? card.validCount}</div>
          </div>
          <div className="rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Simulated</div>
            <div className="mt-1 text-lg font-semibold text-slate-blue">{card.emailStats?.simulated ?? 0}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={card.artifacts.bankBatchUrl} className="btn-ghost rounded-lg border border-platinum-tint bg-cloud-mist !no-underline hover:bg-pale-gray">
            Download bank_batch.csv
          </a>
          <a href={card.artifacts.payrollResultUrl} className="btn-ghost rounded-lg border border-platinum-tint bg-cloud-mist !no-underline hover:bg-pale-gray">
            Download payroll_result.xlsx
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[82%] rounded-lg border border-platinum-tint bg-pale-gray px-4 py-3 text-sm text-slate-blue">
      Unsupported card
    </div>
  );
}
