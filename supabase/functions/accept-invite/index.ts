import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
  user_data?: {
    full_name?: string;
    password?: string; // Se usuário ainda não existe
  };
}

interface AcceptInviteResponse {
  success: boolean;
  code?: string;
  message: string;
  user_id?: string;
  academy_id?: string;
  requires_signup?: boolean;
}

/**
 * Edge function para aceitar convites
 * 
 * Fluxo:
 * 1. Validar token do convite (pendente e não expirado)
 * 2. Verificar se usuário já existe ou precisa criar
 * 3. Criar usuário se necessário (via Admin API)
 * 4. Adicionar a academy_members (se aplicável)
 * 5. Adicionar role global (user_roles)
 * 6. Criar relacionamento trainer_students (se aplicável)
 * 7. Marcar convite como aceito
 * 8. Enviar email de boas-vindas
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: AcceptInviteRequest = await req.json();
    const { token, user_data } = body;

    if (!token) {
      return createErrorResponse("INVALID_REQUEST", "Missing token", 400);
    }

    console.log(`[AcceptInvite] Processing invite with token: ${token.substring(0, 8)}...`);

    // 1. VALIDAR E BUSCAR CONVITE
    const { data: inviteData } = await supabase.rpc("get_invite_details", {
      _token: token,
    });

    if (!inviteData || inviteData.length === 0) {
      return createErrorResponse("INVITE_NOT_FOUND", "Invite not found", 404);
    }

    const invite = inviteData[0];

    // Verificar status
    if (invite.status !== "pending") {
      return createErrorResponse(
        "INVITE_ALREADY_USED",
        `Invite is ${invite.status}`,
        400
      );
    }

    // Verificar expiração
    if (new Date(invite.expires_at) < new Date()) {
      // Marcar como expirado
      await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return createErrorResponse("INVITE_EXPIRED", "This invite has expired", 400);
    }

    console.log(`[AcceptInvite] Valid invite for ${invite.invited_email}, type: ${invite.invite_type}`);

    // 2. VERIFICAR SE USUÁRIO JÁ EXISTE
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", invite.invited_email.toLowerCase())
      .maybeSingle();

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Usuário já existe
      userId = existingUser.id;
      console.log(`[AcceptInvite] Existing user found: ${userId}`);
    } else {
      // Verificar se foi fornecido dados para criar usuário
      if (!user_data || !user_data.password) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "SIGNUP_REQUIRED",
            message: "User does not exist. Please provide password to create account.",
            requires_signup: true,
          } as AcceptInviteResponse),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Criar novo usuário
      const newUserResult = await createNewUser(
        supabase,
        invite.invited_email,
        user_data.password,
        user_data.full_name || invite.invited_email.split("@")[0]
      );

      if (!newUserResult.success || !newUserResult.userId) {
        return createErrorResponse(
          "USER_CREATION_FAILED",
          newUserResult.error || "Failed to create user",
          500
        );
      }

      userId = newUserResult.userId;
      isNewUser = true;
      console.log(`[AcceptInvite] New user created: ${userId}`);
    }

    // 3. PROCESSAR CONVITE BASEADO NO TIPO
    const processResult = await processInviteByType(
      supabase,
      invite,
      userId
    );

    if (!processResult.success) {
      return createErrorResponse(
        "PROCESSING_FAILED",
        processResult.error || "Failed to process invite",
        500
      );
    }

    // 4. MARCAR CONVITE COMO ACEITO
    await supabase
      .from("invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq("id", invite.id);

    // 5. ENVIAR EMAIL DE BOAS-VINDAS (se novo usuário)
    if (isNewUser) {
      try {
        await sendWelcomeEmail(supabase, invite, userId);
      } catch (emailError) {
        console.error("[AcceptInvite] Error sending welcome email:", emailError);
        // Não falhar se email falhar
      }
    }

    // 6. CRIAR NOTIFICAÇÃO PARA QUEM CONVIDOU
    await createInviteAcceptedNotification(supabase, invite, userId);

    const duration = Date.now() - startTime;
    console.log(`[AcceptInvite] Success. Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        code: "INVITE_ACCEPTED",
        message: "Invite accepted successfully",
        user_id: userId,
        academy_id: invite.academy_id,
        requires_signup: false,
      } as AcceptInviteResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[AcceptInvite] Unexpected error:", error);
    return createErrorResponse("INTERNAL_ERROR", error.message || "Internal server error", 500);
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function createNewUser(
  supabase: any,
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Criar usuário via Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirmar email para convites
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !newUser.user) {
      console.error("[AcceptInvite] Error creating user:", createError);
      return { success: false, error: createError?.message || "Failed to create user" };
    }

    // Criar profile (trigger deve criar, mas garantir)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        onboarding_completed: false,
      });

    if (profileError) {
      console.error("[AcceptInvite] Error creating profile:", profileError);
      // Não falhar, trigger deve ter criado
    }

    return { success: true, userId: newUser.user.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function processInviteByType(
  supabase: any,
  invite: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (invite.invite_type) {
      case 'academy_trainer':
      case 'academy_nutritionist':
      case 'academy_student':
      case 'academy_content_creator':
        return await processAcademyInvite(supabase, invite, userId);

      case 'trainer_student':
        return await processTrainerStudentInvite(supabase, invite, userId);

      default:
        return { success: false, error: "Unknown invite type" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function processAcademyInvite(
  supabase: any,
  invite: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!invite.academy_id) {
    return { success: false, error: "Missing academy_id" };
  }

  // Mapear target_role para academy member role
  const memberRole = invite.target_role === 'personal_trainer' ? 'trainer' :
                     invite.target_role === 'nutritionist' ? 'nutritionist' :
                     invite.target_role === 'student' ? 'student' :
                     invite.target_role === 'content_creator' ? 'content_creator' :
                     invite.target_role === 'academy_admin' ? 'admin' : null;

  if (!memberRole) {
    return { success: false, error: "Invalid target role for academy invite" };
  }

  // 1. Adicionar a academy_members
  const { error: memberError } = await supabase
    .from("academy_members")
    .insert({
      academy_id: invite.academy_id,
      user_id: userId,
      role: memberRole,
      status: "active",
    });

  if (memberError) {
    console.error("[AcceptInvite] Error adding academy member:", memberError);
    return { success: false, error: "Failed to add to academy" };
  }

  // 2. Adicionar role global (user_roles)
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: userId,
      role: invite.target_role,
    });

  if (roleError && !roleError.message?.includes("duplicate")) {
    console.error("[AcceptInvite] Error adding user role:", roleError);
    // Não falhar se role já existe
  }

  // 3. Atualizar primary_academy_id no profile (se for primeira academia)
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("primary_academy_id")
    .eq("id", userId)
    .single();

  if (!currentProfile?.primary_academy_id) {
    await supabase
      .from("profiles")
      .update({ primary_academy_id: invite.academy_id })
      .eq("id", userId);
  }

  console.log(`[AcceptInvite] User ${userId} added to academy ${invite.academy_id} as ${memberRole}`);
  return { success: true };
}

async function processTrainerStudentInvite(
  supabase: any,
  invite: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!invite.trainer_id) {
    return { success: false, error: "Missing trainer_id" };
  }

  // 1. Adicionar role de student/aluno
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError && !roleError.message?.includes("duplicate")) {
    console.error("[AcceptInvite] Error adding student role:", roleError);
  }

  // 2. Criar relacionamento trainer_students
  const { error: relationError } = await supabase
    .from("trainer_students")
    .insert({
      trainer_id: invite.trainer_id,
      student_id: userId,
      status: "active",
      academy_id: invite.academy_id, // Pode ser NULL se trainer independente
    });

  if (relationError) {
    console.error("[AcceptInvite] Error creating trainer-student relationship:", relationError);
    return { success: false, error: "Failed to link to trainer" };
  }

  console.log(`[AcceptInvite] Student ${userId} linked to trainer ${invite.trainer_id}`);
  return { success: true };
}

async function sendWelcomeEmail(
  supabase: any,
  invite: any,
  userId: string
) {
  // TODO: Integrar com send-email function
  console.log(`[AcceptInvite] Welcome email would be sent to ${invite.invited_email}`);
}

async function createInviteAcceptedNotification(
  supabase: any,
  invite: any,
  acceptedBy: string
) {
  try {
    await supabase.rpc("create_notification", {
      p_user_id: invite.invited_by,
      p_type: "invite_accepted",
      p_title: "Convite Aceito",
      p_message: `${invite.invited_email} aceitou seu convite`,
      p_metadata: {
        invite_id: invite.id,
        accepted_by: acceptedBy,
        invite_type: invite.invite_type,
      },
    });
  } catch (error) {
    console.error("[AcceptInvite] Error creating notification:", error);
    // Não falhar se notificação falhar
  }
}

function createErrorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      code,
      message,
    } as AcceptInviteResponse),
    {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

serve(handler);
