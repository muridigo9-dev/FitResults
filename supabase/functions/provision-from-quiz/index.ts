import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

/**
 * provision-from-quiz — the receiving end of `fulfillment/v1`.
 *
 * A buyer completed a quiz on quiz.moovebody.com and paid. That funnel is a
 * separate product on a separate Supabase project; it never writes here, not
 * even with a service role key. It POSTs a signed order to this function, and
 * this function is the only authority over `auth.users`.
 *
 * Contract and rationale: docs/integration/quiz-app-junction.md in the quiz repo.
 *
 * The order of operations below is load-bearing:
 *   idempotency first, account second, email last.
 * Claiming the idempotency key before creating anything is what makes a
 * redelivery a no-op instead of a second account; sending the email last is what
 * keeps a failed send from being retried as a whole new provisioning run.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-moove-signature",
};

const SIGNATURE_HEADER = "x-moove-signature";
const TOLERANCE_SECONDS = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const LOCALE_TAGS: Record<string, string> = { es: "es-ES", pt: "pt-BR", en: "en-US" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = Deno.env.get("FULFILLMENT_SIGNING_SECRET");
  const appUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://app.moovebody.com";

  if (!signingSecret) {
    console.error("[CONFIG] FULFILLMENT_SIGNING_SECRET ausente");
    // 500 so the sender's outbox retries once the secret is configured, rather
    // than treating a misconfiguration as a rejected payload.
    return json({ ok: false, error: "Receiver not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---------------------------------------------------------------- 1. signature
  // Raw text before parsing: the signature covers the exact bytes sent, and an
  // unverified body must not reach a JSON parser, let alone the database.
  const rawBody = await req.text();
  const verification = await verifySignature(rawBody, req.headers.get(SIGNATURE_HEADER), signingSecret);
  if (!verification.valid) {
    console.warn(`[REJECT] assinatura inválida: ${verification.reason}`);
    return json({ ok: false, error: "Invalid signature" }, 401);
  }

  // ---------------------------------------------------------------- 2. validate
  let order: FulfillmentOrder;
  try {
    order = parseOrder(JSON.parse(rawBody));
  } catch (error) {
    // 400 is deliberately terminal on the sender's side: retrying a payload
    // already called malformed produces the same answer eight times.
    console.warn(`[REJECT] payload inválido: ${(error as Error).message}`);
    return json({ ok: false, error: `Invalid payload: ${(error as Error).message}` }, 400);
  }

  try {
    if (order.action === "revoke") return await handleRevoke(supabase, order);

    // ---------------------------------------------------------------- 3. idempotency
    // The unique index on idempotency_key is the actual guard. Claiming it
    // *before* creating the user is what makes two concurrent redeliveries
    // produce one account instead of racing each other into two.
    const { data: claimed, error: claimError } = await supabase
      .from("quiz_provisions")
      .insert({
        idempotency_key: order.idempotencyKey,
        source_platform: order.source.platform,
        source_tenant_slug: order.source.tenantSlug,
        source_quiz_slug: order.source.quizSlug,
        email: order.customer.email.toLowerCase().trim(),
        plan_key: order.subscription.planId,
        locale: order.source.locale,
        payload: order,
      })
      .select("id")
      .maybeSingle();

    if (claimError) {
      // 23505 = unique violation: someone already provisioned this purchase.
      if (claimError.code === "23505") {
        const { data: existing } = await supabase
          .from("quiz_provisions")
          .select("user_id, academy_id, email_sent")
          .eq("idempotency_key", order.idempotencyKey)
          .maybeSingle();
        console.log(`[IDEMPOTENT] ${order.idempotencyKey} já provisionado`);
        return json({
          ok: true,
          userId: existing?.user_id ?? null,
          academyId: existing?.academy_id ?? null,
          created: false,
          emailSent: existing?.email_sent ?? false,
        });
      }
      throw claimError;
    }

    const provisionId = claimed!.id;
    const email = order.customer.email.toLowerCase().trim();

    // ---------------------------------------------------------------- 4. academy
    const academyId = await resolveAcademy(supabase, order);

    // ---------------------------------------------------------------- 5. user
    const { userId, isNew, tempPassword } = await resolveUser(supabase, order, email);

    // ---------------------------------------------------------------- 6-9. profile
    await applyProfile(supabase, { order, userId, academyId, email });

    // ---------------------------------------------------------------- 10. email
    // Last, and its failure is not the delivery's failure: the account exists,
    // and re-running the whole order to retry a send would touch the account
    // again for no reason. Resending is a separate admin action.
    const emailResult = await sendCredentials(supabase, {
      order,
      email,
      tempPassword,
      isNew,
      appUrl,
    });

    await supabase
      .from("quiz_provisions")
      .update({
        user_id: userId,
        academy_id: academyId,
        email_sent: emailResult.sent,
        email_error: emailResult.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provisionId);

    console.log(`[OK] ${email} provisionado (novo=${isNew}, email=${emailResult.sent})`);
    return json({
      ok: true,
      userId,
      academyId,
      created: isNew,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] ${message}`);
    // 500 → the sender retries. Anything that got this far was a valid, signed
    // order, so the fault is ours and worth trying again.
    return json({ ok: false, error: message }, 500);
  }
});

// ==========================================================================
// Signature
// ==========================================================================

/**
 * Stripe's header shape (`t=<unix>,v1=<hex>`), verified with WebCrypto because
 * Deno has no synchronous HMAC.
 */
async function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string
): Promise<{ valid: true } | { valid: false; reason: string }> {
  if (!header) return { valid: false, reason: "missing_header" };

  let timestamp: number | null = null;
  let signature: string | null = null;
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = Math.floor(parsed);
    } else if (key === "v1") {
      signature = value;
    }
  }
  if (timestamp === null || !signature) return { valid: false, reason: "malformed_header" };

  // Checked before the HMAC: a valid signature does not make an expired
  // timestamp acceptable, and this is what bounds replay.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    return { valid: false, reason: "timestamp_out_of_tolerance" };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(expected, signature) ? { valid: true } : { valid: false, reason: "signature_mismatch" };
}

/**
 * A plain `===` on hex digests leaks, through timing, how many leading
 * characters an attacker got right — which turns forgery into a per-character
 * search instead of a 2^256 one.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ==========================================================================
// Payload
// ==========================================================================

interface FulfillmentOrder {
  version: string;
  idempotencyKey: string;
  action: "provision" | "revoke" | "reactivate";
  occurredAt: string;
  source: {
    platform: string;
    tenantSlug: string;
    quizSlug: string;
    locale: string;
    visitorId: string | null;
    sessionId: string | null;
  };
  customer: { email: string; name: string | null; phone: string | null };
  subscription: {
    planId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    amountTotal: number | null;
    currency: string | null;
    status: string;
  };
  profile: {
    gender: string | null;
    ageYears: number | null;
    heightCm: number | null;
    weightKg: number | null;
    targetWeightKg: number | null;
    activityLevel: string | null;
    goal: string | null;
    estimated?: string[];
  };
}

/**
 * Hand-rolled rather than a schema library: this runs on Deno with no bundler,
 * and the shape is small and frozen by the contract. Only the fields the
 * function actually depends on are enforced — an over-strict receiver would
 * reject a sender that added an optional field, which is exactly what the
 * versioned URL path exists to avoid.
 */
function parseOrder(input: unknown): FulfillmentOrder {
  const order = input as FulfillmentOrder;
  if (!order || typeof order !== "object") throw new Error("body is not an object");
  if (order.version !== "1") throw new Error(`unsupported version: ${order.version}`);
  if (!order.idempotencyKey) throw new Error("idempotencyKey is required");
  if (!["provision", "revoke", "reactivate"].includes(order.action)) {
    throw new Error(`unknown action: ${order.action}`);
  }
  const email = order.customer?.email;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    // Without an email there is no account to create and no one to tell. Better
    // a visible rejected delivery than an account under an invented address.
    throw new Error("customer.email is required and must be an email address");
  }
  if (!order.source?.quizSlug) throw new Error("source.quizSlug is required");
  order.profile = order.profile ?? ({} as FulfillmentOrder["profile"]);
  return order;
}

// ==========================================================================
// Provisioning steps
// ==========================================================================

async function resolveAcademy(supabase: any, order: FulfillmentOrder): Promise<string | null> {
  const slug = (order.source.tenantSlug || "quiz").toLowerCase();

  const { data: existing } = await supabase
    .from("academies")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("academies")
    .insert({ slug, name: order.source.quizSlug, status: "active" })
    .select("id")
    .maybeSingle();

  if (error) {
    // An academy is an organisational nicety; the buyer's access does not depend
    // on it. Failing the whole provision over it would trade a real account for
    // a tidy hierarchy.
    console.warn(`[ACADEMY] não foi possível criar "${slug}": ${error.message}`);
    return null;
  }
  return created?.id ?? null;
}

/**
 * Finds an auth user by email, across every page.
 *
 * `auth.admin.listUsers()` returns only the first page — 50 users — so the
 * `.find()` this replaces stopped seeing anyone who signed up after the 50th
 * account. A renewing buyer past that point looked new, and `createUser` below
 * would then throw on the duplicate email, failing the whole fulfillment.
 */
async function findUserByEmail(supabase: any, email: string) {
  const target = email.toLowerCase().trim();
  const perPage = 1000; // GoTrue's maximum

  for (let page = 1;; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u: any) => u.email?.toLowerCase() === target);
    if (match) return match;

    // A short page is the last page.
    if (users.length < perPage) return null;
  }
}

async function resolveUser(
  supabase: any,
  order: FulfillmentOrder,
  email: string
): Promise<{ userId: string; isNew: boolean; tempPassword: string | null }> {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    // Never reset the password of an account that already exists. A buyer who
    // renews would otherwise be locked out of the password they had chosen, and
    // an email containing a password they did not ask for is indistinguishable
    // from a compromise.
    return { userId: existing.id, isNew: false, tempPassword: null };
  }

  const tempPassword = generatePassword();
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    // Confirmed on creation: the buyer proved control of this address by paying
    // with it, and a confirmation step between payment and access is a step some
    // buyers will not complete.
    email_confirm: true,
    user_metadata: {
      full_name: order.customer.name ?? "",
      must_change_password: true,
      provisioned_from: "quiz",
      quiz_slug: order.source.quizSlug,
      locale: order.source.locale,
    },
  });
  if (error) throw error;

  return { userId: created.user.id, isNew: true, tempPassword };
}

async function applyProfile(
  supabase: any,
  args: { order: FulfillmentOrder; userId: string; academyId: string | null; email: string }
): Promise<void> {
  const { order, userId, academyId, email } = args;

  const planId = await resolvePlanId(supabase, order.subscription.planId);

  const profileUpdate: Record<string, unknown> = {
    id: userId,
    email,
    subscription_status: "active",
    account_status: "active",
    stripe_customer_id: order.subscription.stripeCustomerId,
    stripe_subscription_id: order.subscription.stripeSubscriptionId,
    updated_at: new Date().toISOString(),
  };
  if (order.customer.name) profileUpdate.full_name = order.customer.name;
  if (planId) profileUpdate.current_plan_id = planId;
  if (academyId) profileUpdate.primary_academy_id = academyId;

  // The body profile arrives already answered, so onboarding has nothing left to
  // ask. Making a buyer re-enter what they typed two minutes ago in the funnel
  // is the fastest way to lose someone who has just paid.
  const body = order.profile;
  const hasUsableProfile = Boolean(body.gender && body.heightCm && body.weightKg && body.goal);
  if (hasUsableProfile) {
    profileUpdate.onboarding_completed = true;
    profileUpdate.onboarding_completed_at = new Date().toISOString();
  }

  const { error: profileError } = await supabase.from("profiles").upsert(profileUpdate, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "user" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleError) console.warn(`[ROLE] ${roleError.message}`);

  const bodyProfile: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (body.gender) bodyProfile.gender = body.gender;
  if (body.ageYears) bodyProfile.age = body.ageYears;
  // Units match: the quiz collects cm/kg and this app stores cm/kg. Verified
  // against BodyProfileForm.tsx before this mapping was written — a silent
  // lb/kg mismatch would be wrong by 2.2x and invisible until a user complained.
  if (body.heightCm) bodyProfile.height = body.heightCm;
  if (body.weightKg) bodyProfile.current_weight = body.weightKg;
  if (body.targetWeightKg) bodyProfile.goal_weight = body.targetWeightKg;
  if (body.activityLevel) bodyProfile.activity_level = body.activityLevel;
  if (body.goal) bodyProfile.fitness_goal = body.goal;

  if (Object.keys(bodyProfile).length > 2) {
    const { error: bodyError } = await supabase
      .from("user_body_profiles")
      .upsert(bodyProfile, { onConflict: "user_id" });
    if (bodyError) console.warn(`[BODY PROFILE] ${bodyError.message}`);
  }

  if (academyId) {
    const { error: memberError } = await supabase
      .from("academy_members")
      .upsert(
        { academy_id: academyId, user_id: userId, role: "student", status: "active" },
        { onConflict: "academy_id,user_id", ignoreDuplicates: true }
      );
    if (memberError) console.warn(`[ACADEMY MEMBER] ${memberError.message}`);
  }

  if (planId) {
    const { error: subError } = await supabase
      .from("user_subscriptions")
      .upsert({ user_id: userId, plan_id: planId, status: "active" }, { onConflict: "user_id,plan_id", ignoreDuplicates: true });
    if (subError) console.warn(`[SUBSCRIPTION] ${subError.message}`);
  }
}

/** Funnel plan key -> plan here. Never a UUID hardcoded across repositories. */
async function resolvePlanId(supabase: any, externalKey: string): Promise<string | null> {
  if (!externalKey) return null;
  const { data } = await supabase
    .from("plan_external_keys")
    .select("plan_id")
    .eq("external_key", externalKey)
    .maybeSingle();
  if (!data) {
    // An account with no plan is fixable by hand; a buyer with no account is a
    // refund. Never fail the provision over an unmapped key.
    console.warn(`[PLAN] chave externa não mapeada: ${externalKey}`);
    return null;
  }
  return data.plan_id;
}

async function sendCredentials(
  supabase: any,
  args: {
    order: FulfillmentOrder;
    email: string;
    tempPassword: string | null;
    isNew: boolean;
    appUrl: string;
  }
): Promise<{ sent: boolean; error: string | null }> {
  const { order, email, tempPassword, isNew, appUrl } = args;

  // An existing account gets no credentials email — there are no new
  // credentials to send, and a password in an unrequested email reads as a
  // breach. Renewals are a separate notification, not this one.
  if (!isNew || !tempPassword) return { sent: false, error: null };

  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        to: email,
        template_type: "quiz_welcome_credentials",
        locale: LOCALE_TAGS[order.source.locale] ?? "es-ES",
        variables: {
          name: order.customer.name ?? "",
          email,
          temp_password: tempPassword,
          login_url: `${appUrl}/auth`,
        },
      },
    });
    if (error) throw error;
    return { sent: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL] falhou para ${email}: ${message}`);
    return { sent: false, error: message };
  }
}

/**
 * Revocation: a full refund or a cancellation upstream.
 *
 * Deactivates rather than deletes. The buyer may come back, their logged data is
 * theirs, and a delete triggered by an HTTP call is not something to build on
 * the same day as the integration.
 */
async function handleRevoke(supabase: any, order: FulfillmentOrder): Promise<Response> {
  const email = order.customer.email.toLowerCase().trim();
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: "cancelled",
      account_status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .ilike("email", email);

  if (error) throw error;

  await supabase.from("quiz_provisions").insert({
    idempotency_key: `${order.idempotencyKey}:revoke`,
    source_platform: order.source.platform,
    source_tenant_slug: order.source.tenantSlug,
    source_quiz_slug: order.source.quizSlug,
    email,
    plan_key: order.subscription.planId,
    locale: order.source.locale,
    payload: order,
  });

  console.log(`[REVOKE] acesso desativado para ${email}`);
  return json({ ok: true, userId: null, academyId: null, created: false, emailSent: false });
}

/**
 * 16 characters from crypto.getRandomValues, guaranteed to satisfy the app's own
 * passwordSchema (>= 8, upper, lower, digit) — a generated password that the
 * change-password screen then rejects would strand the buyer at the front door.
 *
 * Never logged, never returned in the response body: the only copy that leaves
 * this function is the one in the buyer's email.
 */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;

  const pick = (alphabet: string): string => {
    const buffer = new Uint32Array(1);
    // Rejection sampling: `% alphabet.length` on a raw 32-bit value biases
    // toward the first characters of the alphabet.
    const limit = Math.floor(0xffffffff / alphabet.length) * alphabet.length;
    let value: number;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return alphabet[value % alphabet.length];
  };

  const required = [pick(upper), pick(lower), pick(digits)];
  const rest = Array.from({ length: 13 }, () => pick(all));
  const chars = [...required, ...rest];

  // Fisher-Yates, so the guaranteed upper/lower/digit are not always in
  // positions 0, 1 and 2.
  for (let i = chars.length - 1; i > 0; i--) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const j = buffer[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
