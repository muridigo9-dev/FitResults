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
 * Finds an auth user by email, across every page.
 *
 * `auth.admin.listUsers()` returns only the first page — 50 users — so the
 * `users.find()` this replaces silently stopped seeing anyone who signed up
 * after the 50th account. A returning customer then looked new, and got either
 * a failed re-invite or a second account.
 */
async function findUserByEmail(supabaseAdmin: any, email: string) {
  const target = email.toLowerCase().trim();
  const perPage = 1000; // GoTrue's maximum

  for (let page = 1;; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u: any) => u.email?.toLowerCase() === target);
    if (match) return match;

    // A short page is the last page.
    if (users.length < perPage) return null;
  }
}

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

    // A Stripe signing secret is always `whsec_...`. Anything else in this
    // column is a paste of the wrong credential, and because `||` only falls
    // through on an empty value, a wrong-but-present value used to shadow a
    // correct STRIPE_WEBHOOK_SECRET. Every event then failed verification with
    // a 400 and left no trace at all, because the audit insert below only runs
    // on events that already verified. Treat "not a signing secret" as absent.
    const isSigningSecret = (v?: string | null): v is string => !!v && v.startsWith("whsec_");

    const storedWebhookSecret = stripeSettings?.webhook_secret;
    const envWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (storedWebhookSecret && !isSigningSecret(storedWebhookSecret)) {
      console.error(
        "[CONFIG ERROR] stripe_settings.webhook_secret não é um signing secret " +
          "(precisa começar com 'whsec_'). Ignorando o valor salvo e tentando " +
          "STRIPE_WEBHOOK_SECRET.",
      );
    }

    const webhookSecret = isSigningSecret(storedWebhookSecret)
      ? storedWebhookSecret
      : isSigningSecret(envWebhookSecret)
      ? envWebhookSecret
      : null;

    const secretKey = stripeSettings?.secret_key || Deno.env.get("STRIPE_SECRET_KEY");

    if (!webhookSecret || !secretKey) {
      console.error("[CONFIG ERROR] Stripe não configurado: falta secret_key ou um signing secret válido.");
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
    const { data: insertedLog, error: logError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        stripe_event_id: stripeEventId,
        event_type: eventType,
        payload: payload,
        processed: false,
      })
      .select()
      .maybeSingle();

    let eventLog = insertedLog;

    if (logError) {
      // 23505 = unique violation on stripe_event_id, i.e. Stripe redelivered an
      // event we have already seen. Skip only if the first delivery actually
      // finished — if it failed partway and returned non-2xx, this redelivery
      // is the retry that should complete it, so fall through and reuse the row.
      if (logError.code === "23505") {
        const { data: prior } = await supabaseAdmin
          .from("stripe_events")
          .select("id, processed")
          .eq("stripe_event_id", stripeEventId)
          .maybeSingle();

        if (prior?.processed) {
          console.log(`[SKIP] Evento ${stripeEventId} já processado — redelivery ignorada.`);
          return json({ received: true, skipped: "duplicate" });
        }

        console.log(`[RETRY] Evento ${stripeEventId} já registrado mas não concluído — reprocessando.`);
        eventLog = prior ?? null;
      } else {
        console.error("[LOG ERROR]", logError);
      }
    }

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

    // Stripe subscription status -> our two columns, resolved in one place
    // because `customer.subscription.updated` and the `invoice.*` events below
    // describe the same failure from two directions and must not disagree.
    //
    // `past_due` deliberately keeps access ON. Stripe retries a failed card for
    // about two weeks, and cutting a customer off on the first failed charge
    // punishes someone whose card merely expired. The real cutoff is
    // `customer.subscription.deleted`, which is what Stripe sends once it has
    // given up — that branch already revokes access.
    const GRACE_STATUSES = new Set(["active", "trialing", "past_due"]);
    const accountStatusFor = (subscriptionStatus: string) =>
      GRACE_STATUSES.has(subscriptionStatus) ? "active" : "inactive";

    // Every failure in this delivery. A non-empty list means we answer Stripe
    // with a 500 so it redelivers. These used to be logged while the handler
    // still returned 200, so Stripe considered the event delivered and a paid
    // customer who failed to provision was never retried and never alerted.
    const failures: string[] = [];

    const noteFailure = async (label: string, message: string) => {
      console.error(`[${label}] ${message}`);
      failures.push(`${label}: ${message}`);
      if (eventLog) {
        await supabaseAdmin
          .from("stripe_events")
          .update({ error_message: `${label}: ${message}` })
          .eq("id", eventLog.id);
      }
    };

    if (eventType === "checkout.session.completed" || eventType === "customer.subscription.created" || eventType === "customer.subscription.updated") {

      // A completed Checkout is a paid subscription; for the subscription
      // events Stripe's own status is authoritative.
      const subscriptionStatus = eventType === "checkout.session.completed"
        ? "active"
        : (session.status ?? "active");

      console.log(`[ACTION] Processando ${eventType} para: ${email} (Status: ${subscriptionStatus})`);

      // PASSO A: Garantir que o usuário EXISTE no Auth do Supabase
      let user = await findUserByEmail(supabaseAdmin, email);

      if (!user && eventType === "checkout.session.completed") {
        console.log(`[PROVISIONING] Criando nova conta para o lead: ${email}`);

        // Criar usuário e enviar convite automático
        const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${supabaseUrl.replace("/rest/v1", "")}/dashboard`,
        });

        if (inviteError) {
          // The customer has paid and has no way in. Worth a redelivery.
          await noteFailure("INVITE ERROR", inviteError.message);
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
        await noteFailure("RPC ERROR", rpcError.message);
      }

      // PASSO C: Sincronização forçada de colunas críticas
      const updateData: any = {
        subscription_status: subscriptionStatus,
        account_status: accountStatusFor(subscriptionStatus),
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
        await noteFailure("SYNC ERROR", finalUpdateError.message);
      }

      if (failures.length === 0) {
        console.log(`[SUCCESS] Fluxo completo para: ${email}`);
        if (eventLog) {
          await supabaseAdmin.from("stripe_events").update({ processed: true }).eq("id", eventLog.id);
        }
      }
    }

    // === DUNNING ===
    // Neither of these was handled before, so a failed renewal changed nothing:
    // the account stayed fully active forever and nobody was told. After the
    // initial sale this is the most consequential event a subscription business
    // receives — expired cards are most of the churn you can actually recover.
    if (eventType === "invoice.payment_failed" || eventType === "invoice.payment_succeeded") {
      const subscriptionStatus = eventType === "invoice.payment_succeeded" ? "active" : "past_due";

      console.log(`[DUNNING] ${eventType} para: ${email} -> ${subscriptionStatus}`);

      const { error: dunningError } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: subscriptionStatus,
          account_status: accountStatusFor(subscriptionStatus),
          updated_at: new Date().toISOString(),
        })
        .ilike("email", email);

      if (dunningError) {
        await noteFailure("DUNNING ERROR", dunningError.message);
      } else if (eventLog) {
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
        await noteFailure("TERMINATION ERROR", cancelError.message);
      } else {
        if (eventLog) await supabaseAdmin.from("stripe_events").update({ processed: true }).eq("id", eventLog.id);
      }
    }

    if (failures.length > 0) {
      // Non-2xx so Stripe redelivers. The row stays `processed = false`, so the
      // duplicate check above lets the retry through instead of skipping it.
      return json({ error: "Processing failed", details: failures }, 500);
    }

    return json({ received: true });

  } catch (error: any) {
    console.error(`[FATAL WEBHOOK ERROR] ${error.message}`);
    return json({ error: error.message }, 500);
  }
});
