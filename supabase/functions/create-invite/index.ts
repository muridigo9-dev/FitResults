import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateInviteRequest {
  invited_email: string;
  invite_type: 'academy_trainer' | 'academy_nutritionist' | 'trainer_student' | 'academy_student' | 'academy_content_creator';
  academy_id?: string;
  trainer_id?: string;
  target_role: 'personal_trainer' | 'nutritionist' | 'student' | 'academy_admin' | 'content_creator';
  message?: string;
  metadata?: Record<string, any>;
}

interface CreateInviteResponse {
  success: boolean;
  code?: string;
  message: string;
  invite_id?: string;
  token?: string;
}

/**
 * Edge function para criar convites para academias/trainers
 * 
 * Validações:
 * - Usuário tem permissão para convidar (academy admin ou trainer)
 * - Academia não atingiu limite de membros
 * - Email não está duplicado
 * - Convite não está expirado
 * 
 * Fluxo:
 * 1. Validar permissões do solicitante
 * 2. Validar limites da academia (se aplicável)
 * 3. Criar registro de convite
 * 4. Enviar email via send-email function
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

    // Create Supabase client with service role (bypasses RLS for validation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return createErrorResponse("UNAUTHORIZED", "Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return createErrorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    // Parse request body
    const body: CreateInviteRequest = await req.json();
    const {
      invited_email,
      invite_type,
      academy_id,
      trainer_id,
      target_role,
      message,
      metadata = {},
    } = body;

    console.log(`[CreateInvite] User ${user.id} creating invite for ${invited_email}, type: ${invite_type}`);

    // Validação básica
    if (!invited_email || !invite_type || !target_role) {
      return createErrorResponse("INVALID_REQUEST", "Missing required fields: invited_email, invite_type, target_role", 400);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invited_email)) {
      return createErrorResponse("INVALID_EMAIL", "Invalid email format", 400);
    }

    // 1. VALIDAR PERMISSÕES DO SOLICITANTE
    const hasPermission = await validateInviterPermissions(
      supabase,
      user.id,
      invite_type,
      academy_id,
      trainer_id
    );

    if (!hasPermission.allowed) {
      return createErrorResponse("PERMISSION_DENIED", hasPermission.reason || "You don't have permission to create this invite", 403);
    }

    // 2. VERIFICAR SE EMAIL JÁ ESTÁ CADASTRADO
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", invited_email.toLowerCase())
      .maybeSingle();

    // Se usuário já existe e é para academia, verificar se já é membro
    if (existingUser && academy_id) {
      const { data: existingMember } = await supabase
        .from("academy_members")
        .select("id, status")
        .eq("academy_id", academy_id)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember && existingMember.status === 'active') {
        return createErrorResponse("ALREADY_MEMBER", "User is already a member of this academy", 400);
      }
    }

    // 3. VERIFICAR SE JÁ EXISTE CONVITE PENDENTE
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id, status, expires_at")
      .eq("invited_email", invited_email.toLowerCase())
      .eq("invite_type", invite_type)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      // Se convite ainda está válido
      if (new Date(existingInvite.expires_at) > new Date()) {
        return createErrorResponse("INVITE_EXISTS", "A pending invite already exists for this email", 400);
      }
      // Se expirado, marcar como expirado
      await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("id", existingInvite.id);
    }

    // 4. VALIDAR LIMITES DA ACADEMIA (se aplicável)
    if (academy_id && ['academy_trainer', 'academy_nutritionist', 'academy_student', 'academy_content_creator'].includes(invite_type)) {
      const canAdd = await checkAcademyLimits(supabase, academy_id, target_role);
      if (!canAdd.allowed) {
        return createErrorResponse("LIMIT_REACHED", canAdd.reason || "Academy has reached the limit for this role", 400);
      }
    }

    // 5. CRIAR CONVITE
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert({
        invited_email: invited_email.toLowerCase(),
        invited_by: user.id,
        invite_type,
        academy_id,
        trainer_id: trainer_id || (invite_type === 'trainer_student' ? user.id : null),
        target_role,
        message,
        metadata,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      })
      .select("id, token")
      .single();

    if (inviteError || !invite) {
      console.error("[CreateInvite] Error creating invite:", inviteError);
      return createErrorResponse("DATABASE_ERROR", "Failed to create invite", 500);
    }

    console.log(`[CreateInvite] Invite created successfully: ${invite.id}`);

    // 6. ENVIAR EMAIL (via send-email function)
    try {
      await sendInviteEmail(supabase, invite.id, invite.token, invited_email, user.id, invite_type, academy_id, message);
    } catch (emailError) {
      console.error("[CreateInvite] Error sending email:", emailError);
      // Não falhar o convite se email falhar, apenas logar
    }

    const duration = Date.now() - startTime;
    console.log(`[CreateInvite] Success. Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        code: "INVITE_CREATED",
        message: "Invite created and email sent successfully",
        invite_id: invite.id,
        token: invite.token,
      } as CreateInviteResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[CreateInvite] Unexpected error:", error);
    return createErrorResponse("INTERNAL_ERROR", error.message || "Internal server error", 500);
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function validateInviterPermissions(
  supabase: any,
  userId: string,
  inviteType: string,
  academyId?: string,
  trainerId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Verificar se é Super Admin (sempre pode convidar)
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) {
    return { allowed: true };
  }

  switch (inviteType) {
    case 'academy_trainer':
    case 'academy_nutritionist':
    case 'academy_student':
    case 'academy_content_creator':
      // Deve ser owner/admin da academia
      if (!academyId) {
        return { allowed: false, reason: "academy_id is required for this invite type" };
      }

      const { data: isAcademyAdmin } = await supabase.rpc("is_academy_admin", {
        _user_id: userId,
        _academy_id: academyId,
      });

      if (!isAcademyAdmin) {
        return { allowed: false, reason: "You must be an admin of this academy to send invites" };
      }

      return { allowed: true };

    case 'trainer_student':
      // Deve ser personal trainer e pode especificar trainer_id (ou usar próprio ID)
      const actualTrainerId = trainerId || userId;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", actualTrainerId);

      const isTrainer = roles?.some((r: any) => r.role === 'personal_trainer');

      if (!isTrainer) {
        return { allowed: false, reason: "You must be a personal trainer to invite students" };
      }

      // Se especificou outro trainer_id, verificar se é admin ou o próprio
      if (trainerId && trainerId !== userId) {
        const { data: isAdminCheck } = await supabase.rpc("is_admin");
        if (!isAdminCheck) {
          return { allowed: false, reason: "You can only create invites for yourself" };
        }
      }

      return { allowed: true };

    default:
      return { allowed: false, reason: "Invalid invite type" };
  }
}

async function checkAcademyLimits(
  supabase: any,
  academyId: string,
  targetRole: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Mapear target_role para academy_member role
  const memberRole = targetRole === 'personal_trainer' ? 'trainer' :
                     targetRole === 'nutritionist' ? 'nutritionist' :
                     targetRole === 'student' ? 'student' :
                     targetRole === 'content_creator' ? 'content_creator' : null;

  if (!memberRole) {
    return { allowed: true }; // Roles administrativos não têm limite
  }

  const { data: canAdd } = await supabase.rpc("can_add_academy_member", {
    _academy_id: academyId,
    _member_role: memberRole,
  });

  if (!canAdd) {
    return {
      allowed: false,
      reason: `Academy has reached the maximum number of ${memberRole}s allowed by the current plan`,
    };
  }

  return { allowed: true };
}

async function sendInviteEmail(
  supabase: any,
  inviteId: string,
  token: string,
  recipientEmail: string,
  invitedBy: string,
  inviteType: string,
  academyId?: string,
  customMessage?: string
) {
  // Buscar dados do convite para o email
  const { data: inviteDetails } = await supabase.rpc("get_invite_details", {
    _token: token,
  });

  if (!inviteDetails || inviteDetails.length === 0) {
    throw new Error("Invite not found");
  }

  const invite = inviteDetails[0];
  
  // URL base do app (frontend)
  const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SUPABASE_URL")?.replace("/v1", "").replace("https://", "https://app.");
  const acceptUrl = `${appUrl}/accept-invite?token=${token}`;

  // Mapear tipo de convite para label amigável
  const roleLabels: Record<string, string> = {
    'personal_trainer': 'Personal Trainer',
    'nutritionist': 'Nutricionista',
    'student': 'Aluno',
    'academy_admin': 'Administrador',
    'content_creator': 'Criador de Conteúdo',
  };

  const roleLabel = roleLabels[invite.target_role] || invite.target_role;

  // Determinar contexto (academia ou trainer)
  const contextName = invite.academy_name || `treinos de ${invite.trainer_name}` || 'nossa plataforma';

  // Formatar data de expiração
  const expiresDate = new Date(invite.expires_at);
  const expiresFormatted = expiresDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    // Chamar send-email function
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipientEmail,
        template_type: "invite",
        variables: {
          inviter_name: invite.invited_by_name,
          context_name: contextName,
          role_label: roleLabel,
          custom_message: customMessage || "",
          accept_url: acceptUrl,
          expires_at: expiresFormatted,
        },
      },
    });

    if (error) {
      console.error("[CreateInvite] Error from send-email:", error);
      throw error;
    }

    console.log(`[CreateInvite] Invite email sent successfully to ${recipientEmail}`);
  } catch (error) {
    console.error("[CreateInvite] Failed to send invite email:", error);
    // Re-throw para que o caller saiba que falhou
    throw error;
  }
}

function createErrorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      code,
      message,
    } as CreateInviteResponse),
    {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

serve(handler);
