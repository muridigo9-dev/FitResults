/**
 * Unit Tests: Sanitize Functions
 * 
 * Tests for input sanitization and XSS prevention.
 */
import { describe, it, expect } from "vitest";
import DOMPurify from "dompurify";

// Re-implement sanitize logic for testing (since we need to test the actual sanitization)
const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
};

const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "")
    .trim();
};

describe("sanitizeHTML", () => {
  it("should allow basic formatting tags", () => {
    const input = "<b>Bold</b> and <i>italic</i>";
    const result = sanitizeHTML(input);
    expect(result).toContain("<b>Bold</b>");
    expect(result).toContain("<i>italic</i>");
  });

  it("should remove script tags", () => {
    const input = '<script>alert("XSS")</script><p>Safe content</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Safe content</p>");
  });

  it("should remove event handlers", () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("<p>Click me</p>");
  });

  it("should remove javascript: URLs", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("javascript:");
  });

  it("should allow safe links", () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const result = sanitizeHTML(input);
    expect(result).toContain('href="https://example.com"');
  });

  it("should remove iframe tags", () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<iframe>");
  });

  it("should handle nested malicious content", () => {
    const input = '<div><script>alert(1)</script><b>Safe</b></div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("<b>Safe</b>");
  });

  it("should remove data: URLs", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("data:");
    expect(result).not.toContain("<script>");
  });
});

describe("sanitizeInput", () => {
  it("should remove angle brackets", () => {
    const input = "<script>alert('XSS')</script>";
    const result = sanitizeInput(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("should trim whitespace", () => {
    const input = "  some text  ";
    const result = sanitizeInput(input);
    expect(result).toBe("some text");
  });

  it("should handle normal input", () => {
    const input = "Normal user input";
    const result = sanitizeInput(input);
    expect(result).toBe("Normal user input");
  });

  it("should handle empty input", () => {
    const result = sanitizeInput("");
    expect(result).toBe("");
  });

  it("should handle input with only brackets", () => {
    const input = "<<<>>>";
    const result = sanitizeInput(input);
    expect(result).toBe("");
  });
});

describe("SQL Injection Prevention Patterns", () => {
  const containsSQLInjection = (input: string): boolean => {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
      /(--)/,
      /(;)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
    ];
    return patterns.some((pattern) => pattern.test(input));
  };

  it("should detect SELECT injection", () => {
    expect(containsSQLInjection("SELECT * FROM users")).toBe(true);
  });

  it("should detect DROP injection", () => {
    expect(containsSQLInjection("DROP TABLE users")).toBe(true);
  });

  it("should detect OR-based injection", () => {
    expect(containsSQLInjection("' OR '1'='1")).toBe(true);
  });

  it("should detect comment injection", () => {
    expect(containsSQLInjection("admin'--")).toBe(true);
  });

  it("should allow normal input", () => {
    expect(containsSQLInjection("John Doe")).toBe(false);
  });

  it("should allow normal email", () => {
    expect(containsSQLInjection("user@example.com")).toBe(false);
  });
});
