import { describe, it, expect, beforeEach } from "vitest";
import { api, registerUser, truncateAll } from "../helpers.js";
import { database } from "../../src/db/database.js";

beforeEach(truncateAll);

describe("auth integration", () => {
  it("registers a new user with 201 and safe fields", async () => {
    const response = await api().post("/api/v1/auth/register").send({
      email: "new@example.com",
      password: "SecurePassword123!",
      displayName: "New User"
    });
    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("new@example.com");
    expect(response.body.data.user.displayName).toBe("New User");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.password_hash).toBeUndefined();
  });

  it("stores a bcrypt hash, not the plain password", async () => {
    await api().post("/api/v1/auth/register").send({
      email: "hash@example.com",
      password: "SecurePassword123!",
      displayName: "User"
    });
    const row = await database("users").where({ email: "hash@example.com" }).first();
    expect(row.password_hash).not.toBe("SecurePassword123!");
    expect(row.password_hash.startsWith("$2")).toBe(true);
  });

  it("rejects duplicate email with 409", async () => {
    await registerUser({ email: "dup@example.com" });
    const response = await api().post("/api/v1/auth/register").send({
      email: "dup@example.com",
      password: "SecurePassword123!",
      displayName: "Another"
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects invalid registration with 400 and field errors", async () => {
    const response = await api().post("/api/v1/auth/register").send({
      email: "bad",
      password: "x",
      displayName: ""
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toHaveProperty("body.email");
  });

  it("logs in with correct credentials", async () => {
    await registerUser({ email: "ok@example.com", password: "SecurePassword123!" });
    const response = await api().post("/api/v1/auth/login").send({
      email: "ok@example.com",
      password: "SecurePassword123!"
    });
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("ok@example.com");
  });

  it("rejects wrong password with generic 401", async () => {
    await registerUser({ email: "wrong@example.com" });
    const response = await api().post("/api/v1/auth/login").send({
      email: "wrong@example.com",
      password: "not-the-right-one"
    });
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password.");
  });

  it("returns the same generic 401 for unknown email", async () => {
    const response = await api().post("/api/v1/auth/login").send({
      email: "nobody@example.com",
      password: "anything"
    });
    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password.");
  });

  it("requires authentication for /auth/me", async () => {
    const response = await api().get("/api/v1/auth/me");
    expect(response.status).toBe(401);
  });

  it("returns current user for /auth/me with session", async () => {
    const { agent, payload } = await registerUser();
    const response = await agent.get("/api/v1/auth/me");
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(payload.email);
  });

  it("invalidates the session on logout", async () => {
    const { agent } = await registerUser();
    const logout = await agent.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(401);
  });
});

