import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readArtifact } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const appId = Number(id);
    if (!Number.isFinite(appId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const app = await prisma.cvApplication.findUnique({ where: { id: appId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!app.storagePath || app.storagePath === "__PENDING__") {
      return NextResponse.json({ error: "CV file not available yet." }, { status: 404 });
    }

    const data = await readArtifact(app.storagePath);
    const ext = app.originalFilename.split(".").pop()?.toLowerCase() ?? "bin";
    const type =
      ext === "pdf"
        ? "application/pdf"
        : ext === "txt"
          ? "text/plain"
          : "application/octet-stream";

    const filename = app.originalFilename.replace(/[^\w.\- ]+/g, "_");
    const encoded = encodeURIComponent(app.originalFilename);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": type,
        "content-disposition": `inline; filename="${filename}"; filename*=UTF-8''${encoded}`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const code = err instanceof Object && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "CV file not found in storage." }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
