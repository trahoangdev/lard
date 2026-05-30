import { chatCompletion } from "@/lib/ai/openai";
import { isAiEnabled } from "@/lib/ai/config";
import { z } from "zod";

export type MatchCriterion = {
  label: string;
  score: number;
  matched: boolean;
  note: string;
};

export type CvScoreResult = {
  matchScore: number;
  criteria: MatchCriterion[];
  summary: string;
};

const scoreSchema = z.object({
  matchScore: z.number().min(0).max(100),
  summary: z.string().min(1).max(500),
  criteria: z.array(
    z.object({
      label: z.string(),
      score: z.number().min(0).max(100),
      matched: z.boolean(),
      note: z.string(),
    }),
  ),
});

function ruleBasedScore(cvText: string, requirements: string): CvScoreResult {
  const reqWords = requirements
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 3);
  const cvLower = cvText.toLowerCase();

  const criteria: MatchCriterion[] = [];
  let total = 0;

  for (const word of reqWords.slice(0, 8)) {
    const matched = cvLower.includes(word);
    const score = matched ? 85 + Math.min(15, word.length) : 20 + Math.floor(Math.random() * 25);
    criteria.push({
      label: word.charAt(0).toUpperCase() + word.slice(1),
      score,
      matched,
      note: matched ? `Found "${word}" in CV` : `No clear mention of ${word}`,
    });
    total += score;
  }

  if (!criteria.length) {
    criteria.push({
      label: "General fit",
      score: 55,
      matched: true,
      note: "CV received — manual review recommended",
    });
    total = 55;
  }

  const matchScore = Math.round(total / criteria.length);
  return {
    matchScore,
    criteria,
    summary: `Rule-based scan: ${criteria.filter((c) => c.matched).length}/${criteria.length} requirement signals matched.`,
  };
}

export async function scoreCvAgainstJob(input: {
  cvText: string;
  jobTitle: string;
  requirements: string;
  candidateName: string;
}): Promise<CvScoreResult> {
  if (!isAiEnabled() || input.cvText.length < 40) {
    return ruleBasedScore(input.cvText, input.requirements);
  }

  try {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content: `You score job applicants. Return JSON only:
{
  "matchScore": 0-100,
  "summary": "one sentence",
  "criteria": [{ "label": "...", "score": 0-100, "matched": true/false, "note": "..." }]
}
Score ${input.candidateName} for "${input.jobTitle}". Use 4-6 criteria from job requirements.`,
        },
        {
          role: "user",
          content: `JOB REQUIREMENTS:\n${input.requirements}\n\nCV:\n${input.cvText.slice(0, 6000)}`,
        },
      ],
      { json: true, temperature: 0.2, maxTokens: 700 },
    );

    const parsed = scoreSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fallback */
  }

  return ruleBasedScore(input.cvText, input.requirements);
}
