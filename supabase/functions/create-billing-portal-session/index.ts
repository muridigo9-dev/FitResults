import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BillingPortalRequest {
  return_url: string;
}

/**
 * Create Stripe Billing Portal Session
 * 
 * Allows authenticated users to manage their subscription through Stripe's
 * customer portal (update payment method, cancel, upgrade/downgrade, etc.)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fallback: Load keys from database if not in environment variables
    if (!stripeSecretKey) {
      const { data: dbSettings } = await supabaseAdmin
        .from("stripe_settings")
        .select("secret_key")
        .single();

      if (dbSettings?.secret_key) stripeSecretKey = dbSettings.secret_key;
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe não configurado. Por favor, configure a API Key no painel Admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Nenhuma assinatura encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: BillingPortalRequest = await req.json();
    const { return_url } = body;

    // Create Billing Portal Session
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: return_url || supabaseUrl.replace("/rest/v1", ""),
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Stripe billing portal error:", errorData);
      throw new Error(errorData.error?.message || "Erro ao criar portal de faturamento");
    }

    const session = await response.json();

    console.log("Billing portal session created for user:", user.id);

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error creating billing portal session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
