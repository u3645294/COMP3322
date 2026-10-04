(async function () {
    const { state, action, message, requireUser, escape, cards } = PantryUI;
    const container = document.getElementById('history-container');
    const previous = document.getElementById('history-prev'), next = document.getElementById('history-next');
    let offset = 0;
    async function list() {
        requireUser();
        const result = await PantryAPI.history({ limit: 20, offset });
        container.innerHTML = result.data.searches.map(search => `<article class="recipe-card"><div class="card-body"><h3>Search #${search.id}</h3><p>${escape(new Date(search.createdAt).toLocaleString())}</p><button type="button" data-search="${search.id}">Reopen results</button></div></article>`).join('');
        document.getElementById('history-empty').hidden = result.meta.total > 0;
        previous.disabled = offset === 0; next.disabled = offset + result.data.searches.length >= result.meta.total;
        document.getElementById('history-page').textContent = `${result.meta.total} searches · page ${Math.floor(offset / 20) + 1}`;
        message('page-status', 'Search history loaded.');
    }
    previous.addEventListener('click', () => { offset = Math.max(0, offset - 20); action(null, 'page-status', list); });
    next.addEventListener('click', () => { offset += 20; action(null, 'page-status', list); });
    container.addEventListener('click', event => {
        const button = event.target.closest('[data-search]');
        if (!button) return;
        action(button, 'page-status', async () => {
            const search = (await PantryAPI.historyEntry(Number(button.dataset.search))).data.search;
            const detail = document.getElementById('history-detail');
            detail.hidden = false;
            detail.innerHTML = `<h2>Search #${search.id}</h2><details><summary>Pantry and preferences at search time</summary><pre>${escape(JSON.stringify({ pantry: search.pantrySnapshot, rules: search.rulesSnapshot }, null, 2))}</pre></details><div class="dishes-grid" id="history-results"></div>`;
            const results = await Promise.all(search.results.map(async result => {
                try { return { ...(await PantryAPI.recipe(result.recipeId)).data.recipe, ...result }; }
                catch (error) {
                    if (error.status === 404) return { ...result, title: `Recipe #${result.recipeId} (no longer available)` };
                    throw error;
                }
            }));
            cards(document.getElementById('history-results'), results, recipe => `Rank ${recipe.rank} · ${recipe.coverage == null ? 'Coverage unavailable' : `${Math.round(recipe.coverage * 100)}% ingredients present at search time`}`);
            message('page-status', 'Saved results reopened. Recipe details show the current catalog.');
        });
    });
    await state.ready; await action(null, 'page-status', list);
})();
