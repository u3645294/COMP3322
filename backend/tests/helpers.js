import request from "supertest";
import { app } from "../src/app.js";
import { database } from "../src/db/database.js";

/**
 * Wipe user-owned tables in FK-safe order.
 * Recipes and ingredients are seed data, not user data — never deleted.
 */
export async function truncateAll() {
  await database("search_results").del();
  await database("search_history").del();
  await database("favorites").del();
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
  const response = await agent.post("/api/v1/auth/register").send(payload);

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
    throw new Error("No ingredients in test DB. Run `npm run test:seed`.");
  }
  return row.id;
}

/**
 * Look up a specific ingredient by canonical name. Throws if not found.
 */
export async function findIngredientIdByName(name) {
  const row = await database("ingredients")
    .select("id")
    .where({ canonical_name: name })
    .first();
  if (!row) {
    throw new Error(
      `Ingredient not in test DB: "${name}". Run \`npm run test:seed\`.`
    );
  }
  return row.id;
}

/**
 * Look up a specific recipe by exact title. Throws if not found.
 */
export async function findRecipeIdByTitle(title) {
  const row = await database("recipes")
    .select("id")
    .where({ title })
    .first();
  if (!row) {
    throw new Error(
      `Recipe not in test DB: "${title}". Run \`npm run test:seed\`.`
    );
  }
  return row.id;
}

