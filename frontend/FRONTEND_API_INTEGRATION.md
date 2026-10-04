# Frontend API integration

## Where APIs are added

| Method and route (all under `/api/v1`) | Browser function | Page / trigger | Function call location (script / handler) | Required input |
|---|---|---|---|---|
| GET `/health` | `PantryAPI.health()` | Login/signup: Check connection | [`login_script.js`](../frontend/js/login_script.js) → `#check-health` click handler | None |
| POST `/auth/register` | `PantryAPI.register(body)` | Signup: Create account | [`login_script.js`](../frontend/js/login_script.js) → `#signup-form` submit handler | Email, password, display name |
| POST `/auth/login` | `PantryAPI.login(body)` | Login: LOGIN | [`login_script.js`](../frontend/js/login_script.js) → `#login-form` submit handler | Email, password |
| GET `/auth/me` | `PantryAPI.me()` | Pantry, Explore, Recipe, Favourites, History: session initialization; navbar identity | [`ui.js`](../frontend/js/ui.js) → `state.ready` initializer | Session |
| POST `/auth/logout` | `PantryAPI.logout()` | All app pages: navbar Log out | [`navbar.js`](../frontend/js/navbar.js) → `.logout-btn` click handler | Session |
| GET `/ingredients` | `PantryAPI.ingredients(query)` | Pantry: ingredient autocomplete | [`main_script.js`](../frontend/js/main_script.js) → debounced `#ingredient-search` input handler | Nonblank query |
| GET `/pantry-items` | `PantryAPI.pantry()` | Pantry load/refresh and after add/edit/remove; Explore matcher; Recipe load/Cook | [`main_script.js`](../frontend/js/main_script.js) → `loadPantry()`; [`api.js`](../frontend/js/api.js) → `recipe_match()` when pantry is omitted; [`recipe_script.js`](../frontend/js/recipe_script.js) → page initialization and `#cook-btn` handler (before/after cooking and on partial failure) | Session |
| POST `/pantry-items` | `PantryAPI.addPantry(body)` | Pantry: Add Ingredient | [`main_script.js`](../frontend/js/main_script.js) → `#ingredient-form` submit handler (create branch) | Session, ingredient ID; UI also requires amount/unit |
| PATCH `/pantry-items/:id` | `PantryAPI.updatePantry(id, body)` | Pantry: Edit → Save changes; Recipe: Cook | [`main_script.js`](../frontend/js/main_script.js) → `#ingredient-form` submit handler (edit branch); [`recipe_script.js`](../frontend/js/recipe_script.js) → `#cook-btn` handler (remaining quantity) | Session, pantry item ID, at least one editable field |
| DELETE `/pantry-items/:id` | `PantryAPI.removePantry(id)` | Pantry: Remove; Recipe: Cook when depleted | [`main_script.js`](../frontend/js/main_script.js) → `#pantry-lists` click handler (`[data-delete]`); [`recipe_script.js`](../frontend/js/recipe_script.js) → `#cook-btn` handler (depleted item) | Session, pantry item ID |
| GET `/dietary-rules` | `PantryAPI.rules()` | Explore: load dietary preferences | [`explore_script.js`](../frontend/js/explore_script.js) → authenticated page initialization | Session |
| PUT `/dietary-rules` | `PantryAPI.replaceRules(rules)` | Explore: Save preferences | [`explore_script.js`](../frontend/js/explore_script.js) → `#save-rules` click handler | Session, rules array (may be empty) |
| GET `/recipes` | `PantryAPI.recipes(page)` | Explore: initial catalog, Browse recipes, Previous/Next | [`explore_script.js`](../frontend/js/explore_script.js) → `catalog()` | None; pagination optional |
| GET `/recipes/:id` | `PantryAPI.recipe(id)` | Recipe details; History: Reopen results | [`recipe_script.js`](../frontend/js/recipe_script.js) → page initialization; [`history_script.js`](../frontend/js/history_script.js) → `#history-container` click handler (`[data-search]`, enrich each saved result) | Recipe ID |
| POST `/search` | `PantryAPI.search()` | Explore: Search my pantry and save to History | [`explore_script.js`](../frontend/js/explore_script.js) → `#saved-search` click handler | Session; saved pantry/rules; no body |
| GET `/search-history` | `PantryAPI.history(page)` | History: page load, Previous/Next | [`history_script.js`](../frontend/js/history_script.js) → `list()` | Session; pagination optional |
| GET `/search-history/:id` | `PantryAPI.historyEntry(id)` | History: Reopen results | [`history_script.js`](../frontend/js/history_script.js) → `#history-container` click handler (`[data-search]`) | Session, search ID |
| GET `/favorites` | `PantryAPI.favorites()` | All app pages: session initialization; Favourites: page load and after heart changes | [`ui.js`](../frontend/js/ui.js) → `state.ready` initializer; [`favourites_script.js`](../frontend/js/favourites_script.js) → `load()` | Session |
| POST `/favorites` | `PantryAPI.addFavorite(recipeId)` | Pantry, Explore, Recipe, Favourites, reopened History results: heart | [`ui.js`](../frontend/js/ui.js) → `toggleFavorite()` (unsaved branch), called by delegated `[data-favorite]` click handler | Session, recipe ID |
| DELETE `/favorites/:recipeId` | `PantryAPI.removeFavorite(recipeId)` | Pantry, Explore, Recipe, Favourites, reopened History results: active heart | [`ui.js`](../frontend/js/ui.js) → `toggleFavorite()` (saved branch), called by delegated `[data-favorite]` click handler | Session, recipe ID |
| POST `/recipe-matches` | `recipe_match(client_obj, preference_list, dietary_rule_obj)` (alias: `match_recipe`) | Pantry: initial suggestions, after add/edit/remove, Refresh suggestions; Explore: Find ranked suggestions | [`main_script.js`](../frontend/js/main_script.js) → `loadMatches()`; [`explore_script.js`](../frontend/js/explore_script.js) → `#match-form` submit handler; shared HTTP implementation in [`api.js`](../frontend/js/api.js) → `recipe_match()` | Session; each supplied pantry item needs ID/name, amount, unit |

## Shared response shapes

Browser wrappers return the complete JSON response. The matcher alone unwraps `response.match`. Successful DELETE/logout return `null` in the browser (HTTP 204, no body).

```js
// User
{ id: 12, email: "student@example.com", displayName: "Student" }

// PantryItem: name/category are joined from the ingredient catalog for display.
{
  id: 5, userId: 12, ingredientId: 379, canonicalName: "pasta", category: "Grains",
  quantity: 200, unit: "g", expiresOn: "2026-12-31",
  createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z"
}

// Recipe: list/detail fields; imageUrl/sourceUrl and times may be null.
{
  id: 74, title: "Garlic Butter Pasta", description: "A quick pasta dish.",
  servings: 2, prepMinutes: 5, cookMinutes: 15, difficulty: "easy",
  imageUrl: null, sourceUrl: null, tags: ["quick", "italian"],
  createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z"
}
```

`quantity`, `unit`, and `expiresOn` can be null on pantry records; recipe ingredient quantity/unit can also be null. The UI requires an amount/unit when creating or editing pantry items. Unknown values must be filled in before SQL matching; cooking requires known recipe quantities and matching units.

Errors reject the browser promise. The client exposes `error.status`, `error.code`, and a message combining backend message/field errors. Requests time out after 15 seconds. Each page shows loading and error messages through an `aria-live` status element.

```json
{"error":{"code":"VALIDATION_ERROR","message":"Invalid input.","fields":{"body.quantity":"Quantity must be greater than zero."}}}
```

## Authentication and connection

**Header overview**

```js
await PantryAPI.health()
await PantryAPI.register({ email, password, displayName })
await PantryAPI.login({ email, password })
await PantryAPI.me()
await PantryAPI.logout()
```

**Accepted parameters / required items**

| Call | Requirements |
|---|---|
| `health()` | No arguments, no authentication |
| `register(body)` | All three fields required: valid email ≤255 chars, password 8–128 chars, trimmed display name 1–100 chars |
| `login(body)` | Valid email ≤255 chars; password 1–128 chars |
| `me()` / `logout()` | Current session required; no arguments |

**Example input shape**

```js
await PantryAPI.register({ email: "student@example.com", password: "SecurePassword123!", displayName: "Student" })
await PantryAPI.login({ email: "student@example.com", password: "SecurePassword123!" })
```

Signup confirmation is a frontend check; `confirm-password` is not sent to the backend.

**Output shape**

```js
// health: HTTP 200
{ data: { status: "ok", database: "connected" } }
// register: HTTP 201; login/me: HTTP 200
{ data: { user: { id: 12, email: "student@example.com", displayName: "Student" } } }
// logout: HTTP 204 -> null
```

**Added at:** `login_script.js` (forms/health), `ui.js` (me), `navbar.js` (identity/logout). Visitors can browse the recipe catalog/details; pantry, matching, favourites, history, and preferences need login. Navbar offers Sign in to guests.

## Ingredient lookup

**Header overview**

```js
await PantryAPI.ingredients(query)
```

**Accepted parameters:** required trimmed string, 1–50 chars. Matches canonical names and aliases; returns at most 10 results. It does not accept an empty query for listing the catalog.

**Example input / output shape**

```js
await PantryAPI.ingredients("scallion")
// HTTP 200
{ data: { ingredients: [{ id: 381, canonicalName: "green onion", matchedText: "scallion" }] } }
```

**Added at:** `main_script.js`, debounced ingredient search. Select a returned option before adding; the hidden input stores its ID. Stale autocomplete responses are ignored. Category selection was removed because this endpoint does not filter by category.

## Pantry CRUD

**Header overview**

```js
await PantryAPI.pantry()
await PantryAPI.addPantry({ ingredientId, quantity, unit, expiresOn })
await PantryAPI.updatePantry(id, { quantity, unit, expiresOn })
await PantryAPI.removePantry(id)
```

**Accepted parameters / required items**

| Field | Requirement |
|---|---|
| `id` | Positive pantry item ID, owned by the current session; different from ingredient ID |
| `ingredientId` | Required for creation; positive, existing catalog ID; one item per user/ingredient |
| `quantity` | Backend optional/null; otherwise positive number (numeric strings also accepted). UI requires it. |
| `unit` | Backend optional/null; otherwise `piece`, `g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `can`, `pack`. UI requires it. |
| `expiresOn` | Optional/null; valid `YYYY-MM-DD` calendar date. Blank UI date sends null. |

Update requires at least one of `quantity`, `unit`, `expiresOn`. `ingredientId` cannot be edited. `pcs` is not a pantry CRUD unit; use `piece`.

**Example input shape**

```js
await PantryAPI.addPantry({ ingredientId: 379, quantity: 200, unit: "g", expiresOn: "2026-12-31" })
await PantryAPI.updatePantry(5, { quantity: 150, unit: "g", expiresOn: null })
await PantryAPI.removePantry(5)
```

**Output shape**

```js
// list: HTTP 200; each PantryItem has the shared fields shown above.
{ data: { pantryItems: [{ id: 5, userId: 12, ingredientId: 379, canonicalName: "pasta", category: "Grains", quantity: 200, unit: "g", expiresOn: null, createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z" }] } }
// create: HTTP 201; update: HTTP 200
{ data: { pantryItem: { id: 5, userId: 12, ingredientId: 379, canonicalName: "pasta", category: "Grains", quantity: 150, unit: "g", expiresOn: null, createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z" } } }
// delete: HTTP 204 -> null
```

**Added at:** `main_script.js` (load/add/edit/remove/refresh; successful writes reload the pantry and refresh suggestions automatically) and `recipe_script.js` (cooking). Pantry responses now include `canonicalName` and `category` via a repository join so names survive reloads.

Cooking subtracts required ingredients for the entire recipe; optional ingredients are left alone. It re-fetches the pantry before updating, refuses expired/missing/unknown quantities or different units, and deletes depleted items. Updates use individual PATCH/DELETE requests: they are not atomic, and a failure can leave a partially updated pantry. The UI reports how many changes succeeded and reloads the pantry before a retry. No unit conversion or serving multiplier is performed.

## Dietary rules

**Header overview**

```js
await PantryAPI.rules()
await PantryAPI.replaceRules(rules) // HTTP body is { rules }
```

**Accepted parameters:** required array, 0–50 entries. Each entry requires `ruleType` (`diet`, `allergy`, `excluded_ingredient`) and trimmed `ruleValue` (1–100 chars). Case-insensitive duplicate type/value pairs are rejected. Replacement overwrites the entire saved set; `[]` clears it. Do not send response-only `id`/`createdAt` fields as rule input.

**Example input / output shape**

```js
await PantryAPI.replaceRules([
  { ruleType: "diet", ruleValue: "vegetarian" },
  { ruleType: "allergy", ruleValue: "peanut" }
])
// GET / PUT: HTTP 200
{ data: { rules: [
  { id: 3, ruleType: "allergy", ruleValue: "peanut", createdAt: "2026-10-03T10:00:00.000Z" },
  { id: 2, ruleType: "diet", ruleValue: "vegetarian", createdAt: "2026-10-03T10:00:00.000Z" }
] } }
```

**Added at:** `explore_script.js`, Dietary preferences (`explore.html#preferences`). Add/remove edits the draft; Save preferences sends PUT. Navbar Preferences links to this section.

Saved search recognizes vegetarian/vegan diets; an unknown diet is not filtered by saved search. SQL matching requires a corresponding recipe diet tag (vegan uses vegetarian plus dairy/egg exclusion). For matching ingredient exclusions consistently across both engines, use canonical ingredient names. SQL matcher additionally resolves aliases. These are catalog filters, not guarantees about recipe safety.

## Recipe catalog and details

**Header overview**

```js
await PantryAPI.recipes({ limit, offset })
await PantryAPI.recipe(id)
```

**Accepted parameters:** public. Pagination optional: limit 1–100 (default 20), offset ≥0 (default 0). Recipe ID must be positive. Lists sort by title; details include ordered steps.

**Example input / output shape**

```js
await PantryAPI.recipes({ limit: 20, offset: 0 })
// HTTP 200; full Recipe fields are defined above.
{ data: { recipes: [{ id: 74, title: "Garlic Butter Pasta", description: "A quick pasta dish.", servings: 2, prepMinutes: 5, cookMinutes: 15, difficulty: "easy", imageUrl: null, sourceUrl: null, tags: ["quick"], createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z" }] }, meta: { count: 1, total: 1, limit: 20, offset: 0 } }

await PantryAPI.recipe(74)
// HTTP 200; Recipe fields plus ingredients and steps
{ data: { recipe: {
  id: 74, title: "Garlic Butter Pasta", description: "A quick pasta dish.", servings: 2,
  prepMinutes: 5, cookMinutes: 15, difficulty: "easy", imageUrl: null, sourceUrl: null, tags: ["quick"],
  createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-03T10:00:00.000Z",
  ingredients: [{ ingredientId: 379, canonicalName: "pasta", quantity: 200, unit: "g", optional: false }],
  steps: [{ stepNumber: 1, instruction: "Cook the pasta." }]
} } }
```

**Added at:** `explore_script.js` (catalog with paging), `recipe_script.js` (`recipe.html?id=74`), `history_script.js` (resolve saved recipe IDs). Cards display real recipe links, metadata, and hearts; a placeholder appears when there is no image. Old `recipes.js` demo data is no longer loaded by pages.

## Saved pantry search

**Header overview**

```js
await PantryAPI.search()
```

**Required items:** session. No input body. Backend loads the user's saved pantry/rules; preferred tags, amounts, units, expiry, and custom ingredient lists are not accepted by this endpoint. It matches required ingredient presence, saves a snapshot/results, and returns up to 20 ranked matches. Even an empty search is saved.

**Output shape**

```js
// HTTP 200
{ data: { searchId: 15, results: [{
  rank: 1, recipeId: 74, title: "Garlic Butter Pasta", description: "A quick pasta dish.",
  difficulty: "easy", tags: ["quick"], servings: 2, prepMinutes: 5, cookMinutes: 15,
  coverage: 0.6, matchedCount: 3, requiredCount: 5,
  matchedIngredients: [{ id: 379, canonicalName: "pasta" }],
  missingIngredients: [{ id: 387, canonicalName: "salt" }]
}] }, meta: { count: 1 } }
```

**Added at:** `explore_script.js`, Search my pantry and save to History. Results show coverage/missing ingredient names and link to recipe details. Use SQL matching for amount/expiry/preference ranking.

## Search history

**Header overview**

```js
await PantryAPI.history({ limit, offset })
await PantryAPI.historyEntry(id)
```

**Required items:** session. Pagination has the same ranges/defaults as recipes; detail needs an owned positive search ID. There is no backend clear/delete-history API.

**Example input / output shape**

```js
await PantryAPI.history({ limit: 20, offset: 0 })
// HTTP 200
{ data: { searches: [{ id: 15, createdAt: "2026-10-03T10:00:00.000Z" }] }, meta: { count: 1, total: 1, limit: 20, offset: 0 } }

await PantryAPI.historyEntry(15)
// HTTP 200; snapshots contain the saved pantry/rule objects, or null if unavailable.
{ data: { search: {
  id: 15, createdAt: "2026-10-03T10:00:00.000Z",
  pantrySnapshot: [{ ingredientId: 379, quantity: 200, unit: "g" }],
  rulesSnapshot: [{ ruleType: "allergy", ruleValue: "peanut" }],
  results: [{ rank: 1, recipeId: 74, coverage: 0.6 }]
} } }
```

**Added at:** `history_script.js`, history list/paging and Reopen results. Recipe detail requests enrich saved IDs with current catalog titles. Coverage/snapshots remain historical. The old local viewed-recipe history and Clear history button were replaced because the backend only stores searches and exposes read endpoints.

## Favourites

**Header overview**

```js
await PantryAPI.favorites()
await PantryAPI.addFavorite(recipeId)
await PantryAPI.removeFavorite(recipeId)
```

**Required items:** session; positive database recipe ID for writes. Adding an existing favourite is idempotent. Deleting an unsaved recipe returns 404.

**Example input / output shape**

```js
await PantryAPI.favorites()
// HTTP 200
{ data: { favorites: [{
  favoriteId: 3, favoritedAt: "2026-10-03T10:00:00.000Z", recipeId: 74,
  title: "Garlic Butter Pasta", description: "A quick pasta dish.", servings: 2,
  prepMinutes: 5, cookMinutes: 15, difficulty: "easy", imageUrl: null, tags: ["quick"]
}] }, meta: { count: 1 } }

await PantryAPI.addFavorite(74)
// HTTP 201 (new) or HTTP 200 (existing)
{ data: { favorite: { recipeId: 74 } } }

await PantryAPI.removeFavorite(74)
// HTTP 204 -> null
```

**Added at:** `ui.js` (load session favourites and shared heart handler), `favourites_script.js` (persisted list). Hearts update after a successful server write; guests receive a sign-in message. SQL fallback uses the current favourites' recipe IDs.

## Alpha SQL recipe matcher

The existing `match_recipe()` implementation was moved out of the recipe-detail script into `api.js` so any page can use it without executing recipe-detail rendering. `recipe_match()` and `match_recipe()` are aliases of the same function.

**Header overview**

```js
await window.recipe_match(client_obj, preference_list, dietary_rule_obj)
await window.match_recipe(client_obj, preference_list, dietary_rule_obj)
```

**Accepted parameters / required items**

| Parameter | Shape / defaults |
|---|---|
| `client_obj` | Optional `{ pantry, not_allowed, liked_recipe_ids, dietary_rules }`; default `{}`. Omitted pantry loads the authenticated user's **backend pantry**, not localStorage. An explicit `[]` is kept. |
| `pantry` item | Positive integer `ingredient_id` (or `ingredientId`), or nonempty `name` ≤150 chars; positive `amount` (or `quantity`); nonblank unit ≤50 chars; optional/null `expires_on` (or `expiresOn`) date |
| `not_allowed` | `{ ingredient_ids: [], tags: [] }`, default empty |
| `liked_recipe_ids` | Database recipe IDs, default empty. Pages supply current favourites. |
| `preference_list` | Optional `{ ingredient_ids: [], tags: [] }` or mixed list such as `[379, "quick"]` |
| `dietary_rule_obj` | Optional `{ ruleType, ruleValue }` or `{ rules: [...] }`; default `client_obj.dietary_rules` or empty rules. Saved session rules always also apply. |

Each pantry/ID/tag list is limited to 100 entries; IDs must be positive safe integers; duplicate IDs/tags/pantry keys are rejected. Tags are trimmed, lowercase, 1–100 chars. Rule array limit is 50, with the dietary requirements above. Do not submit an incomplete backend pantry row: fill in its quantity/unit first.

**Example input shape**

```js
const client_obj = {
  pantry: [{ ingredient_id: 379, amount: 200, unit: "g", expires_on: "2026-12-31" }],
  not_allowed: { ingredient_ids: [387], tags: ["seafood"] },
  liked_recipe_ids: [74, 66]
};
const preference_list = { ingredient_ids: [379], tags: ["quick", "italian"] };
const dietary_rule_obj = { rules: [{ ruleType: "allergy", ruleValue: "peanut" }] };
await recipe_match(client_obj, preference_list, dietary_rule_obj);
// Equivalent preference list: [379, "quick", "italian"]
```

The HTTP body to `POST /api/v1/recipe-matches` is:

```js
{
  client_obj: { pantry: [{ ingredient_id: 379, amount: 200, unit: "g", expires_on: "2026-12-31" }], not_allowed: { ingredient_ids: [387], tags: ["seafood"] }, liked_recipe_ids: [74, 66] },
  preference_list: { ingredient_ids: [379], tags: ["quick", "italian"] },
  dietary_rules: { rules: [{ ruleType: "allergy", ruleValue: "peanut" }] }
}
```

**Return data structure**

HTTP 200 wraps these in `{ match: ... }`; the browser helper returns the inner object:

```js
// Matches found
{
  status: true,
  recipes: [{ recipeId: 74, title: "Garlic Butter Pasta",
    missingIngredients: { "375": { amount: 50, unit: "g" } },
    tags: ["suits your flavour"], recommendIndex: 95 }]
}
// No candidates; eligible existing favourites may be returned (possibly empty).
{
  status: false, recipes: [],
  likedRecipes: [{ recipeId: 66, title: "Avocado Toast" }]
}
```

**Added at:** `main_script.js` (initial suggestions, automatic refresh after add/edit/remove, and manual refresh; perfect matches in Available Dishes, others/fallback favourites in Recommended Dishes), `explore_script.js` (advanced preference/exclusion fields). Results link to `recipe.html?id=<database recipeId>`. SQL matches are not written to History; use the separate saved pantry search button for that.

## Checklist

1. Register with email, password, display name; reload and confirm navbar identity. Check connection reports Connected.
2. Search/select a catalog ingredient; add quantity/unit/expiry; reload; edit; remove. Suggestions update automatically after each successful change. If matching fails after a successful write, the pantry remains saved and stale suggestions are cleared with a retry message. Duplicate ingredients show a backend conflict message.
3. Browse catalog pages and recipe steps; hearts persist through reload and appear in Favourites.
4. Add/remove dietary draft rules, save, and reload Explore. Run both matching modes; preferred/excluded lists go only to SQL matching.
5. Run a saved pantry search, reopen it in History, and inspect snapshots/ranked recipe links.
6. Cook a recipe with sufficient quantities in matching units; verify PATCH/DELETE updates persist. Insufficient/unknown/expired ingredients disable cooking.
7. Logout; public catalog/details still work and private features request sign-in. A server/network failure produces a visible message without substituting demo data.
