export type EmailProvider = "resend" | "none";

export function getEmailConfig() {
  return {
    provider: (process.env.EMAIL_PROVIDER ?? "none").toLowerCase() as EmailProvider,
    resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    from: process.env.EMAIL_FROM ?? "HR Nexus <onboarding@resend.dev>",
    testEmail: process.env.PAYROLL_TEST_EMAIL?.trim() ?? "",
    demoDomain: process.env.PAYROLL_DEMO_EMAIL_DOMAIN ?? "hrnexus.demo",
    /** Route fake @hrnexus.demo addresses to PAYROLL_TEST_EMAIL (opt-in) */
    routeDemoToTest: process.env.EMAIL_ROUTE_DEMO_TO_TEST === "true",
  };
}

export function isEmailEnabled() {
  const c = getEmailConfig();
  return c.provider === "resend" && Boolean(c.resendApiKey);
}

/** True when using Resend's shared onboarding domain (sandbox — limited recipients). */
export function isResendSandbox() {
  return getEmailConfig().from.toLowerCase().includes("@resend.dev");
}

export type ResolvedRecipient = {
  to: string | null;
  simulate: boolean;
  routedFrom?: string;
};

function invalidRecipient(email: string) {
  return !email || !email.includes("@") || email.endsWith("@applicant.local");
}

/** Resolve any outbound email — uses candidate/employee address when domain is verified. */
export function resolveOutboundRecipient(originalEmail: string): ResolvedRecipient {
  const c = getEmailConfig();
  const email = originalEmail.trim().toLowerCase();

  if (invalidRecipient(email)) {
    return { to: null, simulate: true };
  }

  if (isResendSandbox() && c.testEmail) {
    if (email === c.testEmail.toLowerCase()) {
      return { to: originalEmail, simulate: false };
    }
    return { to: c.testEmail, simulate: false, routedFrom: originalEmail };
  }

  return { to: originalEmail, simulate: false };
}

/** Decide where a payroll notification actually goes */
export function resolvePayrollRecipient(originalEmail: string): ResolvedRecipient {
  const c = getEmailConfig();
  const email = originalEmail.trim().toLowerCase();

  if (invalidRecipient(email)) {
    return { to: null, simulate: true };
  }

  const isDemo = email.endsWith(`@${c.demoDomain}`);

  if (isDemo) {
    if (c.routeDemoToTest && c.testEmail) {
      return { to: c.testEmail, simulate: false, routedFrom: originalEmail };
    }
    return { to: null, simulate: true };
  }

  return resolveOutboundRecipient(originalEmail);
}
