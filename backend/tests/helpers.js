import request from "supertest";
import { app } from "../src/app.js";
import { database } from "../src/db/database.js";

/**
 * Wipe tables in FK-safe order.
 * Only touches user-created data, never seed data.
 */
export async function truncateAll() {
  await database("user_dietary_rules").del();
  await database("pantry_items").del();
  await database("sessions").del();
  await database("users").del();
}

export function api() {
  return request(app);
}

/**
 * Register a new user and return a supertest agent that keeps the session cookie.
 * Emails are unique to avoid collisions between tests.
 */
export async function registerUser(overrides = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    email: `test-${suffix}@example.com`,
    password: "SecurePassword123!",
    displayName: "Test User",
    ...overrides
  };

  const agent = request.agent(app);
  const response = await agent
    .post("/api/v1/auth/register")
    .send(payload);

  if (response.status !== 201) {
    throw new Error(
      `registerUser failed: ${response.status} ${JSON.stringify(response.body)}`
    );
  }

  return { agent, payload };
}

/**
 * Return the id of any seeded ingredient. Used by pantry tests.
 */
export async function anyIngredientId() {
  const row = await database("ingredients").select("id").orderBy("id").first();
  if (!row) {
    throw new Error("No ingredients in test DB. Run the seed first.");
  }
  return row.id;
}

