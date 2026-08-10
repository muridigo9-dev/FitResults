import { supabase } from "@/integrations/supabase/client";

export interface SendEmailParams {
  to: string | string[];
  templateType?: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: Record<string, string>;
  userId?: string;
  isTest?: boolean;
}

/**
 * Send an email using the configured email service
 * Uses the send-email edge function which reads settings from the database
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: params.to,
        template_type: params.templateType,
        subject: params.subject,
        html: params.html,
        text: params.text,
        variables: params.variables || {},
        user_id: params.userId,
        is_test: params.isTest || false,
      },
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Email send exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(userId: string, userEmail: string, userName?: string): Promise<void> {
  try {
    await sendEmail({
      to: userEmail,
      templateType: "welcome",
      variables: {
        user_name: userName || userEmail.split("@")[0],
        user_email: userEmail,
      },
      userId,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}

/**
 * Send cancellation request received email
 */
export async function sendCancellationRequestReceivedEmail(
  userId: string,
  userEmail: string,
  userName?: string
): Promise<void> {
  try {
    await sendEmail({
      to: userEmail,
      templateType: "cancellation_request_received",
      variables: {
        user_name: userName || userEmail.split("@")[0],
        user_email: userEmail,
      },
      userId,
    });
  } catch (err) {
    console.error("Failed to send cancellation request email:", err);
  }
}

/**
 * Send cancellation processed email
 */
export async function sendCancellationProcessedEmail(
  userId: string,
  userEmail: string,
  userName?: string,
  cancellationDate?: string
): Promise<void> {
  try {
    await sendEmail({
      to: userEmail,
      templateType: "cancellation_processed",
      variables: {
        user_name: userName || userEmail.split("@")[0],
        user_email: userEmail,
        cancellation_date: cancellationDate || new Date().toLocaleDateString("pt-BR"),
      },
      userId,
    });
  } catch (err) {
    console.error("Failed to send cancellation processed email:", err);
  }
}

/**
 * Send student invite email
 */
export async function sendStudentInviteEmail(
  studentEmail: string,
  trainerName: string,
  inviteUrl: string,
  message?: string
): Promise<void> {
  try {
    await sendEmail({
      to: studentEmail,
      templateType: "student_invite",
      subject: `${trainerName} convidou você para ser aluno(a)!`,
      variables: {
        trainer_name: trainerName,
        invite_url: inviteUrl,
        invite_message: message || "Aceite o convite para começar seu acompanhamento personalizado.",
        student_email: studentEmail,
      },
    });
  } catch (err) {
    console.error("Failed to send student invite email:", err);
  }
}
