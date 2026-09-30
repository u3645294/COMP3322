import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema
} from "../../src/modules/auth/auth.schemas.js";
import { normalizeEmail } from "../../src/modules/auth/auth.service.js";

describe("registerSchema", () => {
  const valid = {
    email: "user@example.com",
    password: "SecurePassword123!",
    displayName: "Test User"
  };

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects malformed email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects empty display name", () => {
    const result = registerSchema.safeParse({ ...valid, displayName: "" });
    expect(result.success).toBe(false);
  });

  it("trims email and displayName", () => {
    const result = registerSchema.safeParse({
      ...valid,
      email: "  user@example.com  ",
      displayName: "  Test User  "
    });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe("user@example.com");
    expect(result.data.displayName).toBe("Test User");
  });
});

describe("loginSchema", () => {
  it("accepts minimal valid input", () => {
    expect(
      loginSchema.safeParse({ email: "u@example.com", password: "any" }).success
    ).toBe(true);
  });

  it("rejects empty password", () => {
    expect(
      loginSchema.safeParse({ email: "u@example.com", password: "" }).success
    ).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("USER@Example.COM")).toBe("user@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("combines both", () => {
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });
});

