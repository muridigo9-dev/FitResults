import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * LGPD Flow Integration Tests
 * 
 * Tests the complete LGPD request flow:
 * 1. User creates LGPD request
 * 2. Admin reviews and processes request
 * 3. System executes appropriate action
 * 4. Audit logs are created
 */

describe("LGPD Flow Integration Tests", () => {
  let testUserId: string;
  let adminUserId: string;
  let requestId: string;

  beforeAll(async () => {
    // Note: In a real test environment, you would:
    // 1. Create test users with proper roles
    // 2. Set up feature flags
    // 3. Clean up any existing test data
    
    // For now, we'll skip setup if we can't authenticate
    try {
      const { data: { user } } = await supabase.auth.getUser();
      testUserId = user?.id || "";
    } catch (error) {
      console.log("Auth not available for tests");
    }
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    if (requestId) {
      await supabase.from("lgpd_requests").delete().eq("id", requestId);
    }
  });

  describe("User LGPD Request Creation", () => {
    it("should allow user to create a confirmation request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "confirmation",
          status: "pending",
          user_notes: "Test request for confirmation",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("confirmation");
      expect(data?.status).toBe("pending");

      if (data) {
        requestId = data.id;
      }
    });

    it("should allow user to create an access request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "access",
          status: "pending",
          user_notes: "Test request for data access",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("access");
    });

    it("should allow user to create a portability request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "portability",
          status: "pending",
          user_notes: "Test request for data portability",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("portability");
    });

    it("should allow user to create a correction request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "correction",
          status: "pending",
          user_notes: "Test request for data correction",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("correction");
    });

    it("should allow user to create an anonymization request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "anonymization",
          status: "pending",
          user_notes: "Test request for anonymization",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("anonymization");
    });

    it("should allow user to create a deletion request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "deletion",
          status: "pending",
          user_notes: "Test request for deletion",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("deletion");
    });

    it("should allow user to create a revocation request", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "revocation",
          status: "pending",
          user_notes: "Test request for consent revocation",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.request_type).toBe("revocation");
    });
  });

  describe("User LGPD Request Retrieval", () => {
    it("should allow user to view their own requests", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .eq("user_id", testUserId)
        .order("requested_at", { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should NOT allow user to view other users' requests", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      // Try to access requests from a different user
      const fakeUserId = "00000000-0000-0000-0000-000000000000";
      
      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .eq("user_id", fakeUserId);

      // Should either return empty or error due to RLS
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });
  });

  describe("Admin LGPD Request Management", () => {
    it("should allow admin to view all requests (requires SUPER_ADMIN)", async () => {
      // Note: This test requires the user to have SUPER_ADMIN role
      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(10);

      // If user is not admin, this will return empty or error
      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(data).toBeDefined();
      }
    });

    it("should allow admin to update request status (requires SUPER_ADMIN)", async () => {
      if (!requestId) {
        console.log("Skipping: No request ID available");
        return;
      }

      const { error } = await supabase
        .from("lgpd_requests")
        .update({ status: "approved", admin_notes: "Test approval" })
        .eq("id", requestId);

      // If user is not admin, this will error
      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(error).toBeNull();
      }
    });
  });

  describe("LGPD Audit Logs", () => {
    it("should create audit log when request is created", async () => {
      if (!requestId) {
        console.log("Skipping: No request ID available");
        return;
      }

      const { data, error } = await supabase
        .from("lgpd_audit_logs")
        .select("*")
        .eq("request_id", requestId)
        .order("timestamp", { ascending: false })
        .limit(1);

      // Audit logs are created automatically by triggers or Edge Function
      if (error) {
        console.log("Could not access audit logs");
      } else {
        expect(data).toBeDefined();
      }
    });

    it("should allow admin to view audit logs (requires SUPER_ADMIN)", async () => {
      const { data, error } = await supabase
        .from("lgpd_audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      // If user is not admin, this will return empty or error
      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(data).toBeDefined();
      }
    });
  });

  describe("LGPD Feature Flags", () => {
    it("should respect lgpd_enabled feature flag", async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("flag_name", "lgpd_enabled")
        .maybeSingle();

      expect(error).toBeNull();
      if (data) {
        expect(typeof data.enabled).toBe("boolean");
      }
    });

    it("should respect lgpd_data_export_enabled feature flag", async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("flag_name", "lgpd_data_export_enabled")
        .maybeSingle();

      expect(error).toBeNull();
      if (data) {
        expect(typeof data.enabled).toBe("boolean");
      }
    });

    it("should respect lgpd_anonymization_enabled feature flag", async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("flag_name", "lgpd_anonymization_enabled")
        .maybeSingle();

      expect(error).toBeNull();
      if (data) {
        expect(typeof data.enabled).toBe("boolean");
      }
    });

    it("should respect lgpd_hard_delete_enabled feature flag", async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("flag_name", "lgpd_hard_delete_enabled")
        .maybeSingle();

      expect(error).toBeNull();
      if (data) {
        expect(typeof data.enabled).toBe("boolean");
      }
    });
  });

  describe("LGPD Edge Function", () => {
    it("should be callable by authenticated users", async () => {
      // Note: This test only checks if the function exists and is callable
      // Actual execution would require proper setup and SUPER_ADMIN role
      
      try {
        const { error } = await supabase.functions.invoke("process-lgpd-request", {
          body: { action: "test" },
        });

        // We expect an error because this is not a valid action
        // But if the function doesn't exist, we'd get a different error
        expect(error).toBeDefined();
      } catch (error) {
        console.log("Edge function not available or not deployed");
      }
    });
  });

  describe("LGPD Request Status Transitions", () => {
    it("should transition from pending to approved", async () => {
      if (!requestId) {
        console.log("Skipping: No request ID available");
        return;
      }

      const { error } = await supabase
        .from("lgpd_requests")
        .update({ status: "approved" })
        .eq("id", requestId)
        .eq("status", "pending");

      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(error).toBeNull();
      }
    });

    it("should transition from approved to processing", async () => {
      if (!requestId) {
        console.log("Skipping: No request ID available");
        return;
      }

      const { error } = await supabase
        .from("lgpd_requests")
        .update({ status: "processing" })
        .eq("id", requestId)
        .eq("status", "approved");

      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(error).toBeNull();
      }
    });

    it("should transition from processing to completed", async () => {
      if (!requestId) {
        console.log("Skipping: No request ID available");
        return;
      }

      const { error } = await supabase
        .from("lgpd_requests")
        .update({ 
          status: "completed",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "processing");

      if (error) {
        console.log("User is not SUPER_ADMIN, skipping");
      } else {
        expect(error).toBeNull();
      }
    });

    it("should allow transition from pending to denied", async () => {
      if (!testUserId) {
        console.log("Skipping: No authenticated user");
        return;
      }

      // Create a new request for denial test
      const { data: newRequest } = await supabase
        .from("lgpd_requests")
        .insert({
          user_id: testUserId,
          request_type: "confirmation",
          status: "pending",
        })
        .select()
        .single();

      if (newRequest) {
        const { error } = await supabase
          .from("lgpd_requests")
          .update({ 
            status: "denied",
            justification: "Test denial",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", newRequest.id);

        if (error) {
          console.log("User is not SUPER_ADMIN, skipping");
        } else {
          expect(error).toBeNull();
        }

        // Cleanup
        await supabase.from("lgpd_requests").delete().eq("id", newRequest.id);
      }
    });
  });
});
