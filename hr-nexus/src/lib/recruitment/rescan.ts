import { prisma } from "@/lib/prisma";
import { extractCvText, isPdfBinaryGarbage, parseCvFields } from "@/lib/recruitment/cv-parse";
import { scoreCvAgainstJob } from "@/lib/recruitment/score";
import { readArtifact } from "@/lib/storage";

export async function rescanApplicationIfNeeded(applicationId: number) {
  const app = await prisma.cvApplication.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!app) return null;

  const current = app.parsedText ?? "";
  if (current.length > 30 && !isPdfBinaryGarbage(current)) return app;

  try {
    const buffer = await readArtifact(app.storagePath);
    const rawText = await extractCvText(buffer, app.originalFilename);
    const parsed = parseCvFields(rawText, app.originalFilename);
    const scored = await scoreCvAgainstJob({
      cvText: parsed.text,
      jobTitle: app.job.title,
      requirements: app.job.requirements,
      candidateName: parsed.candidateName,
    });

    return prisma.cvApplication.update({
      where: { id: applicationId },
      data: {
        parsedText: parsed.text,
        candidateName: parsed.candidateName,
        candidateEmail: parsed.candidateEmail,
        phone: parsed.phone,
        matchScore: scored.matchScore,
        matchDetailsJson: JSON.stringify(scored.criteria),
      },
      include: { job: true },
    });
  } catch {
    return app;
  }
}
