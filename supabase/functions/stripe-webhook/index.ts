import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * STRIPE WEBHOOK V9.0 - AUTO-PROVISIONING & FULL LIFECYCLE
 * Handles:
 * 1. Automatic user creation (Invite) for new customers
 * 2. Subscription updates (Upgrades/Downgrades)
 * 3. Cancellations
 * 4. Admin Helpers (validate_key)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();

    // === AUTH CHECK FOR ADMIN ACTIONS ===
    if (payload.action) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), { status: 401, headers: corsHeaders });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid Token" }), { status: 401, headers: corsHeaders });
      }

      // Optional: Check for specific admin role/claim here if your app supports it
      // const isSuperAdmin = user.app_metadata?.role === 'service_role' || user.app_metadata?.claims_admin === true;
    }

    // === ADMIN ACTIONS ===
    if (payload.action === 'save_keys') {
      const { secret_key, webhook_secret, publishable_key, mode } = payload;

      console.log("[CONFIG] Salvando chaves Stripe...", { mode });

      // Verificar se já existe configuração
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
            updated_at: new Date().toISOString()
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
            trial_enabled: true
          });
        error = insertError;
      }

      if (error) {
        console.error(`[CONFIG ERROR] ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    if (payload.action === 'validate_key') {
      const { secret_key } = payload;
      if (!secret_key) {
        return new Response(JSON.stringify({ valid: false, error: "Chave secreta não fornecida." }), { status: 200, headers: corsHeaders });
      }

      console.log("[VALIDATE] Testando chave Stripe...");

      try {
        // Initialize Stripe inside try/catch to handle potential module/init errors
        const stripe = new Stripe(secret_key, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient()
        });

        const list = await stripe.customers.list({ limit: 1 });
        console.log("[VALIDATE] Chave válida!", list);
        return new Response(JSON.stringify({ valid: true }), { status: 200, headers: corsHeaders });
      } catch (stripeError: any) {
        console.error(`[VALIDATE ERROR] ${stripeError.message}`, stripeError);
        return new Response(JSON.stringify({ valid: false, error: stripeError.message || "Erro desconhecido ao validar." }), { status: 200, headers: corsHeaders });
      }
    }

    if (payload.action === 'get_price') {
      const { price_id } = payload;
      if (!price_id) {
        return new Response(JSON.stringify({ error: "Price ID is required." }), { status: 400, headers: corsHeaders });
      }

      console.log(`[GET_PRICE] Fetching details for: ${price_id}`);

      // 1. Get Stripe Key from DB
      const { data: dbSettings, error: settingsError } = await supabaseAdmin.from("stripe_settings").select("secret_key").maybeSingle();

      if (settingsError || !dbSettings?.secret_key) {
        console.error("[GET_PRICE] Error fetching stripe settings:", settingsError);
        return new Response(JSON.stringify({ error: "Stripe configuration not found." }), { status: 500, headers: corsHeaders });
      }

      try {
        const stripe = new Stripe(dbSettings.secret_key, {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient()
        });

        const price = await stripe.prices.retrieve(price_id);

        console.log(`[GET_PRICE] Found:`, price);

        return new Response(JSON.stringify({
          success: true,
          data: {
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring
          }
        }), { status: 200, headers: corsHeaders });

      } catch (stripeError: any) {
        console.error(`[GET_PRICE ERROR] ${stripeError.message}`, stripeError);
        return new Response(JSON.stringify({ error: stripeError.message || "Failed to fetch price from Stripe." }), { status: 400, headers: corsHeaders });
      }
    }

    // === WEBHOOK EVENTS ===
    const eventType = payload.type;
    const session = payload.data?.object;
    const stripeEventId = payload.id;

    if (!eventType || !session) {
      console.warn("[SKIP] Payload inválido ou desconhecido.");
      return new Response(JSON.stringify({ received: true, warning: "Unknown payload" }), { status: 200, headers: corsHeaders });
    }

    console.log(`[STRIPE WEBHOOK] Evento: ${eventType}`);

    // Log event to DB
    const { data: eventLog, error: logError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        stripe_event_id: stripeEventId,
        event_type: eventType,
        payload: payload,
        processed: false
      })
      .select()
      .maybeSingle();

    if (logError) console.error("[LOG ERROR]", logError);

    // 1. Coletar dados básicos do evento
    let email = (
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email ||
      ""
    ).toLowerCase().trim();

    const fullName = session.metadata?.full_name || session.customer_details?.name || "";
    const customerId = session.customer;
    const subscriptionId = session.subscription || session.id;
    const planId = session.metadata?.plan_id;

    if (!email && customerId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (profile) email = profile.email.toLowerCase().trim();
    }

    if (!email) {
      console.warn("[SKIP] Email não localizado.");
      if (eventLog) {
        await supabaseAdmin.from("stripe_events").update({ error_message: "Email not found" }).eq("id", eventLog.id);
      }
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200, headers: corsHeaders });
    }

    // 2. Processar de acordo com o tipo de evento
    if (eventType === "checkout.session.completed" || eventType === "customer.subscription.created" || eventType === "customer.subscription.updated") {

      const status = session.status === "active" || session.status === "trialing" || eventType === "checkout.session.completed" ? "active" : session.status;

      console.log(`[ACTION] Processando ${eventType} para: ${email} (Status: ${status})`);

      // PASSO A: Garantir que o usuário EXISTE no Auth do Supabase
      // Buscamos o usuário pelo email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      let user = users.find(u => u.email?.toLowerCase() === email);

      if (!user && eventType === "checkout.session.completed") {
        console.log(`[PROVISIONING] Criando nova conta para o lead: ${email}`);

        // Criar usuário e enviar convite automático
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${supabaseUrl.replace("/rest/v1", "")}/dashboard`,
        });

        if (inviteError) {
          console.error(`[INVITE ERROR] ${inviteError.message}`);
          if (eventLog) await supabaseAdmin.from("stripe_events").update({ error_message: `Invite Error: ${inviteError.message}` }).eq("id", eventLog.id);
        } else {
          user = newUser.user;
          console.log(`[PROVISIONING SUCCESS] Convite enviado para ${email}`);
        }
      }

      // PASSO B: Atualização do Profile e Subscription (RPC Blindada)
      const { error: rpcError } = await supabaseAdmin.rpc("handle_stripe_subscription_update", {
        p_email: email,
        p_customer_id: customerId,
        p_subscription_id: subscriptionId,
        p_plan_id: planId || null
      });

      if (rpcError) {
        console.error("[RPC ERROR]", rpcError);
        if (eventLog) await supabaseAdmin.from("stripe_events").update({ error_message: `RPC Error: ${rpcError.message}` }).eq("id", eventLog.id);
      }

      // PASSO C: Sincronização forçada de colunas críticas
      const updateData: any = {
        subscription_status: status === "active" ? "active" : status,
        account_status: status === "active" ? "active" : "inactive",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        full_name: fullName || undefined, // Só atualiza se tiver vindo no stripe
        updated_at: new Date().toISOString()
      };

      if (planId) updateData.current_plan_id = planId;

      const { error: finalUpdateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .ilike("email", email);

      if (finalUpdateError) {
        console.error(`[SYNC ERROR] ${finalUpdateError.message}`);
        if (eventLog) await supabaseAdmin.from("stripe_events").update({ error_message: `Sync Error: ${finalUpdateError.message}` }).eq("id", eventLog.id);
      }

      console.log(`[SUCCESS] Fluxo completo para: ${email}`);

      // Mark as processed successfully
      if (eventLog && !finalUpdateError && !rpcError) {
        await supabaseAdmin.from("stripe_events").update({ processed: true }).eq("id", eventLog.id);
      }
    }

    // Tratar cancelamento
    if (eventType === "customer.subscription.deleted") {
      console.log(`[TERMINATION] Cancelando acesso para: ${customerId}`);
      const { error: cancelError } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: 'cancelled',
          account_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq("stripe_customer_id", customerId);

      if (cancelError) {
        if (eventLog) await supabaseAdmin.from("stripe_events").update({ error_message: `Termination Error: ${cancelError.message}` }).eq("id", eventLog.id);
      } else {
        if (eventLog) await supabaseAdmin.from("stripe_events").update({ processed: true }).eq("id", eventLog.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error(`[FATAL WEBHOOK ERROR] ${error.message}`);
    // Tenta logar o erro fatal se possível, mas pode não ter eventLog id aqui se falhou antes
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
