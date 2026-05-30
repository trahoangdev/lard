import { isEmailEnabled, getEmailConfig } from "@/lib/email/config";

export async function GET() {
  const config = getEmailConfig();
  return Response.json({
    enabled: isEmailEnabled(),
    provider: config.provider,
    from: config.from,
    testEmail: config.testEmail || null,
    routeDemoToTest: config.routeDemoToTest,
    demoDomain: config.demoDomain,
  });
}
