/**
 * Unit Tests: Utils
 * 
 * Tests for utility functions.
 */
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classNames merge)", () => {
  it("should merge class names", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active");
    expect(result).toBe("base-class active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false && "hidden", null, undefined, "visible");
    expect(result).toBe("base visible");
  });

  it("should merge Tailwind classes correctly", () => {
    const result = cn("p-4", "p-8"); // Tailwind merge should keep only p-8
    expect(result).toBe("p-8");
  });

  it("should merge conflicting Tailwind classes", () => {
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toContain("class1");
    expect(result).toContain("class2");
  });

  it("should handle object syntax", () => {
    const result = cn({
      "base-class": true,
      "active-class": true,
      "disabled-class": false,
    });
    expect(result).toContain("base-class");
    expect(result).toContain("active-class");
    expect(result).not.toContain("disabled-class");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should preserve important modifier", () => {
    const result = cn("!text-red-500", "text-blue-500");
    expect(result).toContain("!text-red-500");
  });
});
