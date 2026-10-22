import { createClient } from "npm:@supabase/supabase-js@2.117.3";

// Account creation is available only to the existing review coordinator/publisher.
// Service credentials and passwords are never returned or logged.
const origins = new Set(["https://na7nlupus.com", "https://www.na7nlupus.com", "https://alaabmt.github.io"]);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && origins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.has(origin)) return reply(403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { error: "POST required" });
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Sign in required" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: authError } = await caller.auth.getUser();
  if (authError || !actor.user) return reply(401, { error: "Sign in required" });
  const permission = await caller.rpc("na7n_medical_staff_ok", { p_role: null });
  if (permission.error || permission.data !== true) return reply(403, { error: "Coordinator permission required" });
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return reply(400, { error: "Invalid request" }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply(400, { error: "Invalid request" });
  const value = (key: string) => typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const email = value("email").toLowerCase();
  const nameAr = value("name_ar");
  const nameEn = value("name_en");
  const specialtyAr = value("specialty_ar");
  const specialtyEn = value("specialty_en");
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      nameAr.length < 3 || nameAr.length > 120 ||
      [nameEn, specialtyAr, specialtyEn].some(s => s && (s.length < 3 || s.length > 120))) {
    return reply(400, { error: "Check the email, name and specialty fields" });
  }
  if (actor.user.email?.toLowerCase() === email) return reply(400, { error: "Another administrator must approve your reviewer account" });
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const lookup = await service.rpc("na7n_medical_account_id", { p_email: email });
  if (lookup.error) return reply(500, { error: "Account lookup unavailable" });
  let userId = lookup.data as string | null;
  let created = false;
  if (!userId) {
    if (password.length < 8 || new TextEncoder().encode(password).length > 72)
      return reply(400, { error: "New accounts require a password of 8 to 72 bytes" });
    const result = await service.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: nameEn || nameAr },
    });
    if (result.error || !result.data.user) return reply(400, { error: "Account creation failed; check the email and password requirements" });
    userId = result.data.user.id;
    created = true;
  }
  // Existing users retain their password, sessions, profile and publication consent.
  const nomination = await caller.rpc("na7n_medical_nominate", {
    p_user_id: userId, p_name_ar: nameAr, p_name_en: nameEn || null,
    p_specialty_ar: specialtyAr || null, p_specialty_en: specialtyEn || null,
  });
  if (nomination.error) return reply(409, {
    error: created ? "Account created, but reviewer activation failed. Contact the coordinator; do not recreate the account."
      : "Reviewer activation failed. The reviewer may already exist. Existing accounts are never overwritten.",
    account_created: created,
  });
  return reply(200, { reviewer_active: true, account_created: created, email });
});
