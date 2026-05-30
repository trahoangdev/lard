import { getEmailConfig, isEmailEnabled, resolveOutboundRecipient } from "@/lib/email/config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  deliveredTo?: string;
  intendedTo?: string;
};

function sandboxDeliveryBanner(intended: string, html: string) {
  const banner = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400e;line-height:1.5"><strong>Demo delivery:</strong> This notice is for <strong>${intended}</strong>. With a verified domain on Resend, it will go directly to the candidate.</div>`;
  if (html.includes("<body")) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  }
  return `${banner}${html}`;
}

function isSandboxRestriction(message: string) {
  return /only send testing emails|verify a domain/i.test(message);
}

async function postResend(input: { to: string; subject: string; html: string; text?: string }) {
  const { resendApiKey, from } = getEmailConfig();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const json = (await res.json()) as { id?: string; message?: string };
  return { ok: res.ok, messageId: json.id, error: json.message ?? (res.ok ? undefined : `HTTP ${res.status}`) };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailEnabled()) {
    return { ok: false, error: "Email provider not configured" };
  }

  const resolved = resolveOutboundRecipient(input.to);
  if (resolved.simulate || !resolved.to) {
    return { ok: false, error: "No valid recipient" };
  }

  const routed = Boolean(resolved.routedFrom);
  const html = routed && resolved.routedFrom ? sandboxDeliveryBanner(resolved.routedFrom, input.html) : input.html;
  const subject = routed && resolved.routedFrom ? `[For: ${resolved.routedFrom}] ${input.subject}` : input.subject;
  const text =
    routed && resolved.routedFrom
      ? `Intended for ${resolved.routedFrom}\n\n${input.text ?? ""}`
      : input.text;

  try {
    let result = await postResend({ to: resolved.to, subject, html, text });

    if (!result.ok && result.error && isSandboxRestriction(result.error) && !routed) {
      const { testEmail } = getEmailConfig();
      if (testEmail && testEmail.toLowerCase() !== resolved.to.toLowerCase()) {
        result = await postResend({
          to: testEmail,
          subject: `[For: ${input.to}] ${input.subject}`,
          html: sandboxDeliveryBanner(input.to, input.html),
          text: `Intended for ${input.to}\n\n${input.text ?? ""}`,
        });
        if (result.ok) {
          return {
            ok: true,
            messageId: result.messageId,
            deliveredTo: testEmail,
            intendedTo: input.to,
          };
        }
      }
    }

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      messageId: result.messageId,
      deliveredTo: resolved.to,
      intendedTo: resolved.routedFrom ?? input.to,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export function payrollEmailHtml(input: {
  employeeName: string;
  amount: number;
  note?: string | null;
  runId: number;
}) {
  const amount = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(input.amount);
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f4f4f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 8px">Salary processed</h2>
    <p style="color:#52525b">Hi ${input.employeeName}, your payroll for this period has been approved.</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">
      <div style="font-size:28px;font-weight:700">${amount}</div>
      ${input.note ? `<div style="color:#71717a;margin-top:8px">${input.note}</div>` : ""}
    </div>
    <p style="color:#a1a1aa;font-size:12px">Payroll run #${input.runId} · HR Nexus</p>
  </div>
</body>
</html>`;
}
