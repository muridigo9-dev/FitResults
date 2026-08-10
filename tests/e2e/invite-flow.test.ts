import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// =====================================================
// E2E TESTS: Complete Invite Flow
// =====================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

let adminClient: SupabaseClient;

Deno.test({
  name: "E2E: Complete invite flow - Academy invites trainer",
  async fn() {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("\n📋 SCENARIO: Academy Admin invites a Personal Trainer\n");

    // STEP 1: Setup - Create academy and admin
    console.log("1️⃣ Creating test academy...");
    const { data: academy } = await adminClient
      .from("academies")
      .insert({
        name: "Elite Fitness Academy",
        slug: `elite-fitness-${Date.now()}`,
        max_trainers: 10,
        max_nutritionists: 5,
        max_students: 200,
        status: "active",
      })
      .select()
      .single();

    assertExists(academy);
    console.log(`   ✅ Academy created: ${academy!.name} (${academy!.id})`);

    // STEP 2: Create academy admin
    console.log("\n2️⃣ Creating academy admin...");
    const adminEmail = `admin-${Date.now()}@elitefitness.com`;
    const { data: { user: adminUser } } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: "SecurePass123!",
      email_confirm: true,
      user_metadata: {
        full_name: "John Admin",
      },
    });

    assertExists(adminUser);

    // Add admin role
    await adminClient.from("user_roles").insert({
      user_id: adminUser!.id,
      role: "admin",
    });

    // Add as academy owner
    await adminClient.from("academy_members").insert({
      academy_id: academy!.id,
      user_id: adminUser!.id,
      role: "owner",
      status: "active",
    });

    console.log(`   ✅ Admin created: ${adminEmail}`);

    // STEP 3: Admin logs in
    console.log("\n3️⃣ Admin logging in...");
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: "SecurePass123!",
    });

    assertExists(session);
    const adminToken = session!.access_token;
    console.log(`   ✅ Admin logged in successfully`);

    // STEP 4: Admin creates invite for trainer
    console.log("\n4️⃣ Admin creating invite for trainer...");
    const trainerEmail = `trainer-${Date.now()}@elitefitness.com`;

    const createInviteResponse = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: trainerEmail,
        invite_type: "academy_trainer",
        academy_id: academy!.id,
        target_role: "personal_trainer",
        message: "Welcome to Elite Fitness! We're excited to have you on our team.",
      }),
    });

    assertEquals(createInviteResponse.status, 200);
    const inviteData = await createInviteResponse.json();
    assertEquals(inviteData.success, true);
    assertExists(inviteData.token);

    console.log(`   ✅ Invite created successfully`);
    console.log(`   📧 Token: ${inviteData.token.substring(0, 20)}...`);

    // STEP 5: Verify invite in database
    console.log("\n5️⃣ Verifying invite in database...");
    const { data: invite } = await adminClient
      .from("invites")
      .select("*")
      .eq("id", inviteData.invite_id)
      .single();

    assertExists(invite);
    assertEquals(invite!.status, "pending");
    assertEquals(invite!.invited_email, trainerEmail.toLowerCase());
    assertEquals(invite!.invite_type, "academy_trainer");

    console.log(`   ✅ Invite verified in database`);
    console.log(`   ⏰ Expires: ${new Date(invite!.expires_at).toLocaleString()}`);

    // STEP 6: Check invite validity via function
    console.log("\n6️⃣ Checking invite validity...");
    const { data: isValid } = await adminClient.rpc("is_invite_valid", {
      _token: inviteData.token,
    });

    assertEquals(isValid, true);
    console.log(`   ✅ Invite is valid`);

    // STEP 7: Trainer accepts invite (new user)
    console.log("\n7️⃣ Trainer accepting invite...");
    const acceptInviteResponse = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: inviteData.token,
        user_data: {
          full_name: "Maria Silva",
          password: "TrainerPass123!",
        },
      }),
    });

    assertEquals(acceptInviteResponse.status, 200);
    const acceptData = await acceptInviteResponse.json();
    assertEquals(acceptData.success, true);
    assertExists(acceptData.user_id);
    assertEquals(acceptData.academy_id, academy!.id);

    console.log(`   ✅ Invite accepted successfully`);
    console.log(`   👤 New user ID: ${acceptData.user_id}`);

    // STEP 8: Verify user was created
    console.log("\n8️⃣ Verifying user creation...");
    const { data: trainerProfile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", acceptData.user_id)
      .single();

    assertExists(trainerProfile);
    assertEquals(trainerProfile!.email, trainerEmail.toLowerCase());
    assertEquals(trainerProfile!.full_name, "Maria Silva");
    assertEquals(trainerProfile!.primary_academy_id, academy!.id);

    console.log(`   ✅ User profile created`);
    console.log(`   📧 Email: ${trainerProfile!.email}`);
    console.log(`   👤 Name: ${trainerProfile!.full_name}`);

    // STEP 9: Verify academy membership
    console.log("\n9️⃣ Verifying academy membership...");
    const { data: membership } = await adminClient
      .from("academy_members")
      .select("*")
      .eq("user_id", acceptData.user_id)
      .eq("academy_id", academy!.id)
      .single();

    assertExists(membership);
    assertEquals(membership!.role, "trainer");
    assertEquals(membership!.status, "active");

    console.log(`   ✅ Membership created`);
    console.log(`   🎭 Role: ${membership!.role}`);
    console.log(`   ✨ Status: ${membership!.status}`);

    // STEP 10: Verify user role
    console.log("\n🔟 Verifying user role...");
    const { data: userRole } = await adminClient
      .from("user_roles")
      .select("*")
      .eq("user_id", acceptData.user_id)
      .eq("role", "personal_trainer")
      .single();

    assertExists(userRole);
    console.log(`   ✅ Global role assigned: personal_trainer`);

    // STEP 11: Verify invite status updated
    console.log("\n1️⃣1️⃣ Verifying invite status...");
    const { data: updatedInvite } = await adminClient
      .from("invites")
      .select("*")
      .eq("id", inviteData.invite_id)
      .single();

    assertEquals(updatedInvite!.status, "accepted");
    assertExists(updatedInvite!.accepted_at);
    assertEquals(updatedInvite!.accepted_by, acceptData.user_id);

    console.log(`   ✅ Invite marked as accepted`);
    console.log(`   📅 Accepted at: ${new Date(updatedInvite!.accepted_at).toLocaleString()}`);

    // STEP 12: Verify academy usage stats
    console.log("\n1️⃣2️⃣ Checking academy usage stats...");
    const { data: stats } = await adminClient.rpc("get_academy_usage_stats", {
      _academy_id: academy!.id,
    });

    assertExists(stats);
    assertEquals(stats[0].total_trainers, 1n);
    assertEquals(stats[0].total_nutritionists, 0n);
    assertEquals(stats[0].total_students, 0n);

    console.log(`   ✅ Academy stats updated`);
    console.log(`   👥 Trainers: ${stats[0].total_trainers}/${stats[0].max_trainers}`);
    console.log(`   👥 Nutritionists: ${stats[0].total_nutritionists}/${stats[0].max_nutritionists}`);
    console.log(`   👥 Students: ${stats[0].total_students}/${stats[0].max_students}`);

    // STEP 13: Verify trainer can now login
    console.log("\n1️⃣3️⃣ Verifying trainer can login...");
    const { data: { user: trainerUser }, error: loginError } = await adminClient.auth.signInWithPassword({
      email: trainerEmail,
      password: "TrainerPass123!",
    });

    assertExists(trainerUser);
    assertEquals(trainerUser!.email, trainerEmail.toLowerCase());

    console.log(`   ✅ Trainer can login successfully`);

    // CLEANUP
    console.log("\n🧹 Cleaning up test data...");
    await adminClient.from("academy_members").delete().eq("academy_id", academy!.id);
    await adminClient.from("invites").delete().eq("academy_id", academy!.id);
    await adminClient.from("academies").delete().eq("id", academy!.id);
    await adminClient.auth.admin.deleteUser(adminUser!.id);
    await adminClient.auth.admin.deleteUser(acceptData.user_id);

    console.log("   ✅ Cleanup complete\n");

    console.log("🎉 E2E TEST PASSED: Complete invite flow working as expected!\n");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "E2E: Trainer invites student flow",
  async fn() {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("\n📋 SCENARIO: Personal Trainer invites a Student\n");

    // STEP 1: Create personal trainer
    console.log("1️⃣ Creating personal trainer...");
    const trainerEmail = `trainer-${Date.now()}@fitness.com`;
    const { data: { user: trainer } } = await adminClient.auth.admin.createUser({
      email: trainerEmail,
      password: "TrainerPass123!",
      email_confirm: true,
      user_metadata: {
        full_name: "Carlos Trainer",
      },
    });

    await adminClient.from("user_roles").insert({
      user_id: trainer!.id,
      role: "personal_trainer",
    });

    console.log(`   ✅ Trainer created: ${trainerEmail}`);

    // STEP 2: Trainer logs in
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: trainerEmail,
      password: "TrainerPass123!",
    });

    const trainerToken = session!.access_token;

    // STEP 3: Trainer creates invite for student
    console.log("\n2️⃣ Trainer creating invite for student...");
    const studentEmail = `student-${Date.now()}@fitness.com`;

    const createInviteResponse = await fetch(`${supabaseUrl}/functions/v1/create-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${trainerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invited_email: studentEmail,
        invite_type: "trainer_student",
        target_role: "student",
        message: "Let's achieve your fitness goals together!",
      }),
    });

    assertEquals(createInviteResponse.status, 200);
    const inviteData = await createInviteResponse.json();
    assertEquals(inviteData.success, true);

    console.log(`   ✅ Invite created for student`);

    // STEP 4: Student accepts invite
    console.log("\n3️⃣ Student accepting invite...");
    const acceptResponse = await fetch(`${supabaseUrl}/functions/v1/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: inviteData.token,
        user_data: {
          full_name: "Ana Student",
          password: "StudentPass123!",
        },
      }),
    });

    assertEquals(acceptResponse.status, 200);
    const acceptData = await acceptResponse.json();
    assertEquals(acceptData.success, true);

    console.log(`   ✅ Student accepted invite`);

    // STEP 5: Verify trainer-student relationship
    console.log("\n4️⃣ Verifying trainer-student relationship...");
    const { data: relationship } = await adminClient
      .from("trainer_students")
      .select("*")
      .eq("trainer_id", trainer!.id)
      .eq("student_id", acceptData.user_id)
      .single();

    assertExists(relationship);
    assertEquals(relationship!.status, "active");

    console.log(`   ✅ Relationship established`);
    console.log(`   👨‍🏫 Trainer: ${trainer!.email}`);
    console.log(`   🎓 Student: ${studentEmail}`);

    // CLEANUP
    console.log("\n🧹 Cleaning up...");
    await adminClient.from("trainer_students").delete().eq("trainer_id", trainer!.id);
    await adminClient.from("invites").delete().eq("trainer_id", trainer!.id);
    await adminClient.auth.admin.deleteUser(trainer!.id);
    await adminClient.auth.admin.deleteUser(acceptData.user_id);

    console.log("   ✅ Cleanup complete\n");
    console.log("🎉 E2E TEST PASSED: Trainer-student invite flow working!\n");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
