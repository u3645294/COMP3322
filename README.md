# PantryChef — Project Proposal & Alpha TODO

> Planning skeleton only. Unchecked items are work to complete, not claims of implemented features.
> Based on [COMP3322 Project Guideline](../COMP3322%20Project%20Guideline.pdf), especially Sections 2, 4, and 5. Existing design reference: [Architecture Plan](ARCHITECTURE_PLAN.md).

# !!! Alpha version materials must be submitted **48 hrs** before interview !!! 

## [google dock link](https://docs.google.com/document/u/0/d/1A5FribgNd7YC6cMoXIYNz_VXJqIdd8Jw2hA-Gpjb2Kg/mobilebasic)


## 1. Proposal File & Team Information

The guideline requires a `proposal/Proposal.md` file at the **team repository root**. This README is the working plan; use the sections below to prepare that submission.

- [ ] Create `proposal/Proposal.md` in that repository and complete all required proposal sections.
- [ ] Confirm project title: **PantryChef** (working title).
- [ ] Fill in all 4–5 members' full names and student numbers in the proposal.

| Member | Full name | Student number | Planned role |
|---|---|---|---|
| 1 | `Yuk Ki Ao` | `3036452948` | ER Diagram + Recipe Matching + AI integration + Recipe generation |
| 2 | `Li Yiting` | `3036406119` | Platform, Database, Authentication, and Pantry |
| 3 | `<name>` | `<number>` |  |
| 4 | `<name>` | `<number>` |  |

Roles: all frontend pages, backend APIs, DB

## 2. Project Introduction [Required Proposal Section]

**One-paragraph description draft:** PantryChef is a responsive web application that helps students and busy households decide what to cook using ingredients they already have. Users manage their pantry, select cooking preferences, and receive ranked recipe suggestions showing available ingredients, missing items, and cooking instructions. The application aims to reduce food waste and the time spent choosing meals.

- [ ] Review the paragraph with the team and confirm the target end-users.
- [ ] Explain the small real-world problem: `<difficulty choosing meals / forgotten ingredients / food waste>`.
- [ ] Explain user context: `<when users need help, their constraints, and current workaround>`.
- [ ] Explain why a web application fits: `<browser access, responsive use in the kitchen, saved pantry across sessions>`.
- [ ] Optionally include a simple similar website as a reference; deep competitive analysis is not required.

## 3. Feature List [Required Proposal Section]

Keep exactly two feature categories in the proposal. Confirm this draft before committing to the scope: **all must-have features must be complete by beta**, while alpha needs a working subset.

### Must-have — Proposed Core Scope

- [ ] Confirm registration, login, and logout.
- [ ] Confirm pantry ingredient creation, viewing, editing, and deletion.
- [ ] Confirm recipe search using pantry ingredients and cooking/dietary filters.
- [ ] Confirm ingredient matching and ranking with available/missing ingredient explanations.
- [ ] Confirm recipe details and ordered cooking instructions.
- [ ] Confirm saving/removing favorite recipes.
- [ ] Confirm revisiting previous searches through history.
- [ ] Confirm responsive pages and client/server input validation.

### Nice-to-have — Optional After All Must-haves

- [ ] AI recipe generation with a catalog fallback
- [ ] expiry reminders or expiry-aware ranking
- [ ] shopping list for missing ingredients
- [ ] additional: ratings/comments? forum for sharing recipies?

**Complexity rationale:** `<Explain how ingredient normalization, relational data, dietary filtering, and explainable recipe ranking go beyond simple CRUD.>` The guideline's complexity examples are suggestions, not mandatory checkboxes; OAuth2 is a bonus.

## 4. Full Technology Stack [Required Proposal Section]

| Layer | Planned choice | TODO / decision |
|---|---|---|
| Frontend | React + Vite; responsive SPA | Confirm routing, state and form libraries |
| Backend | Node.js + Express; RESTful JSON API | Confirm validation and session strategy |
| Database | MySQL | Confirm version, migration and seed tooling |
| Deployment | Linux VM + Docker Compose | Follow later ITS/course deployment instructions |
| Production web serving | Nginx serving frontend and proxying API | Confirm container arrangement |
| External integrations | `<none for core / named optional providers>` | List each provider, purpose, dependency and fallback |

- [ ] Confirm the complete stack in `proposal/Proposal.md`.
- [ ] Use MySQL as the only database; use Node.js + Express for the backend.
- [ ] Use a supported web SPA framework; cross-platform mobile frameworks are disallowed.
- [ ] Keep real credentials and API secrets out of Git; plan environment variables and `.env.example`.

## 5. User Workflow & Frontend Schema

### High-level User Journey [Required Proposal Section]

Describe the workflow in plain language, focused on user actions, pages, and visible responses:

1. Visitor opens the landing page and registers or signs in.
2. User opens the pantry page and adds or edits ingredients.
3. User opens discovery, chooses pantry ingredients and filters, and requests suggestions.
4. Application shows ranked recipe cards with available and missing ingredients.
5. User opens recipe details to read cooking steps and optionally saves a favorite.
6. User visits favorites or history to revisit recipes/searches.

- [ ] Confirm the typical journey and write it in the proposal.
- [ ] Optionally add a simple page-transition sketch; a hand drawing or PPT screenshot is acceptable.

### Frontend Page / Component Skeleton

| Route | Main UI / components | Planned behavior | Proposed alpha scope |
|---|---|---|---|
| `/` | Product intro, navigation | Explain purpose and entry points | Basic shell |
| `/register`, `/login` | Account forms | Show validation and session feedback | Include if alpha uses authentication |
| `/pantry` | Ingredient form, pantry list, edit/delete controls | Manage persisted pantry items | Core alpha page |
| `/discover` | Ingredient selector, filters, recipe cards | Request and display recipe matches | Basic matching |
| `/recipes/:id` | Ingredient list, missing items, steps | Show selected recipe | Core alpha page |
| `/favorites` | Saved recipe cards | View/remove favorites | Later core work |
| `/history` | Previous search list | Reopen earlier results | Later core work |

- [ ] Sketch responsive mobile and desktop layouts.
- [ ] Define reusable components and navigation/protected-route behavior.
- [ ] Define loading, empty, error and success states for alpha pages.
- [ ] Record which request each screen sends and which response fields it displays.

## 6. Database Schema

**Alpha requirement:** complete database schema implemented and wired into the backend. Complete the agreed core schema even when only some features are exposed in the alpha UI.

| Proposed table | Main fields / keys to define | Relationship / purpose |
|---|---|---|
| `users` | `id` PK, `email` unique, `password_hash`, `display_name` | Account owner |
| `ingredients` | `id` PK, `canonical_name` unique, `category` | Ingredient catalog |
| `ingredient_aliases` | `id` PK, `ingredient_id` FK, `alias` unique | Name normalization |
| `pantry_items` | `id` PK, `user_id` FK, `ingredient_id` FK, quantity, unit, expiry | User pantry |
| `recipes` | `id` PK, title, description, times, servings, difficulty | Recipe catalog |
| `recipe_ingredients` | Recipe/ingredient FKs, quantity, unit, optional flag | Recipe-to-ingredient association |
| `recipe_steps` | `id` PK, `recipe_id` FK, step number, instruction | Ordered instructions |
| `favorites` | Composite user/recipe key, created time | Saved recipes |
| `search_history` | `id` PK, `user_id` FK, filter snapshot, created time | Previous searches |
| `search_results` | Search/recipe FKs, rank, score, explanation | Stored ranked results |
| `user_dietary_rules` | `id` PK, `user_id` FK, rule type/value | User restrictions |

- [ ] Finalize an ER diagram and resolve all many-to-many relationships.
- [ ] Define data types, nullability, defaults, primary/foreign keys, unique constraints and indexes.
- [ ] Define how dietary/allergen/cuisine metadata is stored for recipe filtering.
- [ ] Define supported units and ingredient aliases; confirm quantity/expiry rules.
- [ ] Define delete behavior and ownership constraints.
- [ ] Plan migrations and seed data for demo accounts, ingredients and recipes.
- [ ] Plan persistent MySQL configuration and backend connection settings.

## 7. Backend Schema / API Skeleton

**Planned module structure:** `route → controller → service → repository → MySQL`.
**Planned modules:** authentication, pantry, ingredient catalog, recipes/matching, favorites, history and dietary preferences.

All routes below use the proposed `/api/v1` prefix.

| Module | Proposed endpoints | Main responsibility |
|---|---|---|
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me` | Account and session handling |
| Ingredients | `GET /ingredients?query=` | Catalog lookup/autocomplete |
| Pantry | `GET/POST /pantry-items`; `PATCH/DELETE /pantry-items/:id` | User pantry CRUD |
| Recipe search | `POST /recipe-searches`; `GET /recipes/:id` | Matching/ranking and recipe details |
| Favorites | `GET/POST /favorites`; `DELETE /favorites/:recipeId` | Save/remove recipes |
| History | `GET /search-history`; `GET /search-history/:id` | Retrieve earlier searches |
| Preferences | `GET/PUT /dietary-rules` | Store and retrieve restrictions |

- [ ] Specify request/response fields for each alpha endpoint.
- [ ] Define correct success/error HTTP status codes, including `200`, `201`, `400`, `401`, `403`, `404`, and `500` where appropriate.
- [ ] Define a consistent JSON error shape and validation behavior.
- [ ] Define authentication, authorization and per-user ownership checks.
- [ ] Define matching inputs, ranking rules and missing-ingredient output.
- [ ] Plan parameterized database queries, password hashing and secret configuration.
- [ ] Build the API skeleton and connect a subset of core features end-to-end for alpha.

## 8. Anticipated Learning Challenges & Self-assessment [Required Proposal Section]

Choose **2–3 realistic challenges** reflecting the team's actual experience. Replace these examples after discussion.

| Anticipated challenge | Current experience / gap | Practical plan |
|---|---|---|
| React state and asynchronous API calls | `<team experience>` | Build one pantry form/list flow together and review loading/error behavior |
| Express and relational MySQL design | `<team experience>` | Agree on one API contract, implement its query, and trace the request together |
| Docker Compose and Linux deployment | `<team experience>` | Run a small frontend/API/MySQL setup early and record reproducible setup steps |

- [ ] Confirm 2–3 challenges and one practical response to each in the proposal.

## 9. Alpha Delivery & Interview Checklist

- [ ] Complete `proposal/Proposal.md`, including every required section above.
- [ ] Implement the complete core database schema and connect it to the backend.
- [ ] Build the REST API skeleton.
- [ ] Complete a working subset of core features across frontend ↔ backend ↔ MySQL.
- [ ] Provide corresponding frontend pages for every implemented alpha feature.
- [ ] Commit and push all alpha source code to the team GitHub repository.
- [ ] Tag the alpha version; record the chosen tag and commit: `<tag / SHA>`.
- [ ] Rehearse the demo and prepare every member to answer questions about features and code.

**Suggested alpha demo:** sign in (if included) → add a pantry ingredient → refresh to show persistence → request basic matches → open a recipe and explain its ingredients/steps.

**Interview grading note:** absence/failure to book, an unsatisfactory explanation, or no Moodle submission can incur up to a 5% deduction per version from the project mark. Interview deductions are individual; missing submission applies to the whole group.

## 10. Later Milestones & Other Course Requirements

These are future planning reminders; they are not all alpha deliverables.

- [ ] **Beta:** complete every must-have feature; add basic client/server validation and fix major critical bugs; push/tag source; submit ZIP before interview. Deployment requirements may be updated after ITS setup.
- [ ] **Deployment:** commit Dockerfiles, `docker-compose.yml`, and detailed README deployment instructions; ensure an examiner can deploy successfully on the Linux VM.
- [ ] **Final:** polish core features, fix remaining bugs, maintain stable publicly accessible deployment, and include the public URL in the README.
- [ ] **Final documentation:** place a PDF at repository root covering title, description, feature list, allocation, architecture, ER diagram, API documentation and supporting materials.
- [ ] Keep final deployed code identical to the submitted GitHub source; assessment uses the production environment.
- [ ] Cite borrowed UI components/code snippets on an in-app credits page and follow course rules on AI use and team-authored code.
- [ ] Do not reuse code from outside this course or other work/courses; each member is responsible for committed work.
- [ ] Prepare the final presentation off script, using slides as visual prompts rather than full-sentence scripts.

## 11. Decisions to Resolve Before Finalizing the Proposal

- [ ] Confirm team members, role assignments, repository root and GitHub URL.
- [ ] Freeze must-have scope and select the alpha feature subset.
- [ ] Confirm authentication, dietary metadata and recipe seed-data source.
- [ ] Confirm any third-party integrations and acknowledge/cite their sources.
- [ ] Set internal deadlines: proposal `<date>`, schema/API `<date>`, integration `<date>`, rehearsal/submission `<date>`.
- [ ] Review this plan against the latest Moodle/course updates before submission.
