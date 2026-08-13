import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * CREATE CHECKOUT SESSION - V5.0 (NATIVE UUID INTEGRITY)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase Admin client initialized.");

    if (!stripeSecretKey) {
      console.log("Fetching Stripe Key from DB...");
      const { data: dbSettings, error: settingsError } = await supabaseAdmin.from("stripe_settings").select("secret_key").maybeSingle();

      if (settingsError) {
        console.error("Error fetching stripe_settings:", settingsError);
        throw new Error("Failed to fetch Stripe settings: " + settingsError.message);
      }

      stripeSecretKey = dbSettings?.secret_key;
      console.log("Stripe Key fetched from DB:", stripeSecretKey ? "FOUND" : "NOT FOUND");
    }

    if (!stripeSecretKey) {
      console.error("Stripe Key Missing!");
      return new Response(JSON.stringify({ error: "Stripe não configurado." }), { status: 400, headers: corsHeaders });
    }

    const { name, email, price_id, customer_id, success_url, cancel_url } = await req.json();
    const clean_price_id = price_id?.trim();
    console.log("Checkout Request for:", { email, price_id: clean_price_id });

    // BUSCA DINÂMICA DO PLANO
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from("plan_prices")
      .select("plan_id")
      .eq("price_id", clean_price_id)
      .eq("is_active", true)
      .maybeSingle();

    if (priceError) {
      console.error("Error fetching plan_price:", priceError);
      // Not throwing here to allow fallback if plan_id is not strictly required by Stripe, 
      // although our metadata logic suggests it is used.
    }

    // Se o plan_id não for um UUID válido, passamos null (vital para o Postgres)
    let valid_plan_id = (priceData?.plan_id && priceData.plan_id.length === 36) ? priceData.plan_id : null;

    // Prices live in Stripe now, so `plan_prices` may hold no row for this
    // price. The subscription still has to name the plan it grants - that
    // metadata is what stripe-webhook reads when provisioning - so fall back
    // to the single paid plan. Left null when the shape is ambiguous rather
    // than guessing between tiers.
    if (!valid_plan_id) {
      const { data: paidPlans } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("is_active", true)
        .eq("is_default", false)
        .order("display_order");

      if (paidPlans?.length === 1) valid_plan_id = paidPlans[0].id;
      else console.warn("Cannot infer plan_id: found", paidPlans?.length ?? 0, "paid plans");
    }

    console.log("Plan ID resolved:", valid_plan_id);

    const sessionParams: any = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: clean_price_id, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: {
        origin: customer_id ? "reactivation" : "signup",
        full_name: name || "",
        email: email?.toLowerCase(),
        plan_id: valid_plan_id, // Pode ser null aqui
      },
      subscription_data: {
        metadata: {
          origin: customer_id ? "reactivation" : "signup",
          plan_id: valid_plan_id,
        },
      },
    };

    if (customer_id) sessionParams.customer = customer_id;
    else sessionParams.customer_email = email?.toLowerCase();

    console.log("Creating Stripe Session...");
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(flattenObject(sessionParams)).toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Stripe API Error:", result);
      throw new Error(result.error?.message || "Erro Stripe");
    }

    console.log("Session Created:", result.id);
    return new Response(JSON.stringify({ id: result.id, url: result.url }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Critical Error in create-checkout-session:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: corsHeaders });
  }
});

function flattenObject(obj: any, prefix = ""): any {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) continue;
    const newKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = String(obj[key]);
    }
  }
  return result;
}
