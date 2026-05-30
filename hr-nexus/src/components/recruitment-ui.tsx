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
  const color = score >= 80 ? "#004EBA" : score >= 60 ? "#ffa600" : "#BB32D5";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E7EDF6" strokeWidth={4} />
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
    <div className="group rounded-lg border border-platinum-tint bg-cloud-mist p-3 transition hover:border-action-blue/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-midnight-indigo">{criterion.label}</span>
        <span className={`text-xs font-semibold ${criterion.matched ? "text-glacier-blue" : "text-ocean-glimmer"}`}>
          {criterion.matched ? "Match" : "Gap"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pale-gray">
        <div
          className={`h-full rounded-full transition-all duration-500 ${criterion.matched ? "bg-action-blue" : "bg-sunset-gold"}`}
          style={{ width: `${criterion.score}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-blue">{criterion.note}</p>
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
    <div className="card-floating max-w-[90%] overflow-hidden p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pale-gray text-lg text-action-blue">◆</div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Open roles</div>
          <div className="text-base font-semibold tracking-tight text-midnight-indigo">Tap a role to apply</div>
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
                "group flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition",
                selected
                  ? "border-action-blue/50 bg-pale-gray ring-2 ring-action-blue/20"
                  : "border-platinum-tint bg-cloud-mist hover:border-action-blue/30 hover:bg-pale-gray",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="font-medium text-midnight-indigo group-hover:text-action-blue">{j.title}</div>
                <div className="text-xs text-slate-blue">{j.department}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="badge-info !rounded-full group-hover:bg-pale-gray">
                  Apply →
                </span>
                <span className="text-[10px] text-steel-gray">{j.applications} applicants</span>
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
    <div className="card-floating max-w-[92%] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Role overview</div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-midnight-indigo">{job.title}</h3>
          <p className="mt-1 text-sm text-slate-blue">{job.department}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="badge-info !rounded-full">{job.location}</span>
          <span className="badge-info !rounded-full">{job.employmentType}</span>
          <span className="badge-info !rounded-full">{job.applications} applicants</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-black">{job.summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-platinum-tint bg-cloud-mist p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-glacier-blue">Highlights</div>
          <ul className="mt-2 space-y-1.5">
            {job.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-sm text-slate-blue">
                <span className="text-action-blue">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-platinum-tint bg-cloud-mist p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-sunset-gold">Requirements</div>
          <ul className="mt-2 space-y-1.5">
            {reqBullets.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-slate-blue">
                <span className="text-sunset-gold">•</span>
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
            className="btn-primary disabled:opacity-50"
          >
            Apply for this role
          </button>
        ) : null}
        {onUploadCv ? (
          <button
            type="button"
            disabled={busy}
            onClick={onUploadCv}
            className="btn-ghost rounded-lg border border-platinum-tint bg-cloud-mist disabled:opacity-50"
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
    <div className="card-floating max-w-[90%] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Applying for</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-midnight-indigo">{job.title}</div>
      <div className="mt-1 text-sm text-slate-blue">{job.department}</div>
      <div className="mt-4 rounded-lg border border-platinum-tint bg-cloud-mist p-4">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">Requirements</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-blue">{job.requirements}</p>
      </div>
      {onUploadCv ? (
        <button
          type="button"
          disabled={busy}
          onClick={onUploadCv}
          className="btn-primary mt-4 w-full disabled:opacity-50"
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
    <div className="card-floating max-w-[90%] p-5">
      <div className="flex items-start gap-4">
        <ScoreRing score={matchScore} size={64} />
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-glacier-blue">Application received</div>
          <div className="mt-1 text-lg font-semibold text-midnight-indigo">{candidateName}</div>
          <div className="text-sm text-slate-blue">{jobTitle}</div>
        </div>
      </div>
      {criteria.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {criteria.slice(0, 4).map((c) => (
            <MatchBar key={c.label} criterion={c} />
          ))}
        </div>
      )}
      <a href={cvUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-action-blue hover:text-midnight-indigo">
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
    <div className="card-floating max-w-[95%] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Talent pipeline</div>
          <div className="mt-1 text-lg font-semibold text-midnight-indigo">
            {jobTitle ? jobTitle : "All positions"} · {totalApplications} CV{totalApplications !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {openJobs.map((j) => (
            <span key={j.id} className="badge-info !rounded-full">
              {j.title}: {j.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {candidates.map((c, idx) => (
          <div
            key={c.id}
            className="group flex items-center gap-3 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3 transition hover:border-action-blue/30 hover:bg-pale-gray"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pale-gray text-xs font-bold text-slate-blue">
              #{idx + 1}
            </div>
            {isHr && (
              <input
                type="checkbox"
                checked={c.hrShortlisted}
                onChange={(e) => onShortlist(c.id, e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-platinum-tint accent-action-blue"
                title="Shortlist for Boss"
              />
            )}
            <ScoreRing score={c.matchScore} size={44} />
            <button type="button" onClick={() => onProfile(c.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium text-midnight-indigo group-hover:text-action-blue">{c.candidateName}</div>
              <div className="truncate text-xs text-slate-blue">
                {c.jobTitle} · {c.candidateEmail}
              </div>
            </button>
            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              {statusPill(c.status, badgeTone)}
              {c.bossApproved && <span className="text-[10px] text-glacier-blue">Boss ✓</span>}
            </div>
          </div>
        ))}
        {!candidates.length && (
          <div className="rounded-lg border border-dashed border-platinum-tint px-4 py-8 text-center text-sm text-steel-gray">
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
    <div className="card-floating max-w-[95%] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreRing score={profile.matchScore} size={72} />
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Candidate profile</div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-midnight-indigo">{profile.candidateName}</h3>
            <p className="text-sm text-slate-blue">
              {profile.jobTitle} · {profile.department}
            </p>
            <p className="mt-1 text-xs text-steel-gray">
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
        <div className="mt-4 rounded-lg border border-platinum-tint bg-cloud-mist p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-steel-gray">CV excerpt</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-blue">{profile.parsedExcerpt}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={profile.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost rounded-lg border border-platinum-tint bg-cloud-mist !no-underline hover:bg-pale-gray"
        >
          Open CV
        </a>
        {canDecide && (
          <>
            <button
              type="button"
              onClick={() => onDecision(profile.id, "accept")}
              className="btn-primary"
            >
              Accept · Send interview invite
            </button>
            <button
              type="button"
              onClick={() => onDecision(profile.id, "reject")}
              className="rounded-lg border border-ocean-glimmer/30 bg-pale-gray px-4 py-2 text-sm font-medium text-ocean-glimmer transition hover:bg-pale-gray/80"
            >
              Reject · Notify candidate
            </button>
          </>
        )}
      </div>
      {profile.decisionReason && <p className="mt-3 text-xs text-steel-gray">Note: {profile.decisionReason}</p>}
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
    <div className="card-floating max-w-[90%] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Your applications</div>
      <div className="mt-1 text-sm text-slate-blue">{email}</div>
      <div className="mt-4 flex flex-col gap-2">
        {applications.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <div>
              <div className="font-medium text-midnight-indigo">{a.jobTitle}</div>
              <div className="text-xs text-steel-gray">Submitted {a.submittedAt.slice(0, 10)}</div>
            </div>
            <div className="flex items-center gap-2">
              <ScoreRing score={a.matchScore} size={40} />
              {statusPill(a.status, badgeTone)}
            </div>
          </div>
        ))}
        {!applications.length && <p className="text-sm text-slate-blue">No applications found for this email.</p>}
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
    <div className="card-floating max-w-[95%] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Recruitment dataset</div>
          <div className="mt-1 text-lg font-semibold text-midnight-indigo">Hiring analytics</div>
        </div>
        <a href={csvUrl} className="btn-primary !no-underline">
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
          <div key={String(label)} className="rounded-lg border border-platinum-tint bg-cloud-mist px-3 py-2">
            <div className="text-xs text-steel-gray">{label}</div>
            <div className="text-lg font-semibold text-midnight-indigo">{val}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-platinum-tint bg-cloud-mist">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-pale-gray text-steel-gray">
            <tr>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-platinum-tint text-midnight-indigo">
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
    <div className="card-floating max-w-[90%] p-5">
      <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Boss review queue</div>
      <div className="mt-1 text-lg font-semibold text-midnight-indigo">{candidates.length} shortlisted candidate(s)</div>
      <div className="mt-4 flex flex-col gap-2">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-platinum-tint bg-cloud-mist px-4 py-3">
            <ScoreRing score={c.matchScore} size={40} />
            <div>
              <div className="font-medium text-midnight-indigo">{c.candidateName}</div>
              <div className="text-xs text-slate-blue">{c.jobTitle}</div>
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
    <div className="card-floating max-w-[92%] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-steel-gray">Job draft</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-midnight-indigo">{draft.title}</h3>
          <p className="mt-1 text-sm text-slate-blue">
            {draft.department} · {draft.location} · {draft.employmentType}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-text-black">{draft.summary}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-platinum-tint bg-cloud-mist p-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-glacier-blue">Requirements</div>
          <ul className="mt-1.5 space-y-1">
            {draft.requirements.slice(0, 5).map((r) => (
              <li key={r} className="text-xs text-slate-blue">
                • {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-platinum-tint bg-cloud-mist p-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-skybound-blue">Responsibilities</div>
          <ul className="mt-1.5 space-y-1">
            {draft.responsibilities.slice(0, 4).map((r) => (
              <li key={r} className="text-xs text-slate-blue">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {draft.fullDescription ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-blue">{draft.fullDescription}</p>
      ) : null}
    </div>
  );
}
