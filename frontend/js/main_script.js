(async function () {
    const { escape, message, action, cards, requireUser, state } = PantryUI;
    const form = document.getElementById('ingredient-form');
    const search = document.getElementById('ingredient-search');
    const options = document.getElementById('ingredient-options');
    const selected = document.getElementById('ingredient-name');
    const submit = form.querySelector('[type="submit"]');
    const cancel = document.getElementById('cancel-edit');
    let pantry = [], editing = null, queryVersion = 0, timer;
    function reset() {
        editing = null; form.reset(); selected.value = '';
        ++queryVersion; clearTimeout(timer); options.classList.add('hidden');
        submit.textContent = 'Add Ingredient'; cancel.hidden = true;
    }
    cancel.addEventListener('click', reset);
    search.addEventListener('input', () => {
        selected.value = ''; clearTimeout(timer);
        const version = ++queryVersion;
        options.innerHTML = ''; options.classList.add('hidden');
        if (!search.value.trim()) return;
        timer = setTimeout(async () => {
            try {
                const result = await PantryAPI.ingredients(search.value.trim());
                if (version !== queryVersion) return;
                options.innerHTML = result.data.ingredients.length ? result.data.ingredients.map(item =>
                    `<li><button type="button" data-ingredient="${item.id}" data-name="${escape(item.canonicalName)}">${escape(item.canonicalName)} (#${item.id})${item.matchedText !== item.canonicalName ? ` (${escape(item.matchedText)})` : ''}</button></li>`
                ).join('') : '<li>No ingredients found.</li>';
                options.classList.remove('hidden');
            } catch (error) { if (version === queryVersion) message('page-status', error.message, true); }
        }, 250);
    });
    options.addEventListener('click', event => {
        const button = event.target.closest('[data-ingredient]');
        if (!button) return;
        selected.value = button.dataset.ingredient;
        search.value = button.dataset.name;
        ++queryVersion; clearTimeout(timer); options.classList.add('hidden');
    });
    async function loadPantry() {
        pantry = (await PantryAPI.pantry()).data.pantryItems;
        document.getElementById('pantry-lists').innerHTML = pantry.length ? `<ul class="pantry-list">${pantry.map(item =>
            `<li class="pantry-item"><div class="info"><span class="name">${escape(item.canonicalName || `Ingredient #${item.ingredientId}`)} (#${item.ingredientId})</span>
            <span class="amount">${escape(item.quantity ?? 'Amount unknown')} ${escape(item.unit || '')}${item.expiresOn ? ` · expires ${escape(item.expiresOn)}` : ''}</span></div>
            <div class="remove-controls"><button type="button" data-edit="${item.id}" aria-label="Edit ${escape(item.canonicalName)}">Edit</button>
            <button type="button" data-delete="${item.id}" aria-label="Remove ${escape(item.canonicalName)}">Remove</button></div></li>`
        ).join('')}</ul>` : '<p>Your pantry is empty. Add an ingredient above.</p>';
    }
    async function loadMatches() {
        const match = await recipe_match({ pantry, liked_recipe_ids: [...state.favorites] });
        const recipes = match.status ? match.recipes : match.likedRecipes;
        const note = recipe => {
            if (!match.status) return 'A saved favourite to try.';
            const missing = Object.entries(recipe.missingIngredients).map(([id, item]) => {
                const name = pantry.find(p => p.ingredientId === Number(id))?.canonicalName || `Ingredient #${id}`;
                return `${name}: ${item.amount ?? 'unspecified amount'} ${item.unit || ''}`;
            });
            return `Score ${recipe.recommendIndex} · ${recipe.tags.join(', ')}${missing.length ? ` · Missing: ${missing.join('; ')}` : ''}`;
        };
        cards(document.getElementById('dishes-container'), match.status ? recipes.filter(recipe => recipe.tags.includes('perfect match')) : [], note);
        cards(document.getElementById('recommended-dishes-container'), match.status ? recipes.filter(recipe => !recipe.tags.includes('perfect match')) : recipes, note);
    }
    async function refreshAfterChange(successMessage) {
        try {
            await loadPantry();
            await loadMatches();
            message('page-status', `${successMessage} Suggestions updated.`);
        } catch (error) {
            for (const id of ['dishes-container', 'recommended-dishes-container']) {
                document.getElementById(id).textContent = 'Suggestions unavailable. Use Refresh suggestions to try again.';
            }
            message('page-status', `${successMessage} Suggestions could not be refreshed: ${error.message}`, true);
        }
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        action(submit, 'page-status', async () => {
            requireUser();
            if (!editing && !selected.value) throw new Error('Select an ingredient from the search results.');
            const body = {
                quantity: Number(document.getElementById('ingredient-amount').value),
                unit: document.getElementById('ingredient-unit').value,
                expiresOn: document.getElementById('ingredient-expiry').value || null
            };
            if (editing) await PantryAPI.updatePantry(editing, body);
            else await PantryAPI.addPantry({ ingredientId: Number(selected.value), ...body });
            reset(); search.disabled = false;
            await refreshAfterChange('Pantry saved.');
        });
    });
    document.getElementById('pantry-lists').addEventListener('click', event => {
        const edit = event.target.closest('[data-edit]');
        if (edit) {
            ++queryVersion; clearTimeout(timer); options.classList.add('hidden');
            const item = pantry.find(p => p.id === Number(edit.dataset.edit));
            editing = item.id; search.value = item.canonicalName || `Ingredient #${item.ingredientId}`;
            selected.value = item.ingredientId; search.disabled = true;
            document.getElementById('ingredient-amount').value = item.quantity ?? '';
            document.getElementById('ingredient-unit').value = item.unit || 'piece';
            document.getElementById('ingredient-expiry').value = item.expiresOn || '';
            submit.textContent = 'Save changes'; cancel.hidden = false;
            form.scrollIntoView({ behavior: 'smooth' }); return;
        }
        const button = event.target.closest('[data-delete]');
        if (button) action(button, 'page-status', async () => {
            await PantryAPI.removePantry(Number(button.dataset.delete));
            reset(); search.disabled = false;
            await refreshAfterChange('Ingredient removed.');
        });
    });
    cancel.addEventListener('click', () => { search.disabled = false; });
    document.getElementById('refresh-matches').addEventListener('click', event => action(event.target, 'page-status', async () => {
        requireUser(); await loadPantry(); await loadMatches(); message('page-status', 'Suggestions updated.');
    }));
    await state.ready;
    if (!state.user) {
        message('page-status', state.error?.message || 'Sign in to manage your pantry, or browse recipes in Explore.', Boolean(state.error));
        form.querySelectorAll('input, select, button').forEach(el => { el.disabled = true; });
        document.getElementById('refresh-matches').disabled = true;
        return;
    }
    await action(null, 'page-status', async () => {
        await loadPantry(); await loadMatches(); message('page-status', 'Pantry and suggestions loaded.');
    });
})();
