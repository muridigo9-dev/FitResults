import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

/**
 * STRIPE WEBHOOK V10 — SIGNED, AND BLIND TO FUNNEL SALES
 *
 * Two things changed from V9:
 *
 * 1. The signature is verified. Before, this endpoint accepted any POST, which
 *    meant anyone who knew the URL could hand it a `checkout.session.completed`
 *    and provision themselves a paid account. The admin `action` branches that
 *    used to share this function moved to `stripe-admin` (verify_jwt = true) —
 *    an endpoint authenticated by a Stripe signature cannot also be an endpoint
 *    authenticated by a JWT.
 *
 * 2. It returns early on sales that originated in the quiz funnel. One Stripe
 *    account serves both quiz.moovebody.com and this app, so both webhooks see
 *    every event. Without this the buyer gets provisioned twice by two paths —
 *    a magic-link invite from here and a credentials email from
 *    `provision-from-quiz` — and receives two contradictory emails. Funnel
 *    sales are fulfilled through the signed contract instead; see
 *    docs/integration/quiz-app-junction.md in the quiz repo. The event is still
 *    logged to `stripe_events` first, so the sale stays auditable from this side.
 *
 * Handles: user creation, subscription updates, cancellations.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // === SIGNATURE VERIFICATION ===
    // Read the body as raw text: the signature is over the exact bytes Stripe
    // sent, so `await req.json()` first would make it unverifiable.
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.warn("[REJECT] Requisição sem stripe-signature.");
      return json({ error: "Missing stripe-signature header" }, 400);
    }

    const { data: stripeSettings } = await supabaseAdmin
      .from("stripe_settings")
      .select("secret_key, webhook_secret")
      .maybeSingle();

    const webhookSecret = stripeSettings?.webhook_secret || Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const secretKey = stripeSettings?.secret_key || Deno.env.get("STRIPE_SECRET_KEY");

    if (!webhookSecret || !secretKey) {
      console.error("[CONFIG ERROR] Stripe não configurado: falta secret_key ou webhook_secret.");
      // 500, not 200: Stripe should retry once configuration is fixed rather
      // than treat a lost event as delivered.
      return json({ error: "Stripe configuration not found" }, 500);
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let payload: Stripe.Event;
    try {
      // Async + SubtleCryptoProvider: Deno has no synchronous HMAC, so the
      // sync `constructEvent` throws here.
      payload = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch (verifyError: any) {
      console.warn(`[REJECT] Assinatura inválida: ${verifyError.message}`);
      return json({ error: "Invalid signature" }, 400);
    }

    // === WEBHOOK EVENTS ===
    const eventType = payload.type;
    const session = payload.data?.object as any;
    const stripeEventId = payload.id;

    if (!eventType || !session) {
      console.warn("[SKIP] Payload inválido ou desconhecido.");
      return json({ received: true, warning: "Unknown payload" });
    }

    console.log(`[STRIPE WEBHOOK] Evento: ${eventType}`);

    // Log event to DB
    const { data: eventLog, error: logError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        stripe_event_id: stripeEventId,
        event_type: eventType,
        payload: payload,
        processed: false,
      })
      .select()
      .maybeSingle();

    if (logError) console.error("[LOG ERROR]", logError);

    // === QUIZ-ORIGIN GUARD ===
    // Checked after logging so the sale is auditable here, and before any
    // provisioning so it never happens twice. `metadata.source` is stamped by
    // the funnel on both the Checkout Session and the subscription, so
    // `customer.subscription.*` events carry it too.
    if (session.metadata?.source === "quiz" || session.metadata?.quizSlug) {
      console.log("[SKIP] venda originada no funil — provisionada via provision-from-quiz");
      if (eventLog) {
        await supabaseAdmin
          .from("stripe_events")
          .update({ processed: true, error_message: "Skipped: quiz-origin sale" })
          .eq("id", eventLog.id);
      }
      return json({ received: true, skipped: "quiz-origin" });
    }

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
      return json({ ok: true, skipped: true });
    }

    // 2. Processar de acordo com o tipo de evento
    if (eventType === "checkout.session.completed" || eventType === "customer.subscription.created" || eventType === "customer.subscription.updated") {

      const status = session.status === "active" || session.status === "trialing" || eventType === "checkout.session.completed" ? "active" : session.status;

      console.log(`[ACTION] Processando ${eventType} para: ${email} (Status: ${status})`);

      // PASSO A: Garantir que o usuário EXISTE no Auth do Supabase
      // Buscamos o usuário pelo email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) console.error("[LIST USERS ERROR]", listError);
      let user = users?.find((u) => u.email?.toLowerCase() === email);

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

    return json({ received: true });

  } catch (error: any) {
    console.error(`[FATAL WEBHOOK ERROR] ${error.message}`);
    return json({ error: error.message }, 500);
  }
});
