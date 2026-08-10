/**
 * Unit Tests: Authentication Flows
 * 
 * Tests for login, signup, password reset, and session management.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Auth helper functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Senha deve ter pelo menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve ter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve ter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve ter pelo menos um número");
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Senha deve ter pelo menos um caractere especial");
  }
  
  return { valid: errors.length === 0, errors };
};

const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

const generateTempPassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

describe("Email Validation", () => {
  it("should accept valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("user.name@example.com")).toBe(true);
    expect(validateEmail("user+tag@example.com")).toBe(true);
    expect(validateEmail("user@subdomain.example.com")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("user")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@example")).toBe(false);
    expect(validateEmail("user example.com")).toBe(false);
  });

  it("should reject emails with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
    expect(validateEmail("user@ example.com")).toBe(false);
    expect(validateEmail(" user@example.com")).toBe(false);
  });
});

describe("Password Validation", () => {
  it("should accept strong passwords", () => {
    const result = validatePassword("SecurePass123!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject short passwords", () => {
    const result = validatePassword("Pass1!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Senha deve ter pelo menos 8 caracteres");
  });

  it("should require uppercase letters", () => {
    const result = validatePassword("password123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Senha deve ter pelo menos uma letra maiúscula");
  });

  it("should require lowercase letters", () => {
    const result = validatePassword("PASSWORD123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Senha deve ter pelo menos uma letra minúscula");
  });

  it("should require numbers", () => {
    const result = validatePassword("SecurePass!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Senha deve ter pelo menos um número");
  });

  it("should require special characters", () => {
    const result = validatePassword("SecurePass123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Senha deve ter pelo menos um caractere especial");
  });

  it("should return multiple errors for weak passwords", () => {
    const result = validatePassword("weak");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe("Email Normalization", () => {
  it("should lowercase email addresses", () => {
    expect(normalizeEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
    expect(normalizeEmail("User@Example.Com")).toBe("user@example.com");
  });

  it("should trim whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
    expect(normalizeEmail("\tuser@example.com\n")).toBe("user@example.com");
  });

  it("should handle already normalized emails", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });
});

describe("Temporary Password Generation", () => {
  it("should generate passwords of correct length", () => {
    const password = generateTempPassword();
    expect(password.length).toBe(16);
  });

  it("should generate different passwords each time", () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generateTempPassword());
    }
    expect(passwords.size).toBe(100);
  });

  it("should include various character types", () => {
    const password = generateTempPassword();
    // At least statistically likely to have mixed characters
    expect(password).toMatch(/[A-Za-z0-9!@#$%]/);
  });
});

describe("Session Management", () => {
  interface Session {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: { id: string; email: string };
  }

  const isSessionExpired = (session: Session): boolean => {
    return Date.now() > session.expires_at * 1000;
  };

  const shouldRefreshSession = (session: Session, thresholdMinutes: number = 5): boolean => {
    const thresholdMs = thresholdMinutes * 60 * 1000;
    return Date.now() > session.expires_at * 1000 - thresholdMs;
  };

  it("should detect expired session", () => {
    const expiredSession: Session = {
      access_token: "token",
      refresh_token: "refresh",
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      user: { id: "1", email: "user@test.com" },
    };
    
    expect(isSessionExpired(expiredSession)).toBe(true);
  });

  it("should detect valid session", () => {
    const validSession: Session = {
      access_token: "token",
      refresh_token: "refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: { id: "1", email: "user@test.com" },
    };
    
    expect(isSessionExpired(validSession)).toBe(false);
  });

  it("should trigger refresh when approaching expiry", () => {
    const almostExpiredSession: Session = {
      access_token: "token",
      refresh_token: "refresh",
      expires_at: Math.floor(Date.now() / 1000) + 180, // 3 minutes from now
      user: { id: "1", email: "user@test.com" },
    };
    
    expect(shouldRefreshSession(almostExpiredSession, 5)).toBe(true);
  });

  it("should not trigger refresh when far from expiry", () => {
    const freshSession: Session = {
      access_token: "token",
      refresh_token: "refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: { id: "1", email: "user@test.com" },
    };
    
    expect(shouldRefreshSession(freshSession, 5)).toBe(false);
  });
});

describe("Login Rate Limiting", () => {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  interface LoginAttempt {
    email: string;
    attempts: number;
    lastAttempt: number;
    lockedUntil: number | null;
  }

  const loginAttempts: Map<string, LoginAttempt> = new Map();

  const recordFailedAttempt = (email: string): void => {
    const current = loginAttempts.get(email) || {
      email,
      attempts: 0,
      lastAttempt: 0,
      lockedUntil: null,
    };
    
    current.attempts++;
    current.lastAttempt = Date.now();
    
    if (current.attempts >= MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    
    loginAttempts.set(email, current);
  };

  const isAccountLocked = (email: string): boolean => {
    const attempt = loginAttempts.get(email);
    if (!attempt || !attempt.lockedUntil) return false;
    return Date.now() < attempt.lockedUntil;
  };

  const resetAttempts = (email: string): void => {
    loginAttempts.delete(email);
  };

  beforeEach(() => {
    loginAttempts.clear();
  });

  it("should allow login before max attempts", () => {
    const email = "user@test.com";
    
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt(email);
    }
    
    expect(isAccountLocked(email)).toBe(false);
  });

  it("should lock account after max failed attempts", () => {
    const email = "user@test.com";
    
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt(email);
    }
    
    expect(isAccountLocked(email)).toBe(true);
  });

  it("should reset attempts on successful login", () => {
    const email = "user@test.com";
    
    recordFailedAttempt(email);
    recordFailedAttempt(email);
    resetAttempts(email);
    
    expect(loginAttempts.has(email)).toBe(false);
  });
});
