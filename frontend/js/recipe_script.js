(async function () {
    const { state, escape, message, action, heart } = PantryUI;
    const root = document.getElementById('recipe-root');
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
        message('page-status', 'Choose a valid recipe from Explore.', true);
        return;
    }
    await state.ready;
    await action(null, 'page-status', async () => {
        const recipe = (await PantryAPI.recipe(id)).data.recipe;
        let pantry = state.user ? (await PantryAPI.pantry()).data.pantryItems : [];

        document.title = `${recipe.title} — Pantry Chef`;

        function simplePlan(recipe, pantry) {
            const required = recipe.ingredients.filter(i => !i.optional);
            const have = new Set(pantry.map(p => p.ingredientId));
            const missing = required.filter(i => !have.has(i.ingredientId));
            return {
                ready: Boolean(state.user) && missing.length === 0,
                missing,
                requiredCount: required.length
            };
        }

        function render() {
            const plan = simplePlan(recipe, pantry);

            const ingredientRows = recipe.ingredients.map(ing => {
                const has = pantry.some(p => p.ingredientId === ing.ingredientId);
                const cls = has ? 'ok' : 'missing';
                const icon = has ? '✓' : '✗';
                return `<li class="${cls}">
                    <span class="left">
                        <span class="status">${icon}</span>
                        <span class="ing-name">${escape(ing.canonicalName)}${ing.optional ? ' (optional)' : ''}</span>
                    </span>
                </li>`;
            }).join('');

            const disabled = !plan.ready;
            const note = !state.user
                ? 'Sign in to cook with your saved pantry.'
                : plan.ready
                    ? 'You have all the required ingredients.'
                    : `Missing ${plan.missing.length} of ${plan.requiredCount}: ${plan.missing.map(i => i.canonicalName).join(', ')}`;

            const heroImage = recipe.imageUrl && /^https?:\/\//.test(recipe.imageUrl)
                ? `<div class="top-banner" style="background-image:url('${escape(recipe.imageUrl)}')">
                       <div class="banner-content">
                           <h1 class="recipe-name">${escape(recipe.title)}</h1>
                           <p class="recipe-desc">${escape(recipe.description || '')}</p>
                       </div>
                   </div>`
                : '';

            root.innerHTML = `
                ${heroImage}
                <div class="page-body">
                    <a href="explore.html">← Back to recipes</a>

                    <section class="card">
                        <h1>${escape(recipe.title)}</h1>
                        ${heart(id, 'btn-primary')}
                        <p>${escape(recipe.description || '')}</p>
                        <p>
                            ${escape(recipe.difficulty || '')} ·
                            ${escape(recipe.servings ?? 'Unspecified')} servings ·
                            ${recipe.prepMinutes == null || recipe.cookMinutes == null
                                ? 'Time unspecified'
                                : `${Number(recipe.prepMinutes) + Number(recipe.cookMinutes)} minutes`}
                        </p>
                    </section>

                    <section class="card">
                        <h2>Ingredients</h2>
                        <ul class="ingredient-list">${ingredientRows}</ul>
                    </section>

                    <section class="card">
                        <h2>Recipe steps</h2>
                        <ol class="steps-list">
                            ${recipe.steps.map(step => `<li>${escape(step.instruction)}</li>`).join('')}
                        </ol>
                    </section>

                    <div class="action-bar">
                        <div>
                            <button type="button" class="btn-cook" id="cook-btn" ${disabled ? 'disabled' : ''}>
                                Cook this — remove from pantry
                            </button>
                            <p class="cook-message">${escape(note)}</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('cook-btn').addEventListener('click', event =>
                action(event.target, 'page-status', async () => {
                    pantry = (await PantryAPI.pantry()).data.pantryItems;
                    const current = simplePlan(recipe, pantry);
                    if (!current.ready) { render(); throw new Error('Missing ingredients. Add them to your pantry first.'); }

                    // Subtract recipe amounts from pantry quantities (PATCH).
                    // Delete pantry items whose quantity drops to zero or below.
                    let completed = 0;
                    try {
                        for (const ing of recipe.ingredients) {
                            if (ing.optional) continue;
                            const item = pantry.find(p => p.ingredientId === ing.ingredientId);
                            if (!item) continue;
                            const next = Number(item.quantity) - Number(ing.quantity ?? 0);
                            if (next > 0) {
                                await PantryAPI.updatePantry(item.id, { quantity: next });
                            } else {
                                await PantryAPI.removePantry(item.id);
                            }
                            completed++;
                        }
                    } catch (error) {
                        pantry = (await PantryAPI.pantry()).data.pantryItems;
                        render();
                        throw new Error(`${completed} pantry update(s) completed. ${error.message}`);
                    }

                    pantry = (await PantryAPI.pantry()).data.pantryItems;
                    render();
                    message('page-status', 'Cooked! Pantry updated.');
                })
            );
        }

        render();
        message('page-status', 'Recipe loaded.');
    });
})();