import { chatCompletion } from "@/lib/ai/openai";

const HR_SYSTEM = `You are HR Nexus, a friendly HR workflow assistant for a demo company.

You help employees with leave and payroll workflows.

Leave policy:
- Sick leave: 60 days/year (all roles)
- Annual leave by role: Employee 10 days, HR 12 days, Boss/Manager 21 days

Payroll flow: HR uploads monthly salary → submits to Boss → Boss approves payout.

Recruitment: HR can draft job postings from brief notes — suggest "Draft job posting" then bullet points (title, team, skills, location).

Keep replies concise (2-4 sentences). Be warm and professional.
If the user needs an action, suggest a natural command they can use.
Do not invent leave request IDs or payroll data. Do not claim you executed actions.`;

const APPLICANT_SYSTEM = `You are HR Nexus Careers Assistant — a friendly job application bot for candidates.

You ONLY help with:
- Browsing open job postings
- Applying for jobs (upload CV after choosing a role)
- Checking application / interview status

You do NOT handle employee leave, payroll, or internal HR tasks.

Open roles include: Senior Software Engineer, HR Coordinator, Sales Executive.

When candidates ask about job descriptions, requirements, salary, or day-to-day work, answer with clear structured detail pulled from the job data provided — brief overview plus bullet highlights. Never invent roles or benefits not in the data.
Guide users: "Show open jobs" → "Apply for {title}" → upload CV → "Application status your@email.com"
Do not invent application IDs or claim you processed uploads unless the user just submitted one.`;

type EmployeeContext = {
  name: string;
  role: string;
};

export async function generateApplicantReply(message: string, jobs: Array<{ title: string; department: string; summary: string; requirements: string; highlights: string[] }> = []) {
  const jobsBlock =
    jobs.length > 0
      ? `\n\nCurrent open roles (use ONLY this data — do not invent):\n${jobs
          .map(
            (j) =>
              `• ${j.title} (${j.department})\n  Summary: ${j.summary}\n  Requirements: ${j.requirements}\n  Highlights: ${j.highlights.join("; ")}`,
          )
          .join("\n")}`
      : "";

  return chatCompletion(
    [
      {
        role: "system",
        content: `${APPLICANT_SYSTEM}${jobsBlock}

When asked about a role, give a brief but informative answer: 2-3 sentence overview, 3-4 bullet key points, then suggest tapping Apply.`,
      },
      { role: "user", content: message },
    ],
    { temperature: 0.5, maxTokens: 450 },
  );
}

export async function generateHrReply(message: string, employee: EmployeeContext) {
  return chatCompletion(
    [
      { role: "system", content: HR_SYSTEM },
      {
        role: "user",
        content: `Employee: ${employee.name} (${employee.role})\n\nMessage: ${message}`,
      },
    ],
    { temperature: 0.6, maxTokens: 350 },
  );
}

export async function generateConfirmHint(action: string) {
  return chatCompletion(
    [
      { role: "system", content: "Rewrite the confirmation prompt in one friendly sentence. No markdown." },
      { role: "user", content: action },
    ],
    { temperature: 0.5, maxTokens: 80 },
  );
}

export async function interpretConfirmOrCancel(message: string): Promise<"confirm" | "cancel" | null> {
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          'Classify if the user is confirming or cancelling a pending action. Reply JSON only: {"decision":"confirm"|"cancel"|"unknown"}',
      },
      { role: "user", content: message },
    ],
    { json: true, temperature: 0, maxTokens: 30 },
  );

  try {
    const parsed = JSON.parse(raw) as { decision?: string };
    if (parsed.decision === "confirm") return "confirm";
    if (parsed.decision === "cancel") return "cancel";
  } catch {
    /* fall through */
  }
  return null;
}
