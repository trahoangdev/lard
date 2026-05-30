import { isEmailEnabled, resolveOutboundRecipient } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";

export type RecruitmentEmailInput = {
  to: string;
  candidateName: string;
  jobTitle: string;
  decision: "accept" | "reject";
  reason?: string;
};

function recruitmentHtml(input: RecruitmentEmailInput) {
  const isAccept = input.decision === "accept";
  const accent = isAccept ? "#10b981" : "#f43f5e";
  const headline = isAccept ? "Interview invitation" : "Application update";
  const body = isAccept
    ? `Congratulations! We would like to invite you for an interview for the <strong>${input.jobTitle}</strong> position.`
    : `Thank you for applying for <strong>${input.jobTitle}</strong>. After careful review, we will not be moving forward at this time.`;

  return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;background:#0c0a09;padding:32px">
<div style="max-width:520px;margin:0 auto;background:#fafaf9;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4">
  <div style="background:${accent};padding:20px 24px;color:white">
    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85">HR Nexus Talent</div>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:600">${headline}</h1>
  </div>
  <div style="padding:24px;color:#292524;line-height:1.6">
    <p>Hi ${input.candidateName},</p>
    <p>${body}</p>
    ${input.reason ? `<p style="background:#f5f5f4;padding:12px 16px;border-radius:8px;font-size:14px"><em>${input.reason}</em></p>` : ""}
    <p style="font-size:13px;color:#78716c;margin-top:24px">Reply to this thread or check your application status in the HR Nexus portal.</p>
  </div>
</div>
</body></html>`;
}

export async function sendRecruitmentEmail(input: RecruitmentEmailInput) {
  const resolved = resolveOutboundRecipient(input.to);

  if (resolved.simulate || !resolved.to) {
    return { ok: false, simulated: true, message: "No valid email on file" };
  }

  if (!isEmailEnabled()) {
    return { ok: false, simulated: true, message: `Would send ${input.decision} to ${input.to}` };
  }

  const subject =
    input.decision === "accept"
      ? `Interview invitation — ${input.jobTitle}`
      : `Application update — ${input.jobTitle}`;

  const result = await sendEmail({
    to: input.to,
    subject,
    html: recruitmentHtml(input),
    text: `${input.candidateName}: ${input.decision} for ${input.jobTitle}`,
  });

  if (result.ok) {
    const delivered = result.deliveredTo ?? input.to;
    const routed =
      resolved.routedFrom && delivered.toLowerCase() !== resolved.routedFrom.toLowerCase()
        ? ` (demo inbox — intended for ${resolved.routedFrom})`
        : "";
    return {
      ok: true,
      simulated: false,
      message: `Email sent to ${delivered}${routed}`,
    };
  }

  return {
    ok: false,
    simulated: false,
    message: result.error ?? "Failed",
  };
}
