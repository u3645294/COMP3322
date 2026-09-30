import bcrypt from "bcrypt";

import { ConflictError, AuthenticationError } from "../../utils/app-error.js";
import {
  findUserByEmail,
  createUser
} from "./auth.repository.js";

const BCRYPT_ROUNDS = 12;

export function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name
  };
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function register({ email, password, displayName }) {
  const normalized = normalizeEmail(email);

  const existing = await findUserByEmail(normalized);
  if (existing) {
    throw new ConflictError("Email is already registered.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const created = await createUser({
    email: normalized,
    passwordHash,
    displayName: displayName.trim()
  });

  return toSafeUser(created);
}

export async function login({ email, password }) {
  const normalized = normalizeEmail(email);

  const user = await findUserByEmail(normalized);
  const genericFailure = new AuthenticationError("Invalid email or password.");

  if (!user) {
    // Still run a bcrypt compare to keep timing similar.
    await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalid");
    throw genericFailure;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw genericFailure;
  }

  return toSafeUser(user);
}

