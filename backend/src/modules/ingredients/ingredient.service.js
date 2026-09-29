import { searchIngredients } from "./ingredient.repository.js";

const MAX_RESULTS = 10;

export async function findIngredients(query) {
  const rows = await searchIngredients(query, MAX_RESULTS);
  return rows;
}

