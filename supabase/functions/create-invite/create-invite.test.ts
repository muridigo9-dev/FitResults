import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// =====================================================
// UNIT TESTS: create-invite Edge Function
// =====================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

let supabase: SupabaseClient;
let adminClient: SupabaseClient;

// Test data
let testAcademyId: string;
let testAdminId: string;
let testTrainerId: string;
let testAdminToken: string;
let testTrainerToken: string;

Deno.test({
  name: "Setup: Create test data",
  async fn() {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Criar academia de teste
    const { data: academy, error: academyError } = await adminClient
      .from("academies")
      .insert({
        name: "Test Academy",
        slug: `test-academy-${Date.now()}`,
        max_trainers: 5,
        max_nutritionists: 2,
        max_students: 50,
        status: "active",
      })
      .select()
      .single();

    assertExists(academy, "Academy should be created");
    testAcademyId = academy!.id;

    // Criar admin da academia
    const { data: { user: adminUser }, error: adminError } = await adminClient.auth.admin.createUser({
      email: `admin-${Date.now()}@test.com`,
      password: "test123456",
      email_confirm: true,
    });

    assertExists(adminUser, "Admin user should be created");
    testAdminId = adminUser!.id;

    // Adicionar role de admin
    await adminClient.from("user_roles").insert({
      user_id: testAdminId,
      role: "admin",
    });

    // Adicionar como membro da academia
    await adminClient.from("academy_members").insert({
      academy_id: testAcademyId,
      user_id: testAdminId,
      role: "owner",
      status: "active",
    });

    // Login como admin para obter token
    const { data: { session: adminSession } } = await adminClient.auth.signInWithPassword({
      email: adminUser!.email!,
      password: "test123456",
    });

    assertExists(adminSession, "Admin should be able to login");
    testAdminToken = adminSession!.access_token;

    // Criar personal trainer
    const { data: { user: trainerUser }, error: trainerError } = await adminClient.auth.admin.createUser({
      email: `trainer-${Date.now()}@test.com`,
      password: "test123456",
      email_confirm: true,
    });

    assertExists(trainerUser, "Trainer user should be created");
    testTrainerId = trainerUser!.id;

    // Adicionar role de personal_trainer
    await adminClient.from("user_roles").insert({
      user_id: testTrainerId,
      role: "personal_trainer",
    });

    // Login como trainer
    const { data: { session: trainerSession } } = await adminClient.auth.signInWithPassword({
      email: trainerUser!.email!,
      password: "test123456",
    });

    assertExists(trainerSession, "Trainer should be able to login");
    testTrainerToken = trainerSession!.access_token;

    console.log("✅ Test data created successfully");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: should fail without authorization",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: "test@example.com",
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
      }),
    });

    assertEquals(response.status, 401, "Should return 401 without auth");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: should fail with missing fields",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: "test@example.com",
        // Missing invite_type and target_role
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing fields");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVALID_REQUEST");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: should fail with invalid email",
  async fn() {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: "not-an-email",
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for invalid email");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVALID_EMAIL");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: academy admin can create trainer invite",
  async fn() {
    const invitedEmail = `trainer-invite-${Date.now()}@test.com`;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: invitedEmail,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
        message: "Welcome to our team!",
      }),
    });

    assertEquals(response.status, 200, "Should return 200 for valid invite");
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.code, "INVITE_CREATED");
    assertExists(data.invite_id);
    assertExists(data.token);

    // Verificar que convite foi criado no banco
    const { data: invite } = await adminClient
      .from("invites")
      .select("*")
      .eq("id", data.invite_id)
      .single();

    assertExists(invite);
    assertEquals(invite!.invited_email, invitedEmail.toLowerCase());
    assertEquals(invite!.status, "pending");
    assertEquals(invite!.invite_type, "academy_trainer");

    console.log("✅ Academy admin successfully created trainer invite");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: personal trainer can create student invite",
  async fn() {
    const invitedEmail = `student-invite-${Date.now()}@test.com`;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testTrainerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: invitedEmail,
        invite_type: "trainer_student",
        target_role: "student",
        message: "Let's start your fitness journey!",
      }),
    });

    assertEquals(response.status, 200, "Should return 200 for valid student invite");
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertExists(data.invite_id);

    console.log("✅ Personal trainer successfully created student invite");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: should prevent duplicate pending invites",
  async fn() {
    const invitedEmail = `duplicate-${Date.now()}@test.com`;

    // Criar primeiro convite
    const response1 = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: invitedEmail,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
      }),
    });

    assertEquals(response1.status, 200, "First invite should succeed");

    // Tentar criar segundo convite para mesmo email
    const response2 = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: invitedEmail,
        invite_type: "academy_trainer",
        academy_id: testAcademyId,
        target_role: "personal_trainer",
      }),
    });

    assertEquals(response2.status, 400, "Duplicate invite should fail");
    
    const data = await response2.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "INVITE_EXISTS");

    console.log("✅ Duplicate invite prevention working");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "create-invite: should respect academy member limits",
  async fn() {
    // Criar academia com limite de 0 trainers
    const { data: limitedAcademy } = await adminClient
      .from("academies")
      .insert({
        name: "Limited Academy",
        slug: `limited-academy-${Date.now()}`,
        max_trainers: 0, // Limite 0
        max_students: 50,
        status: "active",
      })
      .select()
      .single();

    // Adicionar admin como membro
    await adminClient.from("academy_members").insert({
      academy_id: limitedAcademy!.id,
      user_id: testAdminId,
      role: "owner",
      status: "active",
    });

    // Tentar criar convite para trainer
    const response = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${testAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: `trainer-limit-${Date.now()}@test.com`,
        invite_type: "academy_trainer",
        academy_id: limitedAcademy!.id,
        target_role: "personal_trainer",
      }),
    });

    assertEquals(response.status, 400, "Should fail when limit reached");
    
    const data = await response.json();
    assertEquals(data.success, false);
    assertEquals(data.code, "LIMIT_REACHED");

    console.log("✅ Academy member limits working");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Cleanup: Remove test data",
  async fn() {
    // Deletar convites
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

    // Deletar usuários
    await adminClient.auth.admin.deleteUser(testAdminId);
    await adminClient.auth.admin.deleteUser(testTrainerId);

    console.log("✅ Test data cleaned up");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
