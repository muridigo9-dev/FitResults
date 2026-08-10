/**
 * Security Tests: RLS and Permissions
 * 
 * Tests for Row Level Security policies and access control.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulated RLS policy checks
// Must match the roles in the database: admin, user, content_creator, personal_trainer, aluno, academy_admin
type AppRole = "admin" | "user" | "content_creator" | "personal_trainer" | "aluno" | "academy_admin";

// Test user emails (must match provision-test-users migration)
const TEST_USERS = {
  admin: "admin@admin.com",
  user: "user@test.com",
  gym: "gym@test.com",
  personalTrainer: "pt@test.com",
  contentCreator: "content@test.com",
} as const;

interface User {
  id: string;
  email: string;
  role: AppRole;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
}

interface Workout {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
}

// RLS Policy Simulators
const isOwner = (userId: string, resourceUserId: string): boolean => {
  return userId === resourceUserId;
};

const isAdmin = (role: AppRole): boolean => {
  return role === "admin";
};

const isPersonalTrainer = (role: AppRole): boolean => {
  return role === "personal_trainer";
};

const isContentCreator = (role: AppRole): boolean => {
  return role === "content_creator";
};

const isAcademyAdmin = (role: AppRole): boolean => {
  return role === "academy_admin";
};

const canAccessResource = (
  user: User,
  resourceUserId: string,
  linkedStudents?: string[]
): boolean => {
  // Admin can access everything
  if (isAdmin(user.role)) return true;
  
  // Owner can access own resources
  if (isOwner(user.id, resourceUserId)) return true;
  
  // Personal trainer can access linked students
  if (isPersonalTrainer(user.role) && linkedStudents?.includes(resourceUserId)) {
    return true;
  }
  
  // Academy admin can access trainers in their academy
  if (isAcademyAdmin(user.role) && linkedStudents?.includes(resourceUserId)) {
    return true;
  }
  
  return false;
};

const canCreateSystemContent = (role: AppRole): boolean => {
  // Admin and content creators can create system-wide content
  return isAdmin(role) || isContentCreator(role);
};

const canModifyResource = (
  user: User,
  resourceUserId: string
): boolean => {
  // Admin can modify everything
  if (isAdmin(user.role)) return true;
  
  // Only owner can modify their own resources
  return isOwner(user.id, resourceUserId);
};

const canCreateContent = (user: User, featureEnabled: boolean, allowUserContent: boolean): boolean => {
  // Admin can always create
  if (isAdmin(user.role)) return true;
  
  // Feature must be enabled
  if (!featureEnabled) return false;
  
  // User content must be allowed
  return allowUserContent;
};

describe("RLS: isOwner", () => {
  it("should return true when user owns the resource", () => {
    expect(isOwner("user-123", "user-123")).toBe(true);
  });

  it("should return false when user doesn't own the resource", () => {
    expect(isOwner("user-123", "user-456")).toBe(false);
  });
});

describe("RLS: isAdmin", () => {
  it("should return true for admin role", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("should return false for user role", () => {
    expect(isAdmin("user")).toBe(false);
  });

  it("should return false for personal_trainer role", () => {
    expect(isAdmin("personal_trainer")).toBe(false);
  });
});

describe("RLS: canAccessResource", () => {
  const adminUser: User = { id: "admin-1", email: "admin@test.com", role: "admin" };
  const regularUser: User = { id: "user-1", email: "user@test.com", role: "user" };
  const trainerUser: User = { id: "trainer-1", email: "trainer@test.com", role: "personal_trainer" };

  it("should allow admin to access any resource", () => {
    expect(canAccessResource(adminUser, "any-user-id")).toBe(true);
    expect(canAccessResource(adminUser, "another-user-id")).toBe(true);
  });

  it("should allow user to access their own resources", () => {
    expect(canAccessResource(regularUser, "user-1")).toBe(true);
  });

  it("should deny user access to other users resources", () => {
    expect(canAccessResource(regularUser, "user-2")).toBe(false);
  });

  it("should allow trainer to access linked student resources", () => {
    const linkedStudents = ["student-1", "student-2"];
    expect(canAccessResource(trainerUser, "student-1", linkedStudents)).toBe(true);
    expect(canAccessResource(trainerUser, "student-2", linkedStudents)).toBe(true);
  });

  it("should deny trainer access to non-linked students", () => {
    const linkedStudents = ["student-1", "student-2"];
    expect(canAccessResource(trainerUser, "student-3", linkedStudents)).toBe(false);
  });
});

describe("RLS: canModifyResource", () => {
  const adminUser: User = { id: "admin-1", email: "admin@test.com", role: "admin" };
  const regularUser: User = { id: "user-1", email: "user@test.com", role: "user" };

  it("should allow admin to modify any resource", () => {
    expect(canModifyResource(adminUser, "any-user-id")).toBe(true);
  });

  it("should allow user to modify their own resources", () => {
    expect(canModifyResource(regularUser, "user-1")).toBe(true);
  });

  it("should deny user modification of other users resources", () => {
    expect(canModifyResource(regularUser, "user-2")).toBe(false);
  });
});

describe("RLS: canCreateContent", () => {
  const adminUser: User = { id: "admin-1", email: "admin@test.com", role: "admin" };
  const regularUser: User = { id: "user-1", email: "user@test.com", role: "user" };

  it("should always allow admin to create content", () => {
    expect(canCreateContent(adminUser, false, false)).toBe(true);
    expect(canCreateContent(adminUser, true, false)).toBe(true);
    expect(canCreateContent(adminUser, true, true)).toBe(true);
  });

  it("should deny user when feature is disabled", () => {
    expect(canCreateContent(regularUser, false, true)).toBe(false);
  });

  it("should deny user when user content not allowed", () => {
    expect(canCreateContent(regularUser, true, false)).toBe(false);
  });

  it("should allow user when feature enabled and user content allowed", () => {
    expect(canCreateContent(regularUser, true, true)).toBe(true);
  });
});

describe("Security: Privilege Escalation Prevention", () => {
  it("should not allow user to change their own role", () => {
    const attemptRoleChange = (currentRole: AppRole, targetRole: AppRole): boolean => {
      // Only admins can change roles
      return currentRole === "admin";
    };

    expect(attemptRoleChange("user", "admin")).toBe(false);
    expect(attemptRoleChange("personal_trainer", "admin")).toBe(false);
    expect(attemptRoleChange("content_creator", "admin")).toBe(false);
    expect(attemptRoleChange("academy_admin", "admin")).toBe(false);
    expect(attemptRoleChange("admin", "user")).toBe(true);
  });

  it("should validate role exists in allowed list", () => {
    const allowedRoles: AppRole[] = ["admin", "user", "content_creator", "personal_trainer", "aluno", "academy_admin"];
    
    const isValidRole = (role: string): role is AppRole => {
      return allowedRoles.includes(role as AppRole);
    };

    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("content_creator")).toBe(true);
    expect(isValidRole("academy_admin")).toBe(true);
    expect(isValidRole("super_admin")).toBe(false);
    expect(isValidRole("root")).toBe(false);
  });

  it("should map test user emails to correct roles", () => {
    const emailToRole: Record<string, AppRole> = {
      [TEST_USERS.admin]: "admin",
      [TEST_USERS.user]: "user",
      [TEST_USERS.gym]: "academy_admin",
      [TEST_USERS.personalTrainer]: "personal_trainer",
      [TEST_USERS.contentCreator]: "content_creator",
    };

    expect(emailToRole[TEST_USERS.admin]).toBe("admin");
    expect(emailToRole[TEST_USERS.user]).toBe("user");
    expect(emailToRole[TEST_USERS.gym]).toBe("academy_admin");
    expect(emailToRole[TEST_USERS.personalTrainer]).toBe("personal_trainer");
    expect(emailToRole[TEST_USERS.contentCreator]).toBe("content_creator");
  });
});

describe("Security: Content Creator Permissions", () => {
  const contentCreatorUser: User = { id: "cc-1", email: TEST_USERS.contentCreator, role: "content_creator" };
  const regularUser: User = { id: "user-1", email: TEST_USERS.user, role: "user" };
  const adminUser: User = { id: "admin-1", email: TEST_USERS.admin, role: "admin" };

  it("should allow content creators to create system content", () => {
    expect(canCreateSystemContent(contentCreatorUser.role)).toBe(true);
  });

  it("should allow admins to create system content", () => {
    expect(canCreateSystemContent(adminUser.role)).toBe(true);
  });

  it("should deny regular users from creating system content", () => {
    expect(canCreateSystemContent(regularUser.role)).toBe(false);
  });

  it("should deny personal trainers from creating system content", () => {
    expect(canCreateSystemContent("personal_trainer")).toBe(false);
  });
});

describe("Security: Academy Admin Permissions", () => {
  const academyAdminUser: User = { id: "gym-1", email: TEST_USERS.gym, role: "academy_admin" };
  const trainersInAcademy = ["trainer-1", "trainer-2"];

  it("should allow academy admin to access their trainers", () => {
    expect(canAccessResource(academyAdminUser, "trainer-1", trainersInAcademy)).toBe(true);
    expect(canAccessResource(academyAdminUser, "trainer-2", trainersInAcademy)).toBe(true);
  });

  it("should deny academy admin access to trainers not in their academy", () => {
    expect(canAccessResource(academyAdminUser, "trainer-3", trainersInAcademy)).toBe(false);
  });

  it("should allow academy admin to access their own resources", () => {
    expect(canAccessResource(academyAdminUser, "gym-1")).toBe(true);
  });
});

describe("Security: Data Isolation", () => {
  const mockProfiles: Profile[] = [
    { id: "1", user_id: "user-1", email: "user1@test.com", full_name: "User One" },
    { id: "2", user_id: "user-2", email: "user2@test.com", full_name: "User Two" },
    { id: "3", user_id: "user-3", email: "user3@test.com", full_name: "User Three" },
  ];

  it("should return only user's own profile for regular user", () => {
    const currentUserId = "user-1";
    const visibleProfiles = mockProfiles.filter(p => 
      isOwner(currentUserId, p.user_id) || isAdmin("user")
    );
    
    expect(visibleProfiles).toHaveLength(1);
    expect(visibleProfiles[0].user_id).toBe("user-1");
  });

  it("should return all profiles for admin", () => {
    const visibleProfiles = mockProfiles.filter(p => isAdmin("admin"));
    
    expect(visibleProfiles).toHaveLength(3);
  });
});

describe("Security: Personal Trainer Mode", () => {
  interface TrainerStudentLink {
    trainer_id: string;
    student_id: string;
    is_active: boolean;
  }

  const trainerLinks: TrainerStudentLink[] = [
    { trainer_id: "trainer-1", student_id: "student-1", is_active: true },
    { trainer_id: "trainer-1", student_id: "student-2", is_active: true },
    { trainer_id: "trainer-1", student_id: "student-3", is_active: false },
    { trainer_id: "trainer-2", student_id: "student-4", is_active: true },
  ];

  const getActiveStudents = (trainerId: string): string[] => {
    return trainerLinks
      .filter(link => link.trainer_id === trainerId && link.is_active)
      .map(link => link.student_id);
  };

  it("should return only active student links", () => {
    const students = getActiveStudents("trainer-1");
    
    expect(students).toHaveLength(2);
    expect(students).toContain("student-1");
    expect(students).toContain("student-2");
    expect(students).not.toContain("student-3");
  });

  it("should not mix students between trainers", () => {
    const trainer1Students = getActiveStudents("trainer-1");
    const trainer2Students = getActiveStudents("trainer-2");
    
    expect(trainer1Students).not.toContain("student-4");
    expect(trainer2Students).not.toContain("student-1");
  });

  it("should return empty array for trainer with no students", () => {
    const students = getActiveStudents("trainer-99");
    expect(students).toHaveLength(0);
  });
});
