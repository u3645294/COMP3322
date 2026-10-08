# PantryChef — Project Proposal

## 1. Member Information

| Member | Full Name | Student Number | Planned Responsibilities |
|---|---|---|---|
| 1 | Yuk Ki Ao | 3036452948 | ER Diagram + Recipe Matching + AI integration + Recipe/Tag generation |
| 2 | Li Yiting | 3036406119 | Backend: API, DB, auth, search, tests, Docker, docs |
| 3 | Ou Yang Bing | 3036393099 | Website UI/UX design |
| 4 | Esohe Osaghae | 3036718574 | Project Proposal, Backend/API: Pantry and Explore Page |

## 2. Project Title

**PantryChef**

## 3. Project Description

PantryChef is a responsive web application that helps students and busy households decide what to cook using ingredients they already have. Users manage their pantry, select cooking preferences, and receive ranked recipe suggestions showing available ingredients, missing items, and cooking instructions. The application aims to reduce food waste and the time spent choosing meals. The primary target users are students and busy households who want a convenient way to make use of ingredients already available at home.

## 4. Feature List

### Must-have

- User registration, login, and logout
- Pantry ingredient creation, viewing, editing, and deletion
- Recipe search using pantry ingredients and cooking/dietary filters
- Ingredient matching and ranking with available/missing ingredient explanations
- Recipe details and ordered cooking instructions
- Saving/removing favorite recipes
- Revisiting previous searches through history
- Responsive pages and client/server input validation
- Removing ingredients after users cook the food
- Recipe servings, difficulty, and required time

### Nice-to-have

- AI recipe generation with a catalog fallback
- Expiry reminders or expiry-aware ranking
- Shopping list for missing ingredients
- Ratings/comments or a recipe-sharing forum


## 5. Full Technology Stack

| Layer | Planned Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Responsive single-page web application and user interface |
| Backend | Node.js + Express | RESTful JSON API and application logic |
| Database | MySQL | Persistent storage for users, ingredients, pantry items, recipes, favorites, history, and preferences |
| Deployment | Linux VM + Docker Compose | Containerized deployment of the application |
| Production Web Serving | Nginx | Serve the frontend and proxy API requests |
| External Integrations | None required for core features | Optional AI integration may be added as a nice-to-have feature, with the provider to be confirmed |

## 7. Problem & Target User Context

PantryChef aims to solve the small but common problem of deciding what to cook while making use of ingredients that are already available at home. Students and busy households may have ingredients that are forgotten, underused, or close to expiring, while also spending time deciding what meals they can prepare. PantryChef helps users manage their pantry and find recipes based on the ingredients they have, while showing which ingredients are available or missing.

The primary target users are students and busy households who want a convenient way to plan meals and reduce food waste. A web-based application is a good fit because users can access it from a laptop, tablet, or phone without installing a separate application. It can also be used conveniently in the kitchen or while shopping, while allowing pantry information and saved recipes to be accessed across sessions. Websites such as Allrecipes and SuperCook provide simple references for recipe discovery and ingredient-based searching, but PantryChef focuses specifically on managing a user's pantry and providing explainable recipe matches.

## High-level Workflow Description

Login page: User can login as a guest or their personal account

![Login page](1_login.png) 

Signup page: User can sign up their account by clicking the sign up link

![Signup page](2_signup.png) 

Home page: Default home page of Pantry Chef

![Home page](3_home.png)  

My pantry: User can input their ingredient and amounts into their pantry

![My pantry](4_pantry.png)  

Load recipes: The website will suggest recipes based on users' pantry

![Load recipes](5_load.png)  

Recipe card: By clicking the name of the dish, users can see the details

![Recipe card](6_recipe.png)  

Recipe card: The image, ingredients and steps will be shown

![Recipe card](7_recipe.png)  

Explore page: Users can explore different recipes here

![Explore page](8_explore.png)  

Preferences: Users can choose their diet type and preference

![Preference](9_preference.png)  

Favourite page: By clicking on the heart button, the card will be stored as Favourites

![Favourite page](10_favourite.png)  


## 9. Anticipated Learning Challenges & Self-Assessment

One anticipated challenge is managing frontend state and asynchronous API calls, particularly when connecting multiple pages to the backend. Although the team has experience with JavaScript and web development, handling loading, success, and error states consistently may require additional practice. We plan to build the pantry and recipe-search flows early and review the implementation together.

Another anticipated learning challenge is understanding how HTML, CSS, and JavaScript work together to create a complete and interactive web application. While some team members have experience with individual aspects of web development, understanding how the HTML provides the page structure, CSS controls the appearance and layout, and JavaScript adds functionality and communicates with the backend is an area where we would like to develop more experience. We plan to build the frontend incrementally, starting with the page structure and styling before adding JavaScript functionality and connecting the pages to the backend APIs.