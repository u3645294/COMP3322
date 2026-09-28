# PantryChef API and module contracts (proposed v1)

This is the shared implementation contract for the four-person team, **assuming the database and application features still need to be built**. The `Demo_Project` starter is reference code only; its existing read routes must be aligned with this contract when integrated. Agree on changes here before changing callers and implementations.

## 1. Conventions

- Base path: `/api/v1`; JSON request and response bodies. Health check remains `GET /api/health`.
- JSON keys use `snake_case`, matching the MySQL column names. IDs are positive JSON integers; keep them within JavaScript's safe integer range. Times are UTC ISO 8601 strings; `expires_on` is `YYYY-MM-DD`.
- Authentication uses a server-side session and an `HttpOnly`, `SameSite=Lax` cookie named `pantrychef_session`. Set `Secure` in HTTPS deployment. The browser sends it with `credentials: 'include'`; no session token appears in JSON or local storage.
- Check the `Origin` header against the application origin on authenticated write requests to prevent cross-site form submissions.
- All user-owned queries take `user_id` from the authenticated session, never from request JSON. A missing session returns `401`; another user's resource returns `404` so its existence is not disclosed.
- List responses use named arrays. Successful `DELETE` and logout return `204` with no body. Unknown JSON fields should be rejected with `400` so client mistakes are visible.
- Error response for all `/api/v1` routes:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid values.",
    "fields": { "quantity": "Must be greater than zero." }
  }
}
```

`fields` may be omitted. Use `400` for invalid syntax or fields, `401` for no session or invalid credentials, `404` for missing or unowned records, `409` for duplicates, `422` for valid input that cannot be applied, `503` when MySQL is unavailable, and `500` for unexpected failures. Never include SQL, password hashes, or stack traces in responses.

## 2. Shared JSON shapes

| Shape | Fields |
|---|---|
| `User` | `id: integer`, `email: string`, `display_name: string` |
| `Ingredient` | `id: integer`, `canonical_name: string`, `category: string` |
| `PantryItem` | `id: integer`, `ingredient: Ingredient`, `quantity: number > 0`, `unit: string`, `expires_on: string \| null` |
| `RecipeCard` | `id: integer`, `title: string`, `prep_minutes: integer`, `cook_minutes: integer`, `servings: integer`, `difficulty: "easy" \| "medium" \| "hard"` |
| `RecipeIngredient` | `ingredient: Ingredient`, `quantity: number > 0`, `unit: string`, `optional: boolean`, `preparation_note: string \| null` |
| `RecipeDetail` | `RecipeCard` fields plus `slug`, `description`, `ingredients: RecipeIngredient[]`, `steps: {step_number, instruction}[]`, `tags: {tag_type, tag_value}[]` |
| `Match` | `recipe: RecipeCard`, `score: number`, `available_ingredients: Ingredient[]`, `missing_required: Ingredient[]`, `missing_optional: Ingredient[]` |

Recipe detail `steps` are ordered by `step_number`. Search results are ordered by `rank_position`, then `recipe.id` to break score ties. A `Match` explains ingredient presence; quantity and unit comparison can be added later without silently changing what “available” means.

## 3. HTTP API

### Authentication and catalog

| Method and path | Request parameters/body | Success | Errors |
|---|---|---|---|
| `POST /auth/register` | `{email, password, display_name}`; email normalized to lowercase; password 8–128 characters; display name 1–100 characters | `201 {user: User}` and session cookie | `400`, `409` duplicate email |
| `POST /auth/login` | `{email, password}` | `200 {user: User}` and session cookie | `400`, `401` invalid credentials |
| `POST /auth/logout` | Session cookie | `204`, session deleted and cookie cleared | `401` |
| `GET /auth/me` | Session cookie | `200 {user: User}` | `401` |
| `GET /ingredients?query=` | Optional text query, at most 120 characters; blank lists first 50 alphabetically | `200 {ingredients: Ingredient[]}` | `400` |

### Pantry

All pantry routes require authentication. `unit` must be one of the agreed supported units in the seed/catalog plan; the API must reject unrecognized units. `expires_on` is optional and may be `null`.

| Method and path | Request parameters/body | Success | Errors |
|---|---|---|---|
| `GET /pantry-items` | None | `200 {items: PantryItem[]}` ordered by ingredient name | `401` |
| `POST /pantry-items` | `{ingredient_id: integer, quantity: number > 0, unit: string, expires_on?: date \| null}` | `201 {item: PantryItem}` | `400`, `401`, `404` unknown ingredient, `409` duplicate ingredient |
| `PATCH /pantry-items/:id` | At least one of `{quantity, unit, expires_on}`; `id` is a positive integer | `200 {item: PantryItem}` | `400`, `401`, `404` |
| `DELETE /pantry-items/:id` | Positive integer `id` | `204` | `400`, `401`, `404` |

### Recipes and search

`GET /recipes/:id` is public and returns only published recipes. Search requires authentication. If `ingredient_ids` is omitted, search uses all current pantry ingredients. If supplied, it must be a nonempty, unique array of ingredient IDs that are currently in the user's pantry; an empty resolved set returns `400`. This prevents searching another user's pantry through supplied IDs.

| Method and path | Request parameters/body | Success | Errors |
|---|---|---|---|
| `GET /recipes/:id` | Positive integer recipe ID | `200 {recipe: RecipeDetail}` | `400`, `404` |
| `POST /recipe-searches` | `{ingredient_ids?: integer[], filters?: {max_total_minutes?: integer > 0, cuisine?: string, diet?: string, exclude_allergens?: string[]}}` | `201 {search_id: integer, results: SearchResult[]}` | `400`, `401`, `422` unsupported filter |

`SearchResult` is `{rank_position: integer, ...Match}`. Ranking uses ingredient IDs after alias normalization, excludes recipes that violate saved dietary rules or `exclude_allergens`, and returns stable scores for the same inputs. The first version may score ingredient coverage and missing required ingredients only; document the exact formula before implementation. Persist the filters, ranked recipe IDs, scores, and explanation in one database transaction.

Example search response:

```json
{
  "search_id": 42,
  "results": [
    {
      "rank_position": 1,
      "recipe": {"id": 7, "title": "Tomato Pasta", "prep_minutes": 10, "cook_minutes": 15, "servings": 2, "difficulty": "easy"},
      "score": 85,
      "available_ingredients": [{"id": 1, "canonical_name": "tomato", "category": "vegetable"}],
      "missing_required": [{"id": 2, "canonical_name": "pasta", "category": "grain"}],
      "missing_optional": []
    }
  ]
}
```

### Favorites, history, and dietary preferences (beta core)

All routes in this section require authentication.

| Method and path | Request parameters/body | Success | Errors |
|---|---|---|---|
| `GET /favorites` | None | `200 {recipes: RecipeCard[]}` newest save first | `401` |
| `POST /favorites` | `{recipe_id: integer}` | `201 {recipe: RecipeCard}` | `400`, `401`, `404`, `409` already saved |
| `DELETE /favorites/:recipeId` | Positive integer recipe ID | `204` | `400`, `401`, `404` |
| `GET /search-history` | `limit?: integer 1..50`, `before_id?: positive integer`; default limit 20 | `200 {searches: {id, filters, created_at}[], next_before_id: integer \| null}` | `400`, `401` |
| `GET /search-history/:id` | Positive integer search ID | `200 {search_id, filters, created_at, results: SearchResult[]}` | `400`, `401`, `404` |
| `GET /dietary-rules` | None | `200 {rules: DietaryRule[]}` | `401` |
| `PUT /dietary-rules` | `{rules: DietaryRuleInput[]}`; replaces all rules atomically | `200 {rules: DietaryRule[]}` | `400`, `401`, `422` unsupported value |

`DietaryRuleInput` is `{rule_type: "diet" | "allergy" | "avoid_ingredient", rule_value: string}`. `DietaryRule` adds `id`. Allowed diet, allergen, cuisine, and unit values need one shared enumerated list before the filter UI is wired up. The database owner maintains that list with the seed data and the backend owner validates against it.

## 4. Internal module interfaces

These are proposed JavaScript module boundaries. Each exported async function returns a promise and throws an application error with `{code, status, fields?}` on expected failures. Controllers convert errors to the HTTP shape above. Repositories return plain data objects and never write HTTP responses. All repository functions accept a `db` argument first: the MySQL pool for ordinary reads/writes or a transaction connection for atomic operations. SQL uses placeholders, never string interpolation of user input.

```js
// backend/services/auth.js — owner: backend/auth
register({ email, password, display_name })
  -> Promise<{ user, session_token, expires_at }>
login({ email, password })
  -> Promise<{ user, session_token, expires_at }>
getSessionUser({ session_token })
  -> Promise<User | null>
logout({ session_token })
  -> Promise<void>

// backend/middleware/auth.js — owner: backend/auth
requireAuth(req, res, next) // sets req.auth = { user_id } or sends 401

// backend/services/pantry.js — owner: backend API
listPantry({ user_id }) -> Promise<PantryItem[]>
addPantryItem({ user_id, ingredient_id, quantity, unit, expires_on }) -> Promise<PantryItem>
updatePantryItem({ user_id, item_id, changes: { quantity?, unit?, expires_on? } }) -> Promise<PantryItem>
removePantryItem({ user_id, item_id }) -> Promise<void>

// backend/services/search.js — owner: matching
createRecipeSearch({ user_id, ingredient_ids?, filters })
  -> Promise<{ search_id, results: SearchResult[] }>
rankRecipes({ ingredient_ids, filters, dietary_rules, candidates })
  -> SearchResult[] // pure function; no HTTP or SQL

// backend/services/recipes.js — owner: backend API
getRecipeDetail({ recipe_id }) -> Promise<RecipeDetail>

// backend/services/favorites.js — owner: backend API
listFavorites({ user_id }) -> Promise<RecipeCard[]>
addFavorite({ user_id, recipe_id }) -> Promise<RecipeCard>
removeFavorite({ user_id, recipe_id }) -> Promise<void>

// backend/services/history.js — owner: matching
listHistory({ user_id, limit, before_id })
  -> Promise<{ searches, next_before_id }>
getHistoryEntry({ user_id, search_id }) -> Promise<SearchWithResults>

// backend/services/dietary-rules.js — owner: backend API
getDietaryRules({ user_id }) -> Promise<DietaryRule[]>
setDietaryRules({ user_id, rules }) -> Promise<DietaryRule[]>
```

The auth service creates a cryptographically random opaque token, stores only its SHA-256 hash in `sessions.token_hash`, and returns the raw token only to the controller to set the cookie. Password hashing and verification stay inside auth. `requireAuth` calls `getSessionUser`; it never trusts a user ID in a header or body.

```js
// backend/db/repositories/users.js — owner: database
findUserByEmail(db, { email }) -> Promise<UserWithPasswordHash | null>
findUserById(db, { user_id }) -> Promise<User | null>
insertUser(db, { email, password_hash, display_name }) -> Promise<User>

// backend/db/repositories/sessions.js — owner: database
insertSession(db, { token_hash, user_id, expires_at }) -> Promise<void>
findActiveSession(db, { token_hash, now }) -> Promise<{ user_id } | null>
deleteSession(db, { token_hash }) -> Promise<void>

// backend/db/repositories/ingredients.js — owner: database
listIngredients(db, { query, limit }) -> Promise<Ingredient[]>
findIngredientById(db, { ingredient_id }) -> Promise<Ingredient | null>

// backend/db/repositories/pantry.js — owner: database
listPantryItems(db, { user_id }) -> Promise<PantryItem[]>
insertPantryItem(db, { user_id, ingredient_id, quantity, unit, expires_on }) -> Promise<PantryItem>
updatePantryItem(db, { user_id, item_id, changes }) -> Promise<PantryItem | null>
deletePantryItem(db, { user_id, item_id }) -> Promise<boolean>

// backend/db/repositories/recipes.js — owner: database
findPublishedRecipeById(db, { recipe_id }) -> Promise<RecipeDetail | null>
listPublishedRecipeCandidates(db, { filters }) -> Promise<RecipeCandidate[]>

// backend/db/repositories/searches.js — owner: database
insertSearch(db, { user_id, filters }) -> Promise<{ search_id }>
insertSearchResults(db, { search_id, results }) -> Promise<void>
listSearchHistory(db, { user_id, limit, before_id }) -> Promise<{ searches, next_before_id }>
findSearchWithResults(db, { user_id, search_id }) -> Promise<SearchWithResults | null>

// backend/db/repositories/favorites.js — owner: database
listFavorites(db, { user_id }) -> Promise<RecipeCard[]>
insertFavorite(db, { user_id, recipe_id }) -> Promise<RecipeCard>
deleteFavorite(db, { user_id, recipe_id }) -> Promise<boolean>

// backend/db/repositories/dietary-rules.js — owner: database
listDietaryRules(db, { user_id }) -> Promise<DietaryRule[]>
replaceDietaryRules(db, { user_id, rules }) -> Promise<DietaryRule[]>
```

`UserWithPasswordHash` is internal only and must never be serialized. `RecipeCandidate` contains a `RecipeCard`, all required/optional ingredient IDs, and tags needed by `rankRecipes`. `SearchWithResults` has exactly the fields of `GET /search-history/:id`. `insertSearch` and `insertSearchResults` must use the same transaction connection; `replaceDietaryRules` must also be atomic. Repository `update`/`delete` functions include `user_id` in their SQL predicate.

## 5. Team handoff and acceptance

| Interface | Producer | Consumer | First agreed artifact |
|---|---|---|---|
| HTTP JSON shapes | Backend/auth and matching owners | Frontend owner | This document plus one sample JSON response per alpha page |
| Database schema and repository functions | Database owner | Backend/auth and matching owners | Migration, seed data, repository exports |
| Session and `req.auth` | Backend/auth owner | All protected route owners | Register/login/logout/me and middleware |
| Recipe candidate and ranking inputs | Database owner | Matching owner | Seed recipes, `RecipeCandidate` shape, filtering tags |
| End-to-end alpha flow | All four | All four | Register → add pantry item → search → open recipe |

Before merging an endpoint, verify the documented status code and response shape, empty/error behavior, and user ownership. Any contract change should update this file and both sides of the affected interface in the same pull request.
