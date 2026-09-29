import { database } from "../../db/database.js";

const USER_COLUMNS = [
  "id",
  "email",
  "password_hash",
  "display_name",
  "created_at",
  "updated_at"
];

export async function findUserByEmail(email) {
  return database("users").select(USER_COLUMNS).where({ email }).first();
}

export async function findUserById(id) {
  return database("users").select(USER_COLUMNS).where({ id }).first();
}

export async function createUser({ email, passwordHash, displayName }) {
  const [id] = await database("users").insert({
    email,
    password_hash: passwordHash,
    display_name: displayName
  });

  return findUserById(id);
}

