(async function () {
    const { state, escape, message, action, heart } = PantryUI;
    const root = document.getElementById('recipe-root');
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) { message('page-status', 'Choose a valid recipe from Explore.', true); return; }
    await state.ready;
    await action(null, 'page-status', async () => {
        const recipe = (await PantryAPI.recipe(id)).data.recipe;
        let pantry = state.user ? (await PantryAPI.pantry()).data.pantryItems : [];
        document.title = `${recipe.title} — Pantry Chef`;
        function render() {
            const plan = PantryUI.cookingPlan(recipe, pantry);
            root.innerHTML = `<div class="page-body"><a href="explore.html">← Back to recipes</a><section class="card"><h1>${escape(recipe.title)}</h1>${heart(id, 'btn-primary')}
                <p>${escape(recipe.description)}</p><p>${escape(recipe.difficulty)} · ${escape(recipe.servings ?? 'Unspecified')} servings · ${recipe.prepMinutes == null || recipe.cookMinutes == null ? 'Time unspecified' : `${Number(recipe.prepMinutes) + Number(recipe.cookMinutes)} minutes`}</p></section>
                <section class="card"><h2>Ingredients</h2><ul class="ingredient-list">${recipe.ingredients.map(ingredient => {
                    const item = pantry.find(p => p.ingredientId === ingredient.ingredientId);
                    return `<li><span>${escape(ingredient.canonicalName)}${ingredient.optional ? ' (optional)' : ''}</span><span>${escape(ingredient.quantity ?? 'As needed')} ${escape(ingredient.unit || '')} · Pantry: ${escape(item?.quantity ?? 'unknown')} ${escape(item?.unit || '')}</span></li>`;
                }).join('')}</ul></section><section class="card"><h2>Recipe steps</h2><ol class="steps-list">${recipe.steps.map(step => `<li>${escape(step.instruction)}</li>`).join('')}</ol></section>
                <div class="action-bar"><div><button type="button" class="btn-cook" id="cook-btn" ${!state.user || !plan.ready ? 'disabled' : ''}>Cook this — remove from pantry</button>
                <p class="cook-message">${escape(!state.user ? 'Sign in to cook with your saved pantry.' : plan.reason || 'Uses the listed quantities for the full recipe; optional ingredients are kept.')}</p></div></div></div>`;
            document.getElementById('cook-btn').addEventListener('click', event => action(event.target, 'page-status', async () => {
                pantry = (await PantryAPI.pantry()).data.pantryItems;
                const current = PantryUI.cookingPlan(recipe, pantry);
                if (!current.ready) { render(); throw new Error(current.reason); }
                let completed = 0;
                try {
                    for (const change of current.changes) {
                        if (change.quantity <= 0) await PantryAPI.removePantry(change.id);
                        else await PantryAPI.updatePantry(change.id, { quantity: change.quantity });
                        completed++;
                    }
                } catch (error) {
                    pantry = (await PantryAPI.pantry()).data.pantryItems; render();
                    throw new Error(`${completed} of ${current.changes.length} pantry updates completed. ${error.message} Check your pantry before trying again.`);
                }
                pantry = (await PantryAPI.pantry()).data.pantryItems; render();
                message('page-status', 'Cooked! Required ingredient quantities removed from your pantry.');
            }));
        }
        render(); message('page-status', 'Recipe loaded.');
    });
})();
