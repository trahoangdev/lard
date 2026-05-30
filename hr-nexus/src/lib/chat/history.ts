import { prisma } from "@/lib/prisma";

export async function appendChatMessages(
  sessionId: string,
  entries: Array<{ role: "user" | "bot"; payload: unknown }>,
) {
  if (entries.length === 0) return;

  await prisma.chatMessage.createMany({
    data: entries.map((e) => ({
      sessionId,
      role: e.role,
      payloadJson: JSON.stringify(e.payload),
    })),
  });
}

export async function loadChatHistory(sessionId: string, limit = 200) {
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: String(r.id),
    role: r.role as "user" | "bot",
    payload: r.role === "user" ? { text: JSON.parse(r.payloadJson).text } : JSON.parse(r.payloadJson),
  }));
}

export async function clearChatHistory(sessionId: string) {
  await prisma.chatMessage.deleteMany({ where: { sessionId } });
}

export function defaultWelcome(role: string) {
  if (role === "HR_ADMIN") {
    return "HR workspace — run payroll, draft job postings with AI, and manage recruitment.";
  }
  if (role === "MANAGER") {
    return "Boss workspace — approve pending payroll runs and review team leave statistics.";
  }
  return "Employee workspace — request leave, check your balance, or track request status.";
}
