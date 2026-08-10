import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// =====================================================
// UNIT TESTS: accept-invite Edge Function
// =====================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

let adminClient: SupabaseClient;

// Test data
let testAcademyId: string;
let testAdminId: string;
let testInviteToken: string;
let testInviteId: string;

Deno.test({
  name: "Setup: Create test invite",
  async fn() {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Criar academia
    const { data: academy } = await adminClient
      .from("academies")
      .insert({
        name: "Test Academy Accept",
        slug: `test-academy-accept-${Date.now()}`,
        max_trainers: 5,
        status: "active",
      })
      .select()
      .single();

    testAcademyId = academy!.id;

    // Criar admin
    const { data: { user: adminUser } } = await adminClient.auth.admin.createUser({
      email: `admin-accept-${Date.now()}@test.com`,
      password: "test123456",
      email_confirm: true,
    });

    testAdminId = adminUser!.id;

    // Criar convite
    const { data: invite } = await adminClient
      .from("invites")
      .insert({
        invited_email: `new-trainer-${Date.now()}@test.com`,
        invited_by: testAdminId,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    testInviteToken = invite!.token;
    testInviteId = invite!.id;

    console.log("✅ Test invite created successfully");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should fail without token",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    assertEquals(response.status, 400, "Should return 400 without token");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVALID_REQUEST");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should fail with invalid token",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: "invalid-token-12345",
      }),
    });

    assertEquals(response.status, 404, "Should return 404 for invalid token");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVITE_NOT_FOUND");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should require signup data for new user",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: testInviteToken,
      }),
    });

    assertEquals(response.status, 200, "Should return 200 but require signup");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "SIGNUP_REQUIRED");
    assertEquals(data.requires_signup, true);

    console.log("✅ Signup requirement working");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should create user and accept invite",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: testInviteToken,
        user_data: {
          full_name: "New Trainer",
          password: "secure_password_123",
        },
      }),
    });

    assertEquals(response.status, 200, "Should return 200 for successful accept");
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.code, "INVITE_ACCEPTED");
    assertExists(data.user_id);
    assertEquals(data.academy_id, testAcademyId);

    // Verificar que usuário foi criado
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", data.user_id)
      .single();

    assertExists(profile);
    assertEquals(profile!.full_name, "New Trainer");

    // Verificar que foi adicionado à academia
    const { data: member } = await adminClient
      .from("academy_members")
      .select("*")
      .eq("user_id", data.user_id)
      .eq("academy_id", testAcademyId)
      .single();

    assertExists(member);
    assertEquals(member!.role, "trainer");
    assertEquals(member!.status, "active");

    // Verificar que role foi adicionada
    const { data: role } = await adminClient
      .from("user_roles")
      .select("*")
      .eq("user_id", data.user_id)
      .eq("role", "personal_trainer")
      .single();

    assertExists(role);

    // Verificar que convite foi marcado como aceito
    const { data: invite } = await adminClient
      .from("invites")
      .select("*")
      .eq("id", testInviteId)
      .single();

    assertEquals(invite!.status, "accepted");
    assertExists(invite!.accepted_at);
    assertEquals(invite!.accepted_by, data.user_id);

    console.log("✅ User created and invite accepted successfully");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should fail for already accepted invite",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: testInviteToken,
        user_data: {
          full_name: "Another User",
          password: "password123",
        },
      }),
    });

    assertEquals(response.status, 400, "Should fail for already accepted invite");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVITE_ALREADY_USED");

    console.log("✅ Already accepted invite prevention working");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should fail for expired invite",
  async fn() {
    // Criar convite expirado
    const { data: expiredInvite } = await adminClient
      .from("invites")
      .insert({
        invited_email: `expired-${Date.now()}@test.com`,
        invited_by: testAdminId,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
        status: "pending",
        expires_at: new Date(Date.now() - 1000).toISOString(), // Já expirado
      })
      .select()
      .single();

    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: expiredInvite!.token,
        user_data: {
          full_name: "Test User",
          password: "password123",
        },
      }),
    });

    assertEquals(response.status, 400, "Should fail for expired invite");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVITE_EXPIRED");

    // Verificar que foi marcado como expirado no banco
    const { data: updated } = await adminClient
      .from("invites")
      .select("status")
      .eq("id", expiredInvite!.id)
      .single();

    assertEquals(updated!.status, "expired");

    console.log("✅ Expired invite handling working");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: should link existing user to academy",
  async fn() {
    // Criar usuário existente
    const { data: { user: existingUser } } = await adminClient.auth.admin.createUser({
      email: `existing-user-${Date.now()}@test.com`,
      password: "test123456",
      email_confirm: true,
    });

    // Criar convite para esse email
    const { data: invite } = await adminClient
      .from("invites")
      .insert({
        invited_email: existingUser!.email!,
        invited_by: testAdminId,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    // Aceitar convite (sem user_data pois usuário já existe)
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: invite!.token,
      }),
    });

    assertEquals(response.status, 200, "Should accept invite for existing user");
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.user_id, existingUser!.id);

    // Verificar que foi adicionado à academia
    const { data: member } = await adminClient
      .from("academy_members")
      .select("*")
      .eq("user_id", existingUser!.id)
      .eq("academy_id", testAcademyId)
      .single();

    assertExists(member);

    console.log("✅ Existing user linked to academy successfully");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accept-invite: trainer-student relationship should be created",
  async fn() {
    // Criar personal trainer
    const { data: { user: trainer } } = await adminClient.auth.admin.createUser({
      email: `trainer-rel-${Date.now()}@test.com`,
      password: "test123456",
      email_confirm: true,
    });

    await adminClient.from("user_roles").insert({
      user_id: trainer!.id,
      role: "personal_trainer",
    });

    // Criar convite de trainer para estudante
    const { data: invite } = await adminClient
      .from("invites")
      .insert({
        invited_email: `student-rel-${Date.now()}@test.com`,
        invited_by: trainer!.id,
        invite_type: "trainer_student",
        trainer_id: trainer!.id,
        target_role: "student",
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    // Aceitar convite
    const response = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: invite!.token,
        user_data: {
          full_name: "New Student",
          password: "password123",
        },
      }),
    });

    assertEquals(response.status, 200, "Should accept trainer-student invite");
    
    const data = await response.json();
    assertEquals(data.success, true);

    // Verificar relacionamento trainer_students
    const { data: relationship } = await adminClient
      .from("trainer_students")
      .select("*")
      .eq("trainer_id", trainer!.id)
      .eq("student_id", data.user_id)
      .single();

    assertExists(relationship);
    assertEquals(relationship!.status, "active");

    console.log("✅ Trainer-student relationship created successfully");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Cleanup: Remove test data",
  async fn() {
    // Deletar todos os convites da academia de teste
    await adminClient
      .from("invites")
      .delete()
      .eq("academy_id", testAcademyId);

    // Deletar membros
    await adminClient
      .from("academy_members")
      .delete()
      .eq("academy_id", testAcademyId);

    // Deletar academia
    await adminClient
      .from("academies")
      .delete()
      .eq("id", testAcademyId);

    console.log("✅ Test data cleaned up");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
