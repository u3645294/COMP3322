import { describe, it, expect } from "vitest";
import { env } from "../../src/config/env.js";

describe("environment validation", () => {
  it("loads in test mode", () => {
    expect(env.NODE_ENV).toBe("test");
  });

  it("has a session secret of at least 32 characters", () => {
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("has positive integer PORT and DB_PORT", () => {
    expect(Number.isInteger(env.PORT)).toBe(true);
    expect(env.PORT).toBeGreaterThan(0);
    expect(Number.isInteger(env.DB_PORT)).toBe(true);
    expect(env.DB_PORT).toBeGreaterThan(0);
  });

  it("has a valid FRONTEND_ORIGIN URL", () => {
    expect(() => new URL(env.FRONTEND_ORIGIN)).not.toThrow();
  });

  it("uses a test database ending with _test", () => {
    expect(env.DB_TEST_NAME.endsWith("_test")).toBe(true);
  });
});

