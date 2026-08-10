import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessCancellationRequest {
  request_id: string;
  user_id: string;
  cancel_immediately?: boolean;
  admin_notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ProcessCancellationRequest = await req.json();
    const { request_id, user_id, cancel_immediately = false, admin_notes } = body;

    if (!request_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: request_id, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Stripe settings from admin panel
    const { data: stripeSettings } = await supabaseAdmin
      .from("stripe_settings")
      .select("*")
      .single();

    let stripeCancelled = false;
    let stripeError: string | null = null;

    // Get STRIPE_SECRET_KEY from Supabase secrets/vault
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (stripeSecretKey) {
      try {
        // Get user's subscription from Stripe
        // First, find customer by email
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", user_id)
          .single();

        // Get user email from auth
        const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(user_id);
        const customerEmail = targetUser?.email;

        if (customerEmail) {
          // Search for customer in Stripe
          const customersResponse = await fetch(
            `https://api.stripe.com/v1/customers?email=${encodeURIComponent(customerEmail)}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
              },
            }
          );

          const customers = await customersResponse.json();

          if (customers.data && customers.data.length > 0) {
            const customerId = customers.data[0].id;

            // Get active subscriptions for this customer
            const subscriptionsResponse = await fetch(
              `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=10`,
              {
                headers: {
                  Authorization: `Bearer ${stripeSecretKey}`,
                },
              }
            );

            const subscriptions = await subscriptionsResponse.json();

            // Cancel all active subscriptions
            for (const subscription of subscriptions.data || []) {
              const cancelEndpoint = cancel_immediately
                ? `https://api.stripe.com/v1/subscriptions/${subscription.id}`
                : `https://api.stripe.com/v1/subscriptions/${subscription.id}`;

              const cancelBody = cancel_immediately
                ? ""
                : "cancel_at_period_end=true";

              const cancelResponse = await fetch(cancelEndpoint, {
                method: cancel_immediately ? "DELETE" : "POST",
                headers: {
                  Authorization: `Bearer ${stripeSecretKey}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: cancel_immediately ? undefined : cancelBody,
              });

              if (!cancelResponse.ok) {
                const errorData = await cancelResponse.json();
                throw new Error(errorData.error?.message || "Failed to cancel subscription");
              }
            }

            stripeCancelled = subscriptions.data?.length > 0;
          }
        }
      } catch (e: any) {
        console.error("Stripe cancellation error:", e);
        stripeError = e.message;
      }
    }

    // Update cancellation request
    const updateData: any = {
      status: "completed",
      admin_notes,
      processed_at: new Date().toISOString(),
      processed_by: user.id,
      stripe_cancellation_status: stripeCancelled
        ? (cancel_immediately ? "cancelled_immediately" : "cancel_at_period_end")
        : (stripeError || "no_subscription_found"),
    };

    const { error: updateError } = await supabaseAdmin
      .from("account_cancellation_requests")
      .update(updateData)
      .eq("id", request_id);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    // Update user profile status
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        account_status: "cancelled",
        subscription_status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", user_id);

    if (profileError) {
      console.error("Failed to update profile status:", profileError);
    }

    // Send cancellation processed email
    try {
      const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(user_id);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();

      if (targetUser?.email) {
        // Invoke send-email function
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: targetUser.email,
              template_type: "cancellation_processed",
              variables: {
                user_name: profile?.full_name || targetUser.email.split("@")[0],
                user_email: targetUser.email,
                cancellation_date: new Date().toLocaleDateString("pt-BR"),
              },
              user_id: user_id,
            }),
          }
        );

        if (!emailResponse.ok) {
          console.error("Failed to send cancellation email:", await emailResponse.text());
        } else {
          console.log("Cancellation email sent successfully");
        }
      }
    } catch (emailError) {
      console.error("Error sending cancellation email:", emailError);
      // Don't fail the main operation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        stripe_cancelled: stripeCancelled,
        stripe_error: stripeError,
        message: stripeCancelled
          ? "Subscription cancelled and account marked as cancelled"
          : "Account marked as cancelled (no active subscription found)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("Error processing cancellation:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
