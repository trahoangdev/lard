import { NextResponse } from "next/server";
import { z } from "zod";
import { clearChatHistory, defaultWelcome, loadChatHistory } from "@/lib/chat/history";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required." }, { status: 400 });
  }

  const messages = await loadChatHistory(sessionId);
  return NextResponse.json({ messages });
}

const postSchema = z.object({
  sessionId: z.string().min(1),
  reset: z.boolean().optional(),
  role: z.string().optional(),
});

export async function POST(request: Request) {
  const body = postSchema.parse(await request.json());

  if (body.reset) {
    await clearChatHistory(body.sessionId);
    const welcome = defaultWelcome(body.role ?? "EMPLOYEE");
    return NextResponse.json({
      messages: [{ id: "welcome", role: "bot", payload: { kind: "text", text: welcome } }],
    });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
