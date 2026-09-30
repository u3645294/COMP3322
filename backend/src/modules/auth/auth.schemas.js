import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Must be a valid email address.").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(100, "Display name must be at most 100 characters.")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Must be a valid email address.").max(255),
  password: z.string().min(1, "Password is required.").max(128)
});

