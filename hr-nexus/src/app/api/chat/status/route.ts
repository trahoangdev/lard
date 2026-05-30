import { isAiEnabled } from "@/lib/ai/config";

export async function GET() {
  return Response.json({
    aiEnabled: isAiEnabled(),
    model: isAiEnabled() ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini") : null,
  });
}
