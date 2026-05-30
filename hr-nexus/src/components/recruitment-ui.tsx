"use client";

export type MatchCriterion = {
  label: string;
  score: number;
  matched: boolean;
  note: string;
};

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {score}%
      </div>
    </div>
  );
}

function MatchBar({ criterion }: { criterion: MatchCriterion }) {
  return (
    <div className="group rounded-xl border border-white/8 bg-black/25 p-3 transition hover:border-teal-400/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white/90">{criterion.label}</span>
        <span className={`text-xs font-semibold ${criterion.matched ? "text-emerald-300" : "text-rose-300"}`}>
          {criterion.matched ? "Match" : "Gap"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${criterion.matched ? "bg-gradient-to-r from-teal-400 to-emerald-400" : "bg-gradient-to-r from-rose-400/80 to-orange-400/60"}`}
          style={{ width: `${criterion.score}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/55">{criterion.note}</p>
    </div>
  );
}

function statusPill(status: string, badgeTone: (s: string) => string) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(status)}`}>{status.replace(/_/g, " ")}</span>
  );
}

export function JobListCard({
  jobs,
  onSelectJob,
  selectedJobId,
}: {
  jobs: Array<{ id: string; title: string; department: string; applications: number; requirements?: string }>;
  onSelectJob?: (job: { id: string; title: string; department: string; requirements: string }) => void;
  selectedJobId?: string | null;
}) {
  return (
    <div className="max-w-[90%] overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-950/40 via-black/50 to-orange-950/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400/15 text-lg">◆</div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-teal-300/70">Open roles</div>
          <div className="text-base font-semibold tracking-tight">Tap a role to apply</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {jobs.map((j) => {
          const selected = selectedJobId === j.id;
          return (
            <button
              key={j.id}
              type="button"
              onClick={() =>
                onSelectJob?.({
                  id: j.id,
                  title: j.title,
                  department: j.department,
                  requirements: j.requirements ?? "",
                })
              }
              className={[
                "group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                selected
                  ? "border-teal-400/50 bg-teal-400/10 ring-1 ring-teal-400/30"
                  : "border-white/10 bg-black/35 hover:border-teal-400/35 hover:bg-black/50",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="font-medium text-white group-hover:text-teal-100">{j.title}</div>
                <div className="text-xs text-white/50">{j.department}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 group-hover:bg-teal-400/20">
                  Apply →
                </span>
                <span className="text-[10px] text-white/40">{j.applications} applicants</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function JobDetailCard({
  job,
  onSelectJob,
  onUploadCv,
  busy,
}: {
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
  onSelectJob?: (job: { id: string; title: string; department: string; requirements: string }) => void;
  onUploadCv?: () => void;
  busy?: boolean;
}) {
  const reqBullets = job.requirements.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="max-w-[92%] rounded-3xl border border-sky-500/25 bg-gradient-to-br from-sky-950/35 via-black/55 to-teal-950/25 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-sky-300/70">Role overview</div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{job.title}</h3>
          <p className="mt-1 text-sm text-white/55">{job.department}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-white/65">{job.location}</span>
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-white/65">{job.employmentType}</span>
          <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-white/65">{job.applications} applicants</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-white/80">{job.summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-teal-300/70">Highlights</div>
          <ul className="mt-2 space-y-1.5">
            {job.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-sm text-white/75">
                <span className="text-teal-400">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-orange-300/70">Requirements</div>
          <ul className="mt-2 space-y-1.5">
            {reqBullets.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-white/75">
                <span className="text-orange-300">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onSelectJob ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSelectJob({
                id: job.id,
                title: job.title,
                department: job.department,
                requirements: job.requirements,
              })
            }
            className="rounded-full border border-teal-400/40 bg-teal-400/15 px-4 py-2 text-sm font-medium text-teal-100 transition hover:bg-teal-400/25 disabled:opacity-50"
          >
            Apply for this role
          </button>
        ) : null}
        {onUploadCv ? (
          <button
            type="button"
            disabled={busy}
            onClick={onUploadCv}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15 disabled:opacity-50"
          >
            Upload CV
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function JobApplyCard({
  job,
  onUploadCv,
  busy,
}: {
  job: { id: string; title: string; department: string; requirements: string };
  onUploadCv?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="max-w-[90%] rounded-3xl border border-orange-400/25 bg-gradient-to-br from-orange-950/30 via-black/50 to-teal-950/20 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-orange-300/70">Applying for</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{job.title}</div>
      <div className="mt-1 text-sm text-white/55">{job.department}</div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-white/45">Requirements</div>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{job.requirements}</p>
      </div>
      {onUploadCv ? (
        <button
          type="button"
          disabled={busy}
          onClick={onUploadCv}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          Upload CV to apply
        </button>
      ) : null}
    </div>
  );
}

export function CvSubmittedCard({
  candidateName,
  jobTitle,
  matchScore,
  criteria,
  cvUrl,
}: {
  candidateName: string;
  jobTitle: string;
  matchScore: number;
  criteria: MatchCriterion[];
  cvUrl: string;
}) {
  return (
    <div className="max-w-[90%] rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 via-black/50 to-teal-950/20 p-5">
      <div className="flex items-start gap-4">
        <ScoreRing score={matchScore} size={64} />
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70">Application received</div>
          <div className="mt-1 text-lg font-semibold">{candidateName}</div>
          <div className="text-sm text-white/55">{jobTitle}</div>
        </div>
      </div>
      {criteria.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {criteria.slice(0, 4).map((c) => (
            <MatchBar key={c.label} criterion={c} />
          ))}
        </div>
      )}
      <a href={cvUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-teal-300 hover:text-teal-200">
        View uploaded CV →
      </a>
    </div>
  );
}

export function LeaderboardCard({
  jobTitle,
  totalApplications,
  openJobs,
  candidates,
  actorRole,
  onProfile,
  onShortlist,
  badgeTone,
}: {
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
  actorEmployeeId: string;
  onProfile: (id: number) => void;
  onShortlist: (id: number, shortlisted: boolean) => void;
  badgeTone: (s: string) => string;
}) {
  const isHr = actorRole === "HR_ADMIN";

  return (
    <div className="max-w-[95%] rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/35 via-black/55 to-teal-950/25 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-violet-300/70">Talent pipeline</div>
          <div className="mt-1 text-lg font-semibold">
            {jobTitle ? jobTitle : "All positions"} · {totalApplications} CV{totalApplications !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {openJobs.map((j) => (
            <span key={j.id} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/60">
              {j.title}: {j.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {candidates.map((c, idx) => (
          <div
            key={c.id}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 transition hover:border-violet-400/30 hover:bg-black/50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-white/50">
              #{idx + 1}
            </div>
            {isHr && (
              <input
                type="checkbox"
                checked={c.hrShortlisted}
                onChange={(e) => onShortlist(c.id, e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-white/30 bg-black/50 accent-teal-400"
                title="Shortlist for Boss"
              />
            )}
            <ScoreRing score={c.matchScore} size={44} />
            <button type="button" onClick={() => onProfile(c.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium text-white group-hover:text-teal-200">{c.candidateName}</div>
              <div className="truncate text-xs text-white/50">
                {c.jobTitle} · {c.candidateEmail}
              </div>
            </button>
            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              {statusPill(c.status, badgeTone)}
              {c.bossApproved && <span className="text-[10px] text-emerald-400">Boss ✓</span>}
            </div>
          </div>
        ))}
        {!candidates.length && (
          <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
            No applications yet — share job postings with candidates.
          </div>
        )}
      </div>
    </div>
  );
}

export function CandidateProfileCard({
  profile,
  actorRole,
  onDecision,
  badgeTone,
}: {
  profile: {
    id: number;
    candidateName: string;
    candidateEmail: string;
    phone: string | null;
    jobTitle: string;
    department: string;
    matchScore: number;
    status: string;
    bossApproved: boolean;
    criteria: MatchCriterion[];
    parsedExcerpt: string;
    cvUrl: string;
    decisionReason: string | null;
  };
  actorRole: string;
  actorEmployeeId: string;
  onDecision: (id: number, action: "accept" | "reject") => void;
  badgeTone: (s: string) => string;
}) {
  const isHr = actorRole === "HR_ADMIN";
  const canDecide = isHr && (profile.status === "BOSS_APPROVED" || profile.bossApproved);

  return (
    <div className="max-w-[95%] rounded-3xl border border-teal-400/25 bg-gradient-to-br from-slate-950/80 via-black/60 to-teal-950/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreRing score={profile.matchScore} size={72} />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-teal-300/70">Candidate profile</div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{profile.candidateName}</h3>
            <p className="text-sm text-white/55">
              {profile.jobTitle} · {profile.department}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {profile.candidateEmail}
              {profile.phone ? ` · ${profile.phone}` : ""}
            </p>
          </div>
        </div>
        {statusPill(profile.status, badgeTone)}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {profile.criteria.map((c) => (
          <MatchBar key={c.label} criterion={c} />
        ))}
      </div>

      {profile.parsedExcerpt && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">CV excerpt</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{profile.parsedExcerpt}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={profile.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
        >
          Open CV
        </a>
        {canDecide && (
          <>
            <button
              type="button"
              onClick={() => onDecision(profile.id, "accept")}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              Accept · Send interview invite
            </button>
            <button
              type="button"
              onClick={() => onDecision(profile.id, "reject")}
              className="rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
            >
              Reject · Notify candidate
            </button>
          </>
        )}
      </div>
      {profile.decisionReason && <p className="mt-3 text-xs text-white/50">Note: {profile.decisionReason}</p>}
    </div>
  );
}

export function ApplicationStatusCard({
  email,
  applications,
  badgeTone,
}: {
  email: string;
  applications: Array<{ id: number; jobTitle: string; status: string; matchScore: number; submittedAt: string }>;
  badgeTone: (s: string) => string;
}) {
  return (
    <div className="max-w-[90%] rounded-3xl border border-sky-500/25 bg-gradient-to-br from-sky-950/30 via-black/50 to-violet-950/20 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-sky-300/70">Your applications</div>
      <div className="mt-1 text-sm text-white/55">{email}</div>
      <div className="mt-4 flex flex-col gap-2">
        {applications.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
            <div>
              <div className="font-medium">{a.jobTitle}</div>
              <div className="text-xs text-white/45">Submitted {a.submittedAt.slice(0, 10)}</div>
            </div>
            <div className="flex items-center gap-2">
              <ScoreRing score={a.matchScore} size={40} />
              {statusPill(a.status, badgeTone)}
            </div>
          </div>
        ))}
        {!applications.length && <p className="text-sm text-white/50">No applications found for this email.</p>}
      </div>
    </div>
  );
}

export function RecruitmentDatasetCard({
  summary,
  recent,
  csvUrl,
}: {
  summary: Record<string, unknown>;
  jobs: Array<{ id: string; title: string; department: string; status: string; applications: number }>;
  recent: Array<{ id: number; candidateName: string; jobTitle: string; matchScore: number; status: string }>;
  csvUrl: string;
}) {
  const s = summary as {
    totalApplications: number;
    shortlisted: number;
    bossApproved: number;
    accepted: number;
    rejected: number;
    openJobs: number;
  };

  return (
    <div className="max-w-[95%] rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/25 via-black/55 to-teal-950/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-amber-300/70">Recruitment dataset</div>
          <div className="mt-1 text-lg font-semibold">Hiring analytics</div>
        </div>
        <a
          href={csvUrl}
          className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-400/20"
        >
          Export CSV
        </a>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Applications", s.totalApplications],
          ["Shortlisted", s.shortlisted],
          ["Boss approved", s.bossApproved],
          ["Accepted", s.accepted],
          ["Rejected", s.rejected],
          ["Open jobs", s.openJobs],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
            <div className="text-xs text-white/45">{label}</div>
            <div className="text-lg font-semibold">{val}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-black/30">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-black/90 text-white/45">
            <tr>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-white/5 text-white/80">
                <td className="px-3 py-2">{r.candidateName}</td>
                <td className="px-3 py-2">{r.jobTitle}</td>
                <td className="px-3 py-2">{r.matchScore}%</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecruitmentBossPendingCard({
  candidates,
}: {
  candidates: Array<{ id: number; candidateName: string; jobTitle: string; matchScore: number }>;
}) {
  return (
    <div className="max-w-[90%] rounded-3xl border border-orange-400/25 bg-gradient-to-br from-orange-950/30 via-black/50 to-violet-950/20 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-orange-300/70">Boss review queue</div>
      <div className="mt-1 text-lg font-semibold">{candidates.length} shortlisted candidate(s)</div>
      <div className="mt-4 flex flex-col gap-2">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
            <ScoreRing score={c.matchScore} size={40} />
            <div>
              <div className="font-medium">{c.candidateName}</div>
              <div className="text-xs text-white/50">{c.jobTitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type JobDraftPreview = {
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

export function JobDraftPreviewCard({
  notes,
  draft,
}: {
  notes: string;
  draft: JobDraftPreview;
}) {
  return (
    <div className="max-w-[92%] rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-950/35 via-black/55 to-teal-950/25 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-violet-300/70">Job draft</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">{draft.title}</h3>
          <p className="mt-1 text-sm text-white/55">
            {draft.department} · {draft.location} · {draft.employmentType}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-white/80">{draft.summary}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-teal-300/70">Requirements</div>
          <ul className="mt-1.5 space-y-1">
            {draft.requirements.slice(0, 5).map((r) => (
              <li key={r} className="text-xs text-white/75">
                • {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70">Responsibilities</div>
          <ul className="mt-1.5 space-y-1">
            {draft.responsibilities.slice(0, 4).map((r) => (
              <li key={r} className="text-xs text-white/75">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {draft.fullDescription ? (
        <p className="mt-3 text-xs leading-relaxed text-white/60">{draft.fullDescription}</p>
      ) : null}
    </div>
  );
}
