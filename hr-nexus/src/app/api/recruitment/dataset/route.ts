import { NextResponse } from "next/server";
import { getRecruitmentDataset } from "@/lib/recruitment/stats";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  const data = await getRecruitmentDataset();

  if (format === "csv") {
    const header = "id,candidateName,candidateEmail,jobTitle,matchScore,status,hrShortlisted,bossApproved,submittedAt";
    const rows = data.applications.map(
      (a) =>
        `${a.id},"${a.candidateName}","${a.candidateEmail}","${a.jobTitle}",${a.matchScore},${a.status},${a.hrShortlisted},${a.bossApproved},${a.submittedAt}`,
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv",
        "content-disposition": 'attachment; filename="recruitment-dataset.csv"',
      },
    });
  }

  return NextResponse.json(data);
}
