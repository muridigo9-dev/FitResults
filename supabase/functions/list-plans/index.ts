import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * LIST PLANS - public billing options, read straight from Stripe.
 *
 * The landing page and the checkout both need to show what a subscription
 * costs. Keeping a copy of that in `plan_prices` is what let the site
 * advertise R$ 29,90 while Stripe charged USD 4.99, so the price now has
 * exactly one home: Stripe.
 *
 * Listing prices needs the secret key, which cannot go in a browser, hence a
 * function. It is deliberately unauthenticated (`verify_jwt = false` in
 * config.toml) because the pricing section renders for logged-out visitors,
 * and it only ever returns fields that are already public on the checkout
 * page - never the key, never anything customer-specific.
 *
 * `planId` is resolved here rather than in the client so the checkout can tag
 * the Stripe subscription with the Supabase plan it maps to, which is what the
 * webhook reads when it provisions access.
 */

/** Currencies Stripe quotes without a minor unit, so no division applies. */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw",
  "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

const toMajorUnits = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Same fallback create-checkout-session uses, so both agree on the key.
    if (!stripeSecretKey) {
      const { data } = await supabaseAdmin
        .from("stripe_settings")
        .select("secret_key")
        .maybeSingle();
      stripeSecretKey = data?.secret_key;
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe não configurado.", plans: [] }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      active: "true",
      limit: "100",
      "expand[]": "data.product",
    });

    const response = await fetch(`https://api.stripe.com/v1/prices?${params}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Stripe API error listing prices:", result);
      throw new Error(result.error?.message || "Erro ao listar preços no Stripe");
    }

    // Which Supabase plan each price belongs to. `plan_prices` is honoured when
    // it has a row, so an existing mapping keeps working; otherwise every price
    // falls back to the single paid plan, which is the shape this product has.
    const [{ data: mappings }, { data: paidPlans }] = await Promise.all([
      supabaseAdmin.from("plan_prices").select("price_id, plan_id"),
      supabaseAdmin
        .from("plans")
        .select("id")
        .eq("is_active", true)
        .eq("is_default", false)
        .order("display_order"),
    ]);

    const byPriceId = new Map(
      (mappings || []).map((m: { price_id: string; plan_id: string }) => [m.price_id, m.plan_id])
    );
    const fallbackPlanId = paidPlans?.length === 1 ? paidPlans[0].id : null;

    type StripePrice = {
      id: string;
      currency: string;
      unit_amount: number | null;
      lookup_key: string | null;
      nickname: string | null;
      recurring: { interval: string; interval_count: number } | null;
      product: { name?: string; active?: boolean } | string | null;
    };

    const plans = ((result.data || []) as StripePrice[])
      // One-off prices have no `recurring` block and are not subscriptions.
      .filter(p => p.recurring && p.unit_amount !== null)
      .filter(p => typeof p.product === "object" && p.product?.active !== false)
      .map(p => ({
        priceId: p.id,
        amount: toMajorUnits(p.unit_amount as number, p.currency),
        currency: p.currency.toUpperCase(),
        interval: p.recurring!.interval,
        intervalCount: p.recurring!.interval_count,
        lookupKey: p.lookup_key,
        label: p.nickname ?? null,
        productName: typeof p.product === "object" ? (p.product?.name ?? null) : null,
        planId: byPriceId.get(p.id) ?? fallbackPlanId,
      }))
      .sort((a, b) => a.amount - b.amount);

    return new Response(JSON.stringify({ plans }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Prices change rarely and this is read on every landing page view.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Critical error in list-plans:", message);
    return new Response(JSON.stringify({ error: message, plans: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
