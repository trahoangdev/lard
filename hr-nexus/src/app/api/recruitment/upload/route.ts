import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cvStorageKey, extractCvText, isPdfBinaryGarbage, parseCvFields } from "@/lib/recruitment/cv-parse";
import { scoreCvAgainstJob } from "@/lib/recruitment/score";
import { writeArtifact } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED = [".pdf", ".txt", ".doc", ".docx"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const jobId = String(formData.get("jobId") ?? "").trim();
    const actorId = String(formData.get("actorEmployeeId") ?? "applicant");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing CV file." }, { status: 400 });
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ error: "Upload PDF, TXT, DOC, or DOCX." }, { status: 400 });
    }

    if (!jobId) {
      return NextResponse.json({ error: "Select a job before uploading." }, { status: 400 });
    }

    const job = await prisma.jobPosting.findFirst({ where: { id: jobId, status: "OPEN" } });
    if (!job) {
      return NextResponse.json({ error: "Job not found or closed." }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractCvText(buffer, file.name);
    const parsed = parseCvFields(rawText, file.name);

    if (!parsed.text.trim() || isPdfBinaryGarbage(parsed.text)) {
      return NextResponse.json(
        {
          error:
            "Could not read text from this CV. Export from Canva as “PDF Print” or save as .txt and upload again.",
        },
        { status: 400 },
      );
    }

    const placeholder = await prisma.cvApplication.create({
      data: {
        jobId: job.id,
        candidateName: parsed.candidateName,
        candidateEmail: parsed.candidateEmail,
        phone: parsed.phone,
        originalFilename: file.name,
        storagePath: "__PENDING__",
        parsedText: parsed.text,
        status: "SUBMITTED",
      },
    });

    const key = cvStorageKey(placeholder.id, file.name);
    const storagePath = await writeArtifact(key, buffer, file.type || "application/octet-stream");

    const scored = await scoreCvAgainstJob({
      cvText: parsed.text,
      jobTitle: job.title,
      requirements: job.requirements,
      candidateName: parsed.candidateName,
    });

    const application = await prisma.cvApplication.update({
      where: { id: placeholder.id },
      data: {
        storagePath,
        matchScore: scored.matchScore,
        matchDetailsJson: JSON.stringify(scored.criteria),
        status: "UNDER_REVIEW",
      },
      include: { job: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "RECRUIT_CV_SUBMITTED",
        payloadJson: JSON.stringify({
          applicationId: application.id,
          jobId: job.id,
          actorId,
          matchScore: scored.matchScore,
        }),
      },
    });

    return NextResponse.json({
      applicationId: application.id,
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      jobTitle: application.job.title,
      matchScore: Math.round(application.matchScore),
      summary: scored.summary,
      criteria: scored.criteria,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
