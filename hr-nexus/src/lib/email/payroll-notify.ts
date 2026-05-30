import { isEmailEnabled, resolvePayrollRecipient } from "@/lib/email/config";
import { payrollEmailHtml, sendEmail } from "@/lib/email/send";

export type PayrollNotifyItem = {
  id: number;
  employeeName: string;
  email: string;
  amount: number;
  note?: string | null;
};

export type PayrollNotifyResult = {
  itemId: number;
  status: "SENT" | "SENT_SIMULATED" | "FAILED";
  message: string;
  recipient?: string;
};

const CONCURRENCY = 8;

async function notifyOne(item: PayrollNotifyItem, runId: number): Promise<PayrollNotifyResult> {
  const resolved = resolvePayrollRecipient(item.email);

  if (resolved.simulate || !resolved.to) {
    return {
      itemId: item.id,
      status: "SENT_SIMULATED",
      message: resolved.routedFrom
        ? `Demo address — would route to test inbox`
        : `Simulated (${item.email})`,
      recipient: item.email,
    };
  }

  if (!isEmailEnabled()) {
    return {
      itemId: item.id,
      status: "SENT_SIMULATED",
      message: `Would send to ${resolved.to} (add RESEND_API_KEY)`,
      recipient: resolved.to,
    };
  }

  const subject = `Your salary has been processed — ${item.employeeName}`;
  const html = payrollEmailHtml({
    employeeName: item.employeeName,
    amount: Number(item.amount),
    note: item.note,
    runId,
  });

  const result = await sendEmail({
    to: resolved.to,
    subject,
    html,
    text: `Hi ${item.employeeName}, your salary of ${item.amount} has been processed.`,
  });

  if (result.ok) {
    const routed = resolved.routedFrom ? ` (routed from ${resolved.routedFrom})` : "";
    return {
      itemId: item.id,
      status: "SENT",
      message: `Email sent to ${resolved.to}${routed}`,
      recipient: resolved.to,
    };
  }

  return {
    itemId: item.id,
    status: "FAILED",
    message: result.error ?? "Email failed",
    recipient: resolved.to,
  };
}

/** Send payroll emails in parallel batches for speed */
export async function sendPayrollNotifications(
  items: PayrollNotifyItem[],
  runId: number,
): Promise<PayrollNotifyResult[]> {
  const results: PayrollNotifyResult[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((item) => notifyOne(item, runId)));
    results.push(...batchResults);
  }

  return results;
}

export function summarizeEmailResults(results: PayrollNotifyResult[]) {
  return {
    sent: results.filter((r) => r.status === "SENT").length,
    simulated: results.filter((r) => r.status === "SENT_SIMULATED").length,
    failed: results.filter((r) => r.status === "FAILED").length,
  };
}
