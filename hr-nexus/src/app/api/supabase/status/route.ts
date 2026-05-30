import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ connected: false, error: "Supabase env vars not set." });
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return Response.json({ connected: false, error: error.message });
    }

    return Response.json({
      connected: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "payroll-artifacts",
      storageEnabled: process.env.SUPABASE_USE_STORAGE !== "false",
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      session: data.session ? "active" : "none",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed.";
    return Response.json({ connected: false, error: message });
  }
}
