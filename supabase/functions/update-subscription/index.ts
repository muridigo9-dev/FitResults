import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * UPDATE SUBSCRIPTION - SEAMLESS UPGRADE/DOWNGRADE
 * Handles proration and immediate plan changes for existing Stripe subscribers.
 */
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Get Auth User
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Acesso não autorizado.");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Sessão inválida.");

        // Load Stripe Key
        if (!stripeSecretKey) {
            const { data: dbSettings } = await supabaseAdmin.from("stripe_settings").select("secret_key").maybeSingle();
            stripeSecretKey = dbSettings?.secret_key;
        }
        if (!stripeSecretKey) throw new Error("Stripe não configurado.");

        const { price_id, plan_id } = await req.json();
        if (!price_id) throw new Error("Price ID é obrigatório.");

        // 1. Fetch current subscription from profile
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_subscription_id, stripe_customer_id")
            .eq("id", user.id)
            .single();

        if (!profile?.stripe_subscription_id) {
            // Se o usuário não tem assinatura, redirecionamos para o checkout normal no frontend
            throw new Error("Assinatura não localizada para upgrade direto.");
        }

        console.log(`[UpdateSub] Iniciando alteração de ${profile.stripe_subscription_id} para o preço ${price_id}`);

        // 2. Comunicar com o Stripe API para atualizar a assinatura
        // Nota: Usamos fetch nativo para evitar dependência pesada da lib Stripe em Edge Functions
        const stripeUrl = `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`;

        // Primeiro pegamos a assinatura atual para descobrir o ID do item atual
        const getRes = await fetch(stripeUrl, {
            headers: { Authorization: `Bearer ${stripeSecretKey}` }
        });
        const subscription = await getRes.json();

        if (subscription.error) throw new Error(subscription.error.message);

        const currentItemId = subscription.items.data[0].id;

        // Atualizamos o item (Muda o preço e ativa a prorata automática)
        const updateRes = await fetch(stripeUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                "items[0][id]": currentItemId,
                "items[0][price]": price_id,
                "proration_behavior": "always_invoice", // Cobra a diferença na hora se for upgrade
                "payment_behavior": "pending_if_incomplete",
                "metadata[plan_id]": plan_id || "", // Passamos o plan_id novo nos metadados
            }).toString(),
        });

        const result = await updateRes.json();
        if (result.error) throw new Error(result.error.message);

        console.log(`[UpdateSub Success] Assinatura atualizada: ${result.id}`);

        // 3. Atualizar o banco de dados local imediatamente (Otimismo)
        // O Webhook também fará isso, mas fazemos aqui para feedback instantâneo
        await supabaseAdmin
            .from("profiles")
            .update({
                current_plan_id: plan_id,
                updated_at: new Date().toISOString()
            })
            .eq("id", user.id);

        return new Response(JSON.stringify({
            success: true,
            subscription_id: result.id,
            status: result.status
        }), { status: 200, headers: corsHeaders });

    } catch (error: any) {
        console.error(`[UpdateSub Error] ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
});
