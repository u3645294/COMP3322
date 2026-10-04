(async function () {
    const { escape, message, action, cards, state, requireUser } = PantryUI;
    const container = document.getElementById('explore-container');
    const previous = document.getElementById('recipes-prev');
    const next = document.getElementById('recipes-next');
    let offset = 0, rules = [];
    async function catalog() {
        const result = await PantryAPI.recipes({ limit: 20, offset });
        cards(container, result.data.recipes);
        previous.disabled = offset === 0;
        next.disabled = offset + result.data.recipes.length >= result.meta.total;
        document.getElementById('catalog-page').textContent = `${result.meta.total} recipes · page ${Math.floor(offset / 20) + 1}`;
        message('page-status', 'Recipes loaded.');
    }
    previous.addEventListener('click', () => { offset = Math.max(0, offset - 20); action(null, 'page-status', catalog); });
    next.addEventListener('click', () => { offset += 20; action(null, 'page-status', catalog); });
    document.getElementById('browse-recipes').addEventListener('click', event => action(event.target, 'page-status', catalog));
    document.getElementById('saved-search').addEventListener('click', event => action(event.target, 'page-status', async () => {
        requireUser();
        const result = await PantryAPI.search();
        cards(document.getElementById('search-results'), result.data.results, recipe =>
            `${Math.round(recipe.coverage * 100)}% ingredients present · Missing: ${recipe.missingIngredients.map(item => item.canonicalName).join(', ') || 'none'}`);
        message('page-status', `Search #${result.data.searchId} saved. You can reopen it in History.`);
    }));
    const split = id => [...new Set(document.getElementById(id).value.split(',').map(value => value.trim()).filter(Boolean))];
    function ids(id) {
        const values = split(id).map(Number);
        if (values.some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error('Ingredient IDs must be positive whole numbers, separated by commas.');
        return values;
    }
    document.getElementById('match-form').addEventListener('submit', event => {
        event.preventDefault();
        action(event.target.querySelector('[type="submit"]'), 'page-status', async () => {
            requireUser();
            const result = await recipe_match({
                not_allowed: { ingredient_ids: ids('excluded-ids'), tags: split('excluded-tags') },
                liked_recipe_ids: [...state.favorites]
            }, { ingredient_ids: ids('preferred-ids'), tags: split('preferred-tags') });
            const matched = result.status ? result.recipes : result.likedRecipes;
            cards(document.getElementById('search-results'), matched, recipe => result.status ?
                `Score ${recipe.recommendIndex} · ${recipe.tags.join(', ')} · Missing: ${Object.entries(recipe.missingIngredients).map(([id, item]) => `Ingredient #${id}: ${item.amount ?? 'unspecified'} ${item.unit || ''}`).join('; ') || 'none'}` : 'A saved favourite to try.');
            message('page-status', result.status ? 'Ranked suggestions loaded.' : 'No matches found. Showing eligible favourites.');
        });
    });
    function renderRules() {
        document.getElementById('rules-list').innerHTML = rules.map((rule, index) =>
            `<li>${escape(rule.ruleType)}: ${escape(rule.ruleValue)} <button type="button" data-remove-rule="${index}">Remove</button></li>`).join('');
    }
    document.getElementById('rule-form').addEventListener('submit', event => {
        event.preventDefault();
        const rule = { ruleType: document.getElementById('rule-type').value, ruleValue: document.getElementById('rule-value').value.trim() };
        if (rules.some(item => item.ruleType === rule.ruleType && item.ruleValue.toLowerCase() === rule.ruleValue.toLowerCase())) {
            message('page-status', 'That rule is already listed.', true); return;
        }
        if (rules.length >= 50) { message('page-status', 'At most 50 rules are allowed.', true); return; }
        rules.push(rule); renderRules(); document.getElementById('rule-value').value = '';
        message('page-status', 'Rule added to draft. Save preferences to apply it.');
    });
    document.getElementById('rules-list').addEventListener('click', event => {
        const button = event.target.closest('[data-remove-rule]');
        if (button) { rules.splice(Number(button.dataset.removeRule), 1); renderRules(); message('page-status', 'Rule removed from draft. Save preferences to apply it.'); }
    });
    document.getElementById('save-rules').addEventListener('click', event => action(event.target, 'page-status', async () => {
        requireUser();
        rules = (await PantryAPI.replaceRules(rules)).data.rules.map(({ ruleType, ruleValue }) => ({ ruleType, ruleValue }));
        renderRules(); message('page-status', 'Preferences saved. Run a search to apply them.');
    }));
    await state.ready;
    await action(null, 'page-status', catalog);
    if (state.user) await action(null, 'page-status', async () => {
        rules = (await PantryAPI.rules()).data.rules.map(({ ruleType, ruleValue }) => ({ ruleType, ruleValue }));
        renderRules(); message('page-status', 'Recipes and preferences loaded.');
    });
    else {
        document.querySelectorAll('#preferences input, #preferences select, #preferences button, #match-form input, #match-form button, #saved-search').forEach(el => { el.disabled = true; });
        message('page-status', state.error?.message || 'Browse recipes freely. Sign in for matching and preferences.', Boolean(state.error));
    }
})();
