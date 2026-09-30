import { z } from "zod";

export const SUPPORTED_UNITS = [
  "piece",
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "can",
  "pack"
];

const quantitySchema = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "string" ? Number(value) : value))
  .refine((value) => Number.isFinite(value), {
    message: "Quantity must be a number."
  })
  .refine((value) => value > 0, {
    message: "Quantity must be greater than zero."
  });

const unitSchema = z
  .string()
  .refine((value) => SUPPORTED_UNITS.includes(value), {
    message: `Unit must be one of: ${SUPPORTED_UNITS.join(", ")}.`
  });

const expiresOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry must be a YYYY-MM-DD date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Expiry must be a valid calendar date.");

export const pantryItemIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createPantryItemSchema = z.object({
  ingredientId: z.coerce.number().int().positive(),
  quantity: quantitySchema.nullable().optional(),
  unit: unitSchema.nullable().optional(),
  expiresOn: expiresOnSchema.nullable().optional()
});

export const updatePantryItemSchema = z
  .object({
    quantity: quantitySchema.nullable().optional(),
    unit: unitSchema.nullable().optional(),
    expiresOn: expiresOnSchema.nullable().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided."
  });

