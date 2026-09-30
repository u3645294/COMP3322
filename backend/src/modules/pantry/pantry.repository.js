import { database } from "../../db/database.js";

const ITEM_COLUMNS = [
  "id",
  "user_id as userId",
  "ingredient_id as ingredientId",
  "quantity",
  "unit",
  "expires_on as expiresOn",
  "created_at as createdAt",
  "updated_at as updatedAt"
];

function normalizeItem(row) {
  if (!row) return null;

  const expiresOn =
    row.expiresOn instanceof Date
      ? row.expiresOn.toISOString().slice(0, 10)
      : row.expiresOn ?? null;

  return {
    ...row,
    quantity: row.quantity === null ? null : Number(row.quantity),
    expiresOn
  };
}

export async function listByUser(userId) {
  const rows = await database("pantry_items")
    .select(ITEM_COLUMNS)
    .where({ user_id: userId })
    .orderBy("created_at", "desc");

  return rows.map(normalizeItem);
}

export async function findById(userId, id) {
  const row = await database("pantry_items")
    .select(ITEM_COLUMNS)
    .where({ user_id: userId, id })
    .first();

  return normalizeItem(row);
}

export async function findByUserAndIngredient(userId, ingredientId) {
  const row = await database("pantry_items")
    .select(ITEM_COLUMNS)
    .where({ user_id: userId, ingredient_id: ingredientId })
    .first();

  return normalizeItem(row);
}

export async function ingredientExists(ingredientId) {
  const row = await database("ingredients")
    .select("id")
    .where({ id: ingredientId })
    .first();

  return Boolean(row);
}

export async function insertItem(userId, data) {
  const [id] = await database("pantry_items").insert({
    user_id: userId,
    ingredient_id: data.ingredientId,
    quantity: data.quantity ?? null,
    unit: data.unit ?? null,
    expires_on: data.expiresOn ?? null
  });

  return findById(userId, id);
}

export async function updateItem(userId, id, data) {
  const update = {};
  if ("quantity" in data) update.quantity = data.quantity;
  if ("unit" in data) update.unit = data.unit;
  if ("expiresOn" in data) update.expires_on = data.expiresOn;

  if (Object.keys(update).length > 0) {
    await database("pantry_items").where({ user_id: userId, id }).update(update);
  }

  return findById(userId, id);
}

export async function deleteItem(userId, id) {
  return database("pantry_items").where({ user_id: userId, id }).del();
}

