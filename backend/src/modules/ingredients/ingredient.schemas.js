import { z } from "zod";

export const searchIngredientsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required.")
    .max(50, "Query must be at most 50 characters.")
});

