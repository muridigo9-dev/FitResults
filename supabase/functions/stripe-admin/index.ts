import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

/**
 * STRIPE ADMIN ACTIONS
 *
 * These used to live inside `stripe-webhook`, behind an `if (payload.action)`
 * branch. That made one endpoint two things at once: a public endpoint
 * authenticated by a Stripe signature, and an administrative endpoint
 * authenticated by a JWT. An endpoint can only have one trust model — the
 * webhook now verifies Stripe signatures and nothing else, and every admin
 * action lives here behind `verify_jwt = true` plus an explicit `admin` role
 * check (the same check `admin-force-password-change` uses).
 *
 * Actions: save_keys | validate_key | get_price
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // === AUTH: valid JWT + admin role ===
    // `verify_jwt = true` in config.toml already rejects an unsigned call, but
    // that only proves *some* user is logged in. Saving Stripe secret keys is
    // not something any authenticated user may do.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized: Missing Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Unauthorized: Invalid Token" }, 401);
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return json({ error: "Unauthorized: Admin access required" }, 403);
    }

    const payload = await req.json();

    // === save_keys ===
    if (payload.action === "save_keys") {
      const { secret_key, webhook_secret, publishable_key, mode } = payload;

      console.log("[CONFIG] Salvando chaves Stripe...", { mode });

      const { data: existing } = await supabaseAdmin
        .from("stripe_settings")
        .select("id")
        .maybeSingle();

      let error;

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from("stripe_settings")
          .update({
            secret_key,
            webhook_secret,
            publishable_key,
            stripe_mode: mode,
            is_connected: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("stripe_settings")
          .insert({
            secret_key,
            webhook_secret,
            publishable_key,
            stripe_mode: mode,
            is_connected: true,
            trial_days: 7,
            trial_enabled: true,
          });
        error = insertError;
      }

      if (error) {
        console.error(`[CONFIG ERROR] ${error.message}`);
        return json({ error: error.message }, 500);
      }

      return json({ success: true });
    }

    // === validate_key ===
    if (payload.action === "validate_key") {
      const { secret_key } = payload;
      if (!secret_key) {
        return json({ valid: false, error: "Chave secreta não fornecida." });
      }

      console.log("[VALIDATE] Testando chave Stripe...");

      try {
        const stripe = new Stripe(secret_key, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });

        await stripe.customers.list({ limit: 1 });
        console.log("[VALIDATE] Chave válida!");
        return json({ valid: true });
      } catch (stripeError: any) {
        console.error(`[VALIDATE ERROR] ${stripeError.message}`);
        return json({ valid: false, error: stripeError.message || "Erro desconhecido ao validar." });
      }
    }

    // === get_price ===
    if (payload.action === "get_price") {
      const { price_id } = payload;
      if (!price_id) {
        return json({ error: "Price ID is required." }, 400);
      }

      console.log(`[GET_PRICE] Fetching details for: ${price_id}`);

      const { data: dbSettings, error: settingsError } = await supabaseAdmin
        .from("stripe_settings")
        .select("secret_key")
        .maybeSingle();

      if (settingsError || !dbSettings?.secret_key) {
        console.error("[GET_PRICE] Error fetching stripe settings:", settingsError);
        return json({ error: "Stripe configuration not found." }, 500);
      }

      try {
        const stripe = new Stripe(dbSettings.secret_key, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });

        const price = await stripe.prices.retrieve(price_id);

        return json({
          success: true,
          data: {
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
          },
        });
      } catch (stripeError: any) {
        console.error(`[GET_PRICE ERROR] ${stripeError.message}`);
        return json({ error: stripeError.message || "Failed to fetch price from Stripe." }, 400);
      }
    }

    return json({ error: `Unknown action: ${payload.action ?? "(none)"}` }, 400);
  } catch (error: any) {
    console.error(`[FATAL STRIPE ADMIN ERROR] ${error.message}`);
    return json({ error: error.message }, 500);
  }
});
