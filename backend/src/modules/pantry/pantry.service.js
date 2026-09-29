import {
  ConflictError,
  DomainRuleError,
  NotFoundError
} from "../../utils/app-error.js";

import * as pantryRepo from "./pantry.repository.js";

export async function listItems(userId) {
  return pantryRepo.listByUser(userId);
}

export async function createItem(userId, data) {
  const exists = await pantryRepo.ingredientExists(data.ingredientId);
  if (!exists) {
    throw new DomainRuleError("Ingredient does not exist.", {
      ingredientId: "Ingredient not found."
    });
  }

  const duplicate = await pantryRepo.findByUserAndIngredient(
    userId,
    data.ingredientId
  );
  if (duplicate) {
    throw new ConflictError("This ingredient is already in your pantry.");
  }

  try {
    return await pantryRepo.insertItem(userId, data);
  } catch (error) {
    // Unique constraint race: another request inserted the same ingredient.
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      throw new ConflictError("This ingredient is already in your pantry.");
    }
    throw error;
  }
}

export async function updateItem(userId, id, data) {
  const existing = await pantryRepo.findById(userId, id);
  if (!existing) {
    throw new NotFoundError("Pantry item not found.");
  }

  return pantryRepo.updateItem(userId, id, data);
}

export async function deleteItem(userId, id) {
  const deleted = await pantryRepo.deleteItem(userId, id);
  if (!deleted) {
    throw new NotFoundError("Pantry item not found.");
  }
}

