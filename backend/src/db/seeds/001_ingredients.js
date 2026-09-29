/**
 * Repeatable seed for ingredients and aliases.
 * Wipes existing rows, then re-inserts. Safe to run multiple times.
 */

const INGREDIENTS = [
  // Vegetables
  { canonicalName: "tomato", category: "Vegetables", aliases: ["tomatoes"] },
  { canonicalName: "onion", category: "Vegetables", aliases: ["onions"] },
  { canonicalName: "garlic", category: "Vegetables", aliases: [] },
  { canonicalName: "carrot", category: "Vegetables", aliases: ["carrots"] },
  { canonicalName: "potato", category: "Vegetables", aliases: ["potatoes"] },
  { canonicalName: "bell pepper", category: "Vegetables", aliases: ["capsicum", "sweet pepper"] },
  { canonicalName: "eggplant", category: "Vegetables", aliases: ["aubergine"] },
  { canonicalName: "broccoli", category: "Vegetables", aliases: [] },
  { canonicalName: "spinach", category: "Vegetables", aliases: [] },
  { canonicalName: "cucumber", category: "Vegetables", aliases: [] },
  { canonicalName: "green onion", category: "Vegetables", aliases: ["scallion", "spring onion"] },
  { canonicalName: "mushroom", category: "Vegetables", aliases: ["mushrooms"] },

  // Fruit
  { canonicalName: "apple", category: "Fruit", aliases: ["apples"] },
  { canonicalName: "banana", category: "Fruit", aliases: ["bananas"] },
  { canonicalName: "lemon", category: "Fruit", aliases: ["lemons"] },
  { canonicalName: "lime", category: "Fruit", aliases: ["limes"] },
  { canonicalName: "orange", category: "Fruit", aliases: ["oranges"] },
  { canonicalName: "strawberry", category: "Fruit", aliases: ["strawberries"] },
  { canonicalName: "avocado", category: "Fruit", aliases: ["avocados"] },

  // Protein
  { canonicalName: "chicken breast", category: "Protein", aliases: [] },
  { canonicalName: "beef", category: "Protein", aliases: [] },
  { canonicalName: "salmon", category: "Protein", aliases: [] },
  { canonicalName: "egg", category: "Protein", aliases: ["eggs"] },

  // Dairy
  { canonicalName: "milk", category: "Dairy", aliases: [] },
  { canonicalName: "butter", category: "Dairy", aliases: [] },
  { canonicalName: "cheese", category: "Dairy", aliases: [] },
  { canonicalName: "yogurt", category: "Dairy", aliases: ["yoghurt"] },

  // Grains
  { canonicalName: "rice", category: "Grains", aliases: [] },
  { canonicalName: "pasta", category: "Grains", aliases: [] },
  { canonicalName: "bread", category: "Grains", aliases: [] },
  { canonicalName: "flour", category: "Grains", aliases: [] },
  { canonicalName: "oats", category: "Grains", aliases: ["oat"] },

  // Legumes
  { canonicalName: "chickpea", category: "Legumes", aliases: ["garbanzo bean"] },
  { canonicalName: "lentil", category: "Legumes", aliases: ["lentils"] },
  { canonicalName: "black bean", category: "Legumes", aliases: ["black beans"] },
  { canonicalName: "kidney bean", category: "Legumes", aliases: ["kidney beans"] },

  // Seasoning
  { canonicalName: "salt", category: "Seasoning", aliases: [] },
  { canonicalName: "black pepper", category: "Seasoning", aliases: [] },
  { canonicalName: "coriander", category: "Seasoning", aliases: ["cilantro"] },
  { canonicalName: "cumin", category: "Seasoning", aliases: [] },
  { canonicalName: "paprika", category: "Seasoning", aliases: [] },
  { canonicalName: "basil", category: "Seasoning", aliases: [] },

  // Oil
  { canonicalName: "olive oil", category: "Oil", aliases: ["extra virgin olive oil"] },
  { canonicalName: "vegetable oil", category: "Oil", aliases: [] },
  { canonicalName: "sesame oil", category: "Oil", aliases: [] },

  // Condiments
  { canonicalName: "soy sauce", category: "Condiments", aliases: [] },
  { canonicalName: "vinegar", category: "Condiments", aliases: [] },
  { canonicalName: "honey", category: "Condiments", aliases: [] },
  { canonicalName: "ketchup", category: "Condiments", aliases: [] },
  { canonicalName: "mayonnaise", category: "Condiments", aliases: ["mayo"] }
];

export async function seed(knex) {
  // Repeatable: clear aliases first (FK), then ingredients.
  await knex("ingredient_aliases").del();
  await knex("ingredients").del();

  for (const item of INGREDIENTS) {
    const inserted = await knex("ingredients").insert({
      canonical_name: item.canonicalName,
      category: item.category
    });

    // mysql2 returns the auto-increment id as the first element of the array.
    const ingredientId = Array.isArray(inserted) ? inserted[0] : inserted;

    if (item.aliases.length > 0) {
      await knex("ingredient_aliases").insert(
        item.aliases.map((alias) => ({
          ingredient_id: ingredientId,
          alias
        }))
      );
    }
  }
}

