/**
 * Repeatable seed for recipes, their ingredients, and their steps.
 * - Never assumes numeric IDs: looks up ingredients by canonical_name.
 * - Deletes existing recipes (and dependent rows) before re-inserting.
 * - Fails loudly if a recipe references a name that isn't in ingredients.
 */

const RECIPES = [
  {
    title: "Garlic Butter Pasta",
    description: "Simple weeknight pasta with garlic and butter.",
    servings: 2, prep: 5, cook: 15, difficulty: "easy", tags: ["italian", "quick"],
    ingredients: [["pasta", 200, "g"], ["butter", 2, "tbsp"], ["garlic", 3, "piece"], ["salt", 1, "tsp"], ["black pepper", 0.5, "tsp"]],
    steps: ["Boil water and cook pasta until al dente.", "Melt butter and add minced garlic.", "Toss pasta with garlic butter.", "Season with salt and pepper and serve."]
  },
  {
    title: "Tomato Basil Salad",
    description: "Fresh tomato salad with torn basil.",
    servings: 2, prep: 10, cook: 0, difficulty: "easy", tags: ["salad", "vegetarian"],
    ingredients: [["tomato", 3, "piece"], ["basil", 10, "piece"], ["olive oil", 2, "tbsp"], ["salt", 0.5, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Slice the tomatoes.", "Tear the basil leaves.", "Combine tomatoes and basil.", "Drizzle olive oil and season."]
  },
  {
    title: "Chicken Rice Bowl",
    description: "Pan-seared chicken over rice with soy and sesame.",
    servings: 2, prep: 10, cook: 20, difficulty: "easy", tags: ["asian", "protein"],
    ingredients: [["chicken breast", 1, "piece"], ["rice", 200, "g"], ["soy sauce", 2, "tbsp"], ["garlic", 2, "piece"], ["green onion", 2, "piece"], ["sesame oil", 1, "tsp"]],
    steps: ["Cook the rice.", "Pan-sear the chicken until golden.", "Add soy sauce and minced garlic.", "Serve over rice and top with green onion and sesame oil."]
  },
  {
    title: "Vegetable Stir Fry",
    description: "Crisp vegetables tossed in soy and sesame.",
    servings: 2, prep: 10, cook: 10, difficulty: "easy", tags: ["asian", "vegetarian", "quick"],
    ingredients: [["broccoli", 200, "g"], ["bell pepper", 1, "piece"], ["carrot", 1, "piece"], ["garlic", 2, "piece"], ["soy sauce", 2, "tbsp"], ["sesame oil", 1, "tbsp"]],
    steps: ["Chop vegetables into bite-sized pieces.", "Heat sesame oil in a wok.", "Stir fry vegetables and garlic.", "Add soy sauce and toss."]
  },
  {
    title: "Egg Fried Rice",
    description: "Classic fried rice with egg and green onion.",
    servings: 2, prep: 5, cook: 10, difficulty: "easy", tags: ["asian", "quick"],
    ingredients: [["rice", 300, "g"], ["egg", 2, "piece"], ["green onion", 2, "piece"], ["soy sauce", 1, "tbsp"], ["vegetable oil", 1, "tbsp"]],
    steps: ["Heat oil in a pan.", "Scramble the eggs and set aside.", "Add rice and soy sauce, stir fry.", "Return eggs and finish with green onion."]
  },
  {
    title: "Avocado Toast",
    description: "Smashed avocado on toasted bread.",
    servings: 1, prep: 5, cook: 3, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["bread", 2, "piece"], ["avocado", 1, "piece"], ["lemon", 0.5, "piece"], ["salt", 0.25, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Toast the bread.", "Mash avocado with lemon juice.", "Spread on toast.", "Season with salt and pepper."]
  },
  {
    title: "Beef and Broccoli",
    description: "Stir-fried beef with broccoli in soy sauce.",
    servings: 2, prep: 15, cook: 15, difficulty: "medium", tags: ["asian", "protein"],
    ingredients: [["beef", 250, "g"], ["broccoli", 200, "g"], ["soy sauce", 3, "tbsp"], ["garlic", 2, "piece"], ["sesame oil", 1, "tbsp"]],
    steps: ["Slice beef thinly.", "Stir fry beef in sesame oil.", "Add broccoli and garlic.", "Pour soy sauce and toss until glossy."]
  },
  {
    title: "Lemon Butter Salmon",
    description: "Pan-seared salmon with lemon and butter.",
    servings: 2, prep: 5, cook: 12, difficulty: "easy", tags: ["seafood", "quick"],
    ingredients: [["salmon", 2, "piece"], ["lemon", 1, "piece"], ["butter", 2, "tbsp"], ["salt", 0.5, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Season salmon with salt and pepper.", "Pan sear skin side down.", "Add butter and lemon juice.", "Baste and finish cooking."]
  },
  {
    title: "Tomato Soup",
    description: "Smooth tomato soup with basil.",
    servings: 4, prep: 10, cook: 30, difficulty: "easy", tags: ["soup", "vegetarian"],
    ingredients: [["tomato", 6, "piece"], ["onion", 1, "piece"], ["garlic", 3, "piece"], ["basil", 10, "piece"], ["olive oil", 2, "tbsp"], ["salt", 1, "tsp"]],
    steps: ["Saute onion and garlic in olive oil.", "Add chopped tomatoes.", "Simmer for 20 minutes.", "Blend smooth, add basil, season."]
  },
  {
    title: "Yogurt Berry Bowl",
    description: "Yogurt topped with strawberries and oats.",
    servings: 1, prep: 5, cook: 0, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["yogurt", 200, "g"], ["honey", 2, "tbsp"], ["strawberry", 100, "g"], ["oats", 30, "g"]],
    steps: ["Spoon yogurt into a bowl.", "Top with sliced strawberries.", "Drizzle honey.", "Sprinkle oats."]
  },
  {
    title: "Chickpea Salad",
    description: "Cool chickpea salad with cucumber and lemon.",
    servings: 2, prep: 10, cook: 0, difficulty: "easy", tags: ["salad", "vegetarian"],
    ingredients: [["chickpea", 400, "g"], ["cucumber", 1, "piece"], ["tomato", 2, "piece"], ["olive oil", 2, "tbsp"], ["lemon", 0.5, "piece"], ["salt", 0.5, "tsp"]],
    steps: ["Rinse and drain chickpeas.", "Chop cucumber and tomato.", "Combine everything.", "Dress with olive oil, lemon, salt."]
  },
  {
    title: "Lentil Soup",
    description: "Hearty lentil soup with cumin.",
    servings: 4, prep: 10, cook: 35, difficulty: "easy", tags: ["soup", "vegetarian"],
    ingredients: [["lentil", 200, "g"], ["carrot", 2, "piece"], ["onion", 1, "piece"], ["garlic", 3, "piece"], ["cumin", 1, "tsp"], ["salt", 1, "tsp"]],
    steps: ["Saute onion, carrot, garlic.", "Add cumin and lentils.", "Cover with water and simmer.", "Season and serve."]
  },
  {
    title: "Chicken Mayo Sandwich",
    description: "Simple chicken salad sandwich.",
    servings: 2, prep: 10, cook: 12, difficulty: "easy", tags: ["lunch", "quick"],
    ingredients: [["chicken breast", 1, "piece"], ["bread", 2, "piece"], ["mayonnaise", 2, "tbsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Cook and shred the chicken.", "Mix with mayonnaise and pepper.", "Pile onto bread.", "Top with second slice."]
  },
  {
    title: "Mushroom Omelette",
    description: "Fluffy omelette with sauteed mushrooms.",
    servings: 1, prep: 5, cook: 8, difficulty: "easy", tags: ["breakfast", "vegetarian"],
    ingredients: [["mushroom", 100, "g"], ["egg", 3, "piece"], ["butter", 1, "tbsp"], ["salt", 0.5, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Saute mushrooms in butter.", "Beat eggs with salt and pepper.", "Pour eggs over mushrooms.", "Fold and serve."]
  },
  {
    title: "Banana Smoothie",
    description: "Creamy banana and yogurt smoothie.",
    servings: 1, prep: 5, cook: 0, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["banana", 1, "piece"], ["milk", 200, "ml"], ["honey", 1, "tbsp"], ["yogurt", 100, "g"]],
    steps: ["Add everything to a blender.", "Blend until smooth.", "Serve chilled."]
  },
  {
    title: "Creamy Spinach Pasta",
    description: "Spinach pasta with garlic and cheese.",
    servings: 2, prep: 5, cook: 15, difficulty: "easy", tags: ["italian", "vegetarian"],
    ingredients: [["pasta", 200, "g"], ["spinach", 150, "g"], ["garlic", 2, "piece"], ["olive oil", 2, "tbsp"], ["cheese", 50, "g"]],
    steps: ["Boil pasta.", "Saute spinach and garlic in olive oil.", "Toss pasta with spinach.", "Top with grated cheese."]
  },
  {
    title: "Cucumber Vinegar Salad",
    description: "Quick pickled cucumber salad.",
    servings: 2, prep: 5, cook: 0, difficulty: "easy", tags: ["salad", "vegetarian", "quick"],
    ingredients: [["cucumber", 2, "piece"], ["vinegar", 2, "tbsp"], ["olive oil", 1, "tbsp"], ["salt", 0.5, "tsp"]],
    steps: ["Slice cucumbers thinly.", "Whisk vinegar, oil, salt.", "Toss cucumbers with dressing."]
  },
  {
    title: "Beef and Rice",
    description: "Pan-fried beef with onion over rice.",
    servings: 2, prep: 5, cook: 20, difficulty: "easy", tags: ["protein"],
    ingredients: [["beef", 250, "g"], ["rice", 200, "g"], ["onion", 1, "piece"], ["garlic", 2, "piece"], ["soy sauce", 2, "tbsp"]],
    steps: ["Cook rice.", "Brown beef in a pan.", "Add onion and garlic.", "Stir in soy sauce, serve over rice."]
  },
  {
    title: "Spinach Omelette",
    description: "Egg omelette with spinach and cheese.",
    servings: 1, prep: 5, cook: 8, difficulty: "easy", tags: ["breakfast", "vegetarian"],
    ingredients: [["spinach", 100, "g"], ["egg", 3, "piece"], ["cheese", 50, "g"], ["butter", 1, "tbsp"]],
    steps: ["Wilt spinach in butter.", "Beat eggs and pour over.", "Sprinkle cheese on top.", "Fold and serve."]
  },
  {
    title: "Simple Tomato Pasta",
    description: "Fresh tomato sauce over pasta.",
    servings: 2, prep: 5, cook: 20, difficulty: "easy", tags: ["italian", "vegetarian"],
    ingredients: [["pasta", 200, "g"], ["tomato", 4, "piece"], ["garlic", 3, "piece"], ["olive oil", 2, "tbsp"], ["basil", 10, "piece"]],
    steps: ["Boil pasta.", "Saute garlic and diced tomato in oil.", "Toss pasta with sauce.", "Finish with torn basil."]
  },
  {
    title: "Baked Salmon with Veggies",
    description: "Sheet-pan salmon and roasted vegetables.",
    servings: 2, prep: 10, cook: 20, difficulty: "easy", tags: ["seafood"],
    ingredients: [["salmon", 2, "piece"], ["broccoli", 200, "g"], ["carrot", 1, "piece"], ["olive oil", 2, "tbsp"], ["lemon", 0.5, "piece"]],
    steps: ["Preheat oven to 200C.", "Arrange salmon and vegetables on a tray.", "Drizzle oil and squeeze lemon.", "Bake for 18 minutes."]
  },
  {
    title: "Egg Salad",
    description: "Creamy egg salad with green onion.",
    servings: 2, prep: 10, cook: 10, difficulty: "easy", tags: ["lunch"],
    ingredients: [["egg", 4, "piece"], ["mayonnaise", 3, "tbsp"], ["green onion", 2, "piece"], ["salt", 0.25, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Boil eggs, cool, and chop.", "Mix with mayonnaise.", "Add chopped green onion.", "Season with salt and pepper."]
  },
  {
    title: "Honey Lemon Chicken",
    description: "Sticky honey lemon glazed chicken.",
    servings: 2, prep: 10, cook: 20, difficulty: "medium", tags: ["protein"],
    ingredients: [["chicken breast", 2, "piece"], ["honey", 3, "tbsp"], ["lemon", 1, "piece"], ["garlic", 3, "piece"], ["olive oil", 2, "tbsp"]],
    steps: ["Marinate chicken in honey, lemon, garlic.", "Heat oil in a pan.", "Sear chicken until cooked.", "Reduce marinade into a glaze and pour over."]
  },
  {
    title: "Oatmeal with Banana",
    description: "Warm oatmeal topped with banana.",
    servings: 1, prep: 2, cook: 8, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["oats", 80, "g"], ["milk", 300, "ml"], ["banana", 1, "piece"], ["honey", 1, "tbsp"]],
    steps: ["Cook oats with milk.", "Stir until creamy.", "Top with sliced banana.", "Drizzle honey."]
  },
  {
    title: "Rice and Beans",
    description: "Simple rice and black beans.",
    servings: 2, prep: 5, cook: 25, difficulty: "easy", tags: ["vegetarian"],
    ingredients: [["rice", 200, "g"], ["black bean", 400, "g"], ["onion", 1, "piece"], ["garlic", 2, "piece"], ["cumin", 1, "tsp"]],
    steps: ["Cook rice.", "Saute onion and garlic.", "Add beans and cumin.", "Simmer and serve over rice."]
  },
  {
    title: "Cucumber Yogurt Dip",
    description: "Cool cucumber yogurt dip.",
    servings: 4, prep: 10, cook: 0, difficulty: "easy", tags: ["snack", "vegetarian"],
    ingredients: [["cucumber", 1, "piece"], ["yogurt", 300, "g"], ["garlic", 2, "piece"], ["olive oil", 1, "tbsp"], ["salt", 0.5, "tsp"]],
    steps: ["Grate cucumber and squeeze dry.", "Mix with yogurt.", "Add minced garlic and oil.", "Season with salt."]
  },
  {
    title: "Strawberry Yogurt Smoothie",
    description: "Bright strawberry smoothie.",
    servings: 1, prep: 5, cook: 0, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["strawberry", 150, "g"], ["yogurt", 150, "g"], ["milk", 100, "ml"], ["honey", 1, "tbsp"]],
    steps: ["Combine all ingredients in a blender.", "Blend until smooth."]
  },
  {
    title: "Potato Hash",
    description: "Crispy potato hash with peppers.",
    servings: 3, prep: 10, cook: 20, difficulty: "easy", tags: ["breakfast"],
    ingredients: [["potato", 3, "piece"], ["onion", 1, "piece"], ["bell pepper", 1, "piece"], ["vegetable oil", 2, "tbsp"], ["salt", 0.5, "tsp"], ["paprika", 0.5, "tsp"]],
    steps: ["Dice potatoes and parboil.", "Heat oil in a pan.", "Fry potatoes with onion and pepper.", "Season with salt and paprika."]
  },
  {
    title: "Fried Egg Sandwich",
    description: "Classic fried egg sandwich.",
    servings: 1, prep: 3, cook: 5, difficulty: "easy", tags: ["breakfast", "quick"],
    ingredients: [["bread", 2, "piece"], ["egg", 2, "piece"], ["butter", 1, "tbsp"], ["salt", 0.25, "tsp"], ["black pepper", 0.25, "tsp"]],
    steps: ["Toast bread.", "Fry eggs in butter.", "Place eggs between toast.", "Season and serve."]
  },
  {
    title: "Chicken Veggie Soup",
    description: "Comforting chicken and vegetable soup.",
    servings: 4, prep: 10, cook: 30, difficulty: "easy", tags: ["soup"],
    ingredients: [["chicken breast", 1, "piece"], ["carrot", 2, "piece"], ["onion", 1, "piece"], ["garlic", 2, "piece"], ["salt", 1, "tsp"], ["black pepper", 0.5, "tsp"]],
    steps: ["Boil chicken in water.", "Add chopped carrot, onion, garlic.", "Simmer until vegetables are soft.", "Shred chicken, season, and serve."]
  }
];

export async function seed(knex) {
  // FK-safe teardown: search_results and favorites reference recipes.
  await knex("search_results").del();
  await knex("favorites").del();
  await knex("recipe_steps").del();
  await knex("recipe_ingredients").del();
  await knex("recipes").del();

  // Build a name -> id map for ingredients.
  const ingredientRows = await knex("ingredients").select("id", "canonical_name");
  const ingredientIdByName = new Map(
    ingredientRows.map((row) => [row.canonical_name.toLowerCase(), row.id])
  );

  // Fail loudly if a recipe references an unknown ingredient.
  const missing = new Set();
  for (const recipe of RECIPES) {
    for (const [name] of recipe.ingredients) {
      if (!ingredientIdByName.has(name.toLowerCase())) {
        missing.add(name);
      }
    }
  }
  if (missing.size > 0) {
    throw new Error(
      `Recipe seed references unknown ingredients: ${[...missing].join(", ")}. ` +
        `Run the ingredient seed first, or fix the names.`
    );
  }

  // Insert each recipe, its ingredients, and its steps.
  for (const recipe of RECIPES) {
    const [recipeId] = await knex("recipes").insert({
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings ?? null,
      prep_minutes: recipe.prep ?? null,
      cook_minutes: recipe.cook ?? null,
      difficulty: recipe.difficulty ?? null,
      image_url: null,
      source_url: null,
      tags: JSON.stringify(recipe.tags ?? [])
    });

    await knex("recipe_ingredients").insert(
      recipe.ingredients.map(([name, quantity, unit, optional]) => ({
        recipe_id: recipeId,
        ingredient_id: ingredientIdByName.get(name.toLowerCase()),
        quantity: quantity ?? null,
        unit: unit ?? null,
        optional: optional ?? false
      }))
    );

    await knex("recipe_steps").insert(
      recipe.steps.map((instruction, index) => ({
        recipe_id: recipeId,
        step_number: index + 1,
        instruction
      }))
    );
  }
}

