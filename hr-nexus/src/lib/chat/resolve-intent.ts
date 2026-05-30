import { isAiEnabled } from "@/lib/ai/config";
import { parseIntentWithAi } from "@/lib/ai/parse-intent";
import { parseIntent, type ParsedIntent } from "@/lib/chat/parse";

export type IntentSource = "rules" | "ai";

export type ResolvedIntent = {
  intent: ParsedIntent;
  source: IntentSource;
};

export async function resolveIntent(message: string): Promise<ResolvedIntent> {
  const rulesIntent = parseIntent(message);

  if (rulesIntent.kind !== "help") {
    return { intent: rulesIntent, source: "rules" };
  }

  if (!isAiEnabled()) {
    return { intent: rulesIntent, source: "rules" };
  }

  try {
    const aiIntent = await parseIntentWithAi(message);
    if (aiIntent) {
      return { intent: aiIntent, source: "ai" };
    }
  } catch {
    /* fall back to rules help */
  }

  return { intent: rulesIntent, source: "rules" };
}
