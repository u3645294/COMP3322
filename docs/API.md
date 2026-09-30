# PantryChef API Documentation

**Base URL:** `http://localhost:3000/api/v1`

All endpoints return JSON. Authenticated endpoints use cookie-based sessions.

## Authentication model

- Registration and login set an `httpOnly` cookie named `pantrychef.sid`.
- The browser (or `curl` with `-c`/`-b`) sends that cookie with every subsequent request.
- Sessions are stored in MySQL (`sessions` table) via `connect-session-knex`.
- Cookie attributes: `httpOnly`, `sameSite=lax`, `secure` in production, 7-day expiry.
- Logout destroys the session server-side and clears the cookie.

## Response envelope

**Success:**

```json
{
  "data": { ... },
  "meta": { ... }
}
```

`meta` is optional and only present on list endpoints.

**Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid values.",
    "fields": {
      "body.email": "Must be a valid email address."
    }
  }
}
```

Field keys are prefixed with the source: `body.`, `query.`, or `params.`.

## Status codes

| Status | Code | Meaning |
|---:|---|---|
| 200 | — | OK |
| 201 | — | Created |
| 204 | — | No Content |
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `AUTHENTICATION_ERROR` | Not logged in |
| 403 | `AUTHORIZATION_ERROR` | Logged in but not allowed |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate |
| 422 | `DOMAIN_RULE_ERROR` | Business rule violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Rate limits

- **Global:** 300 requests / 15 min / IP across all endpoints.
- **Login:** additional 10 attempts / 15 min / IP.

---

## Health

### GET /health

Public. Confirms the API is up and MySQL is reachable.

**Authentication:** none

**Example:**

```bash
curl -i http://localhost:3000/api/v1/health
```

**200 OK:**

```json
{
  "data": {
    "status": "ok",
    "database": "connected"
  }
}
```

---

## Auth

### POST /auth/register

Create a new account and log the user in.

**Authentication:** none

**Body:**

| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email, max 255 |
| `password` | string | 8–128 chars |
| `displayName` | string | 1–100 chars |

**201 Created:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "email": "student@example.com",
      "displayName": "Student"
    }
  }
}
```

**400 VALIDATION_ERROR** — invalid field.

**409 CONFLICT** — email already registered.

**Example:**

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"SecurePassword123!","displayName":"Student"}'
```

---

### POST /auth/login

Authenticate with email and password.

**Authentication:** none

**Rate limit:** 10 attempts / 15 min / IP.

**Body:** `{ "email": "...", "password": "..." }`

**200 OK:** same user shape as register.

**401 AUTHENTICATION_ERROR** — generic message for both unknown email and wrong password: `"Invalid email or password."`

**429 RATE_LIMITED** — too many attempts.

**Example:**

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"SecurePassword123!"}'
```

---

### POST /auth/logout

Destroy the session and clear the cookie.

**Authentication:** required

**204 No Content**

**Example:**

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/v1/auth/logout
```

---

### GET /auth/me

Return the currently authenticated user.

**Authentication:** required

**200 OK:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "email": "student@example.com",
      "displayName": "Student"
    }
  }
}
```

**401 AUTHENTICATION_ERROR** — no session or expired.

**Example:**

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/auth/me
```

---

## Ingredients

### GET /ingredients

Search canonical ingredients and their aliases.

**Authentication:** none

**Query parameters:**

| Name | Type | Rules |
|---|---|---|
| `query` | string | required, 1–50 chars |

**Ranking:** exact match first, then prefix, then partial. Alphabetical within a rank. Max 10 results.

**200 OK:**

```json
{
  "data": {
    "ingredients": [
      { "id": 379, "canonicalName": "pasta", "matchedText": "pasta" },
      { "id": 375, "canonicalName": "butter", "matchedText": "butter" }
    ]
  }
}
```

**400 VALIDATION_ERROR** — missing, empty, or over-50-char `query`.

**Example:**

```bash
curl -i "http://localhost:3000/api/v1/ingredients?query=tom"
curl -i "http://localhost:3000/api/v1/ingredients?query=scallion"
```

The second returns `green onion` with `matchedText: "scallion"`.

---

## Pantry

All pantry endpoints require authentication.

### GET /pantry-items

List the current user's pantry.

**200 OK:**

```json
{
  "data": {
    "pantryItems": [
      {
        "id": 5,
        "userId": 12,
        "ingredientId": 379,
        "quantity": 200,
        "unit": "g",
        "expiresOn": "2026-12-31",
        "createdAt": "2026-09-29T12:00:00.000Z",
        "updatedAt": "2026-09-29T12:00:00.000Z"
      }
    ]
  }
}
```

**Example:**

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/pantry-items
```

---

### POST /pantry-items

Add an ingredient to the pantry.

**Body:**

| Field | Type | Rules |
|---|---|---|
| `ingredientId` | integer | positive, must exist |
| `quantity` | number | optional, > 0 if present |
| `unit` | string | optional, one of `piece,g,kg,ml,l,tsp,tbsp,cup,can,pack` |
| `expiresOn` | string | optional, `YYYY-MM-DD`, valid calendar date |

**201 Created:** `{ "data": { "pantryItem": { ... } } }`

**400 VALIDATION_ERROR** — invalid field.

**409 CONFLICT** — ingredient already in pantry.

**422 DOMAIN_RULE_ERROR** — ingredient doesn't exist.

**Example:**

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/v1/pantry-items \
  -H "Content-Type: application/json" \
  -d '{"ingredientId":379,"quantity":200,"unit":"g","expiresOn":"2026-12-31"}'
```

---

### PATCH /pantry-items/:id

Update a pantry item. Only the fields you pass are changed.

**Path parameters:** `id`

**Body:** any of `quantity`, `unit`, `expiresOn`. At least one required. Unknown fields rejected.

**200 OK:** same shape as POST.

**400 VALIDATION_ERROR** — invalid body.

**404 NOT_FOUND** — item missing or belongs to another user.

**Example:**

```bash
curl -i -b cookies.txt -X PATCH http://localhost:3000/api/v1/pantry-items/5 \
  -H "Content-Type: application/json" \
  -d '{"quantity":500}'
```

---

### DELETE /pantry-items/:id

Remove a pantry item.

**Path parameters:** `id`

**204 No Content**

**404 NOT_FOUND** — item missing or belongs to another user.

**Example:**

```bash
curl -i -b cookies.txt -X DELETE http://localhost:3000/api/v1/pantry-items/5
```

---

## Dietary rules

### GET /dietary-rules

List the current user's dietary rules.

**200 OK:**

```json
{
  "data": {
    "rules": [
      { "id": 3, "ruleType": "allergy", "ruleValue": "peanut", "createdAt": "..." },
      { "id": 2, "ruleType": "diet", "ruleValue": "vegetarian", "createdAt": "..." }
    ]
  }
}
```

**Example:**

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/dietary-rules
```

---

### PUT /dietary-rules

Replace the entire rule set in one transaction.

**Body:**

```json
{
  "rules": [
    { "ruleType": "diet", "ruleValue": "vegetarian" },
    { "ruleType": "allergy", "ruleValue": "peanut" }
  ]
}
```

| Field | Type | Rules |
|---|---|---|
| `ruleType` | string | one of `diet`, `allergy`, `excluded_ingredient` |
| `ruleValue` | string | 1–100 chars |

Max 50 rules. Case-insensitive duplicates rejected. `{"rules":[]}` clears everything.

**200 OK:** the new rules array, ordered by `ruleType` then `ruleValue`.

**400 VALIDATION_ERROR** — invalid rule or duplicate.

**Example:**

```bash
curl -i -b cookies.txt -X PUT http://localhost:3000/api/v1/dietary-rules \
  -H "Content-Type: application/json" \
  -d '{"rules":[{"ruleType":"diet","ruleValue":"vegetarian"},{"ruleType":"allergy","ruleValue":"peanut"}]}'
```

---

## Recipes

### GET /recipes

Public paginated list, sorted alphabetically by title.

**Query parameters:**

| Name | Type | Rules |
|---|---|---|
| `limit` | integer | 1–100, default 20 |
| `offset` | integer | ≥ 0, default 0 |

**200 OK:**

```json
{
  "data": {
    "recipes": [
      {
        "id": 66,
        "title": "Avocado Toast",
        "description": "Smashed avocado on toasted bread.",
        "servings": 1,
        "prepMinutes": 5,
        "cookMinutes": 3,
        "difficulty": "easy",
        "imageUrl": null,
        "sourceUrl": null,
        "tags": ["breakfast", "quick"],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": { "count": 1, "total": 30, "limit": 20, "offset": 0 }
}
```

**400 VALIDATION_ERROR** — `limit` out of range or `offset` negative.

**Example:**

```bash
curl -i "http://localhost:3000/api/v1/recipes?limit=5&offset=0"
```

---

### GET /recipes/:id

Fetch one recipe with ingredients and steps.

**200 OK:**

```json
{
  "data": {
    "recipe": {
      "id": 66,
      "title": "Avocado Toast",
      "description": "Smashed avocado on toasted bread.",
      "servings": 1,
      "prepMinutes": 5,
      "cookMinutes": 3,
      "difficulty": "easy",
      "tags": ["breakfast", "quick"],
      "ingredients": [
        { "ingredientId": 369, "canonicalName": "avocado", "quantity": 1, "unit": "piece", "optional": false }
      ],
      "steps": [
        { "stepNumber": 1, "instruction": "Toast the bread." }
      ]
    }
  }
}
```

**400 VALIDATION_ERROR** — non-numeric id.

**404 NOT_FOUND** — no such recipe.

**Example:**

```bash
curl -i http://localhost:3000/api/v1/recipes/66
```

---

## Search

### POST /search

Match recipes against the user's pantry and dietary rules. Saves the search and returns ranked results.

**Authentication:** required

**Body:** none.

**Algorithm:**

1. Load the user's pantry and dietary rules.
2. For each recipe, compute how many required (non-optional) ingredients the user has.
3. Drop recipes with zero matched ingredients.
4. Drop recipes that violate a dietary rule:
   - `allergy` / `excluded_ingredient`: any ingredient with matching canonical name.
   - `diet: vegetarian`: recipe must carry the `vegetarian` tag.
   - `diet: vegan`: vegetarian and no `Dairy`-category ingredient or eggs.
5. Sort by coverage desc, then fewest missing, then title.
6. Persist `search_history` + `search_results` in one transaction.
7. Return up to 20 results.

**200 OK:**

```json
{
  "data": {
    "searchId": 15,
    "results": [
      {
        "rank": 1,
        "recipeId": 74,
        "title": "Garlic Butter Pasta",
        "description": "Simple weeknight pasta with garlic and butter.",
        "difficulty": "easy",
        "tags": ["italian", "quick"],
        "servings": 2,
        "prepMinutes": 5,
        "cookMinutes": 15,
        "coverage": 0.6,
        "matchedCount": 3,
        "requiredCount": 5,
        "matchedIngredients": [{ "id": 379, "canonicalName": "pasta" }],
        "missingIngredients": [{ "id": 387, "canonicalName": "salt" }]
      }
    ]
  },
  "meta": { "count": 1 }
}
```

**401 AUTHENTICATION_ERROR**

**Example:**

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/v1/search
```

---

## Search history

### GET /search-history

List the user's past searches, newest first.

**Query parameters:** `limit` (1–100, default 20), `offset` (≥ 0, default 0).

**200 OK:**

```json
{
  "data": {
    "searches": [
      { "id": 15, "createdAt": "2026-09-29T14:20:00.000Z" },
      { "id": 14, "createdAt": "2026-09-29T14:10:00.000Z" }
    ]
  },
  "meta": { "count": 2, "total": 2, "limit": 20, "offset": 0 }
}
```

**Example:**

```bash
curl -i -b cookies.txt "http://localhost:3000/api/v1/search-history?limit=10"
```

---

### GET /search-history/:id

Fetch one search with its pantry and rules snapshots and ranked results.

**Path parameters:** `id`

**200 OK:**

```json
{
  "data": {
    "search": {
      "id": 15,
      "createdAt": "2026-09-29T14:20:00.000Z",
      "pantrySnapshot": [{ "ingredientId": 379, "quantity": 200, "unit": "g" }],
      "rulesSnapshot": [{ "ruleType": "allergy", "ruleValue": "peanut" }],
      "results": [
        { "rank": 1, "recipeId": 74, "coverage": 0.6 }
      ]
    }
  }
}
```

**404 NOT_FOUND** — no such search or belongs to another user.

**Example:**

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/search-history/15
```

---

## Favorites

### GET /favorites

List favorited recipes with details.

**200 OK:**

```json
{
  "data": {
    "favorites": [
      {
        "favoriteId": 3,
        "favoritedAt": "2026-09-29T14:30:00.000Z",
        "recipeId": 66,
        "title": "Avocado Toast",
        "description": "Smashed avocado on toasted bread.",
        "servings": 1,
        "prepMinutes": 5,
        "cookMinutes": 3,
        "difficulty": "easy",
        "imageUrl": null,
        "tags": ["breakfast", "quick"]
      }
    ]
  },
  "meta": { "count": 1 }
}
```

**Example:**

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/favorites
```

---

### POST /favorites

Add a recipe to favorites. Idempotent.

**Body:** `{ "recipeId": 66 }`

**201 Created** — new favorite. **200 OK** — already favorited. Same body:

```json
{ "data": { "favorite": { "recipeId": 66 } } }
```

**400 VALIDATION_ERROR** — invalid or missing `recipeId`.

**422 DOMAIN_RULE_ERROR** — recipe doesn't exist.

**Example:**

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/v1/favorites \
  -H "Content-Type: application/json" \
  -d '{"recipeId":66}'
```

---

### DELETE /favorites/:recipeId

Remove a favorite.

**Path parameters:** `recipeId`

**204 No Content**

**404 NOT_FOUND** — not favorited or belongs to another user.

**Example:**

```bash
curl -i -b cookies.txt -X DELETE http://localhost:3000/api/v1/favorites/66
```

---

## Endpoint summary

| Method | Endpoint | Auth | Success |
|---|---|:---:|---:|
| GET | `/health` | — | 200 |
| POST | `/auth/register` | — | 201 |
| POST | `/auth/login` | — | 200 |
| POST | `/auth/logout` | ✓ | 204 |
| GET | `/auth/me` | ✓ | 200 |
| GET | `/ingredients` | — | 200 |
| GET | `/pantry-items` | ✓ | 200 |
| POST | `/pantry-items` | ✓ | 201 |
| PATCH | `/pantry-items/:id` | ✓ | 200 |
| DELETE | `/pantry-items/:id` | ✓ | 204 |
| GET | `/dietary-rules` | ✓ | 200 |
| PUT | `/dietary-rules` | ✓ | 200 |
| GET | `/recipes` | — | 200 |
| GET | `/recipes/:id` | — | 200 |
| POST | `/search` | ✓ | 200 |
| GET | `/search-history` | ✓ | 200 |
| GET | `/search-history/:id` | ✓ | 200 |
| GET | `/favorites` | ✓ | 200 |
| POST | `/favorites` | ✓ | 201 / 200 |
| DELETE | `/favorites/:recipeId` | ✓ | 204 |

## End-to-end example

Register, add pantry items, run a search, favorite the top result.

```bash
BASE=http://localhost:3000/api/v1

# Register
curl -s -c cookies.txt -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"SecurePassword123!","displayName":"Student"}'

# Add pantry items (look up IDs first via /ingredients?query=...)
curl -s -b cookies.txt -X POST $BASE/pantry-items \
  -H "Content-Type: application/json" \
  -d '{"ingredientId":379,"quantity":200,"unit":"g"}'

curl -s -b cookies.txt -X POST $BASE/pantry-items \
  -H "Content-Type: application/json" \
  -d '{"ingredientId":375,"quantity":2,"unit":"tbsp"}'

# Search
SEARCH=$(curl -s -b cookies.txt -X POST $BASE/search)
echo "$SEARCH" | python3 -m json.tool

# Favorite the top result
TOP=$(echo "$SEARCH" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['results'][0]['recipeId'])")
curl -s -b cookies.txt -X POST $BASE/favorites \
  -H "Content-Type: application/json" \
  -d "{\"recipeId\":$TOP}"

# List favorites
curl -s -b cookies.txt $BASE/favorites | python3 -m json.tool

# Logout
curl -s -b cookies.txt -X POST $BASE/auth/logout
rm -f cookies.txt
```

---

## Notes

- All requests and responses are JSON (`Content-Type: application/json`).
- `meta.total` is the total ignoring `limit`/`offset`.
- Timestamps are ISO 8601 UTC strings.
- All IDs are positive integers. Never assume they start at 1 — seed IDs advance on each reseed.
- The API is prefixed with `/api/v1`. Breaking changes will bump the version.

