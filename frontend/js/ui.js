(function () {
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const favorites = new Set();
    const state = { user: null, favorites, ready: null };
    state.ready = (async () => {
        try { state.user = (await PantryAPI.me()).data.user; }
        catch (error) { if (error.status !== 401) state.error = error; }
        if (state.user) {
            try { (await PantryAPI.favorites()).data.favorites.forEach(item => favorites.add(item.recipeId)); }
            catch (error) { state.error = error; }
        }
        return state;
    })();
    function message(target, text, error = false) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        el.textContent = text;
        el.classList.toggle('error', error);
    }
    async function action(button, target, work) {
        if (button) button.disabled = true;
        message(target, 'Loading…');
        try { await work(); }
        catch (error) { message(target, error.message, true); }
        finally { if (button) button.disabled = false; }
    }
    function requireUser() {
        if (!state.user) throw state.error || new Error('Please sign in to use this feature.');
    }
    function heart(id, extraClass = 'fav-btn') {
        return `<button class="${extraClass}" data-favorite="${id}" type="button" aria-label="${favorites.has(id) ? 'Remove from' : 'Add to'} favourites">${favorites.has(id) ? '❤️' : '🤍'}</button>`;
    }
    function card(recipe, note = null) {
        const id = recipe.recipeId ?? recipe.id;

        let body = '';
        if (note && typeof note === 'object') {
            const { percent = 0, missing = [], label = '' } = note;
            const tier = percent >= 100 ? '' : percent >= 60 ? 'partial' : 'none';
            body = `
                <div class="match">
                    <span>${percent}% of ingredients ready</span>
                    <div class="match-bar">
                        <div class="match-fill ${tier}" style="width:${percent}%"></div>
                    </div>
                </div>
                ${missing.length ? `<p class="missing">Missing: ${missing.map(escape).join(', ')}</p>` : ''}
                ${label ? `<p class="match-note">${escape(label)}</p>` : ''}
            `;
        } else if (typeof note === 'string' && note) {
            body = `<p>${escape(note)}</p>`;
        }

        return `<article class="recipe-card">
            <div class="card-photo-wrap">
                ${recipe.imageUrl && /^https?:\/\//.test(recipe.imageUrl)
                    ? `<img class="card-photo" src="${escape(recipe.imageUrl)}" alt="${escape(recipe.title)}" loading="lazy">`
                    : '<div class="card-placeholder" aria-hidden="true">🍲</div>'}
                ${heart(id)}
            </div>
            <div class="card-body">
                <h3 class="card-title"><a href="recipe.html?id=${id}">${escape(recipe.title)}</a></h3>
                <p>${escape(recipe.description || '')}</p>
                <p class="card-meta">
                    ${escape(recipe.difficulty || '')}
                    ${recipe.servings ? `· ${escape(recipe.servings)} servings` : ''}
                    ${recipe.prepMinutes != null && recipe.cookMinutes != null
                        ? `· ${Number(recipe.prepMinutes) + Number(recipe.cookMinutes)} min` : ''}
                </p>
                ${body}
            </div>
        </article>`;
    }
    function cards(container, recipes, note = () => '') {
        container.innerHTML = recipes.length ? recipes.map(recipe => card(recipe, note(recipe))).join('') : '<p class="comments">No recipes found.</p>';
    }
    async function toggleFavorite(button) {
        requireUser();
        const id = Number(button.dataset.favorite);
        if (favorites.has(id)) { await PantryAPI.removeFavorite(id); favorites.delete(id); }
        else { await PantryAPI.addFavorite(id); favorites.add(id); }
        document.querySelectorAll(`[data-favorite="${id}"]`).forEach(el => {
            el.textContent = favorites.has(id) ? '❤️' : '🤍';
            el.setAttribute('aria-label', `${favorites.has(id) ? 'Remove from' : 'Add to'} favourites`);
        });
        document.dispatchEvent(new CustomEvent('favorites-changed', { detail: id }));
    }
    document.addEventListener('click', async event => {
        const button = event.target.closest('[data-favorite]');
        if (!button) return;
        await action(button, 'page-status', async () => {
            await toggleFavorite(button);
            message('page-status', 'Favourites updated.');
        });
    });
    function cookingPlan(recipe, pantry) {
        const required = recipe.ingredients.filter(item => !item.optional);
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const needed = new Map();
        for (const ingredient of required) {
            const item = pantry.find(p => p.ingredientId === ingredient.ingredientId);
            if (!item || ingredient.quantity == null || item.quantity == null || !ingredient.unit || item.unit !== ingredient.unit || (item.expiresOn && item.expiresOn < date)) {
                return { ready: false, reason: 'Cooking needs unexpired pantry items with known quantities and matching units for every required ingredient.', changes: [] };
            }
            needed.set(item.id, (needed.get(item.id) || 0) + Number(ingredient.quantity));
        }
        const changes = [...needed].map(([id, amount]) => ({ id, quantity: pantry.find(item => item.id === id).quantity - amount }));
        if (!required.length || changes.some(change => change.quantity < 0)) {
            return { ready: false, reason: 'You do not have enough required ingredients to cook this recipe.', changes: [] };
        }
        return { ready: true, reason: '', changes };
    }
    window.PantryUI = { state, escape, message, action, requireUser, heart, card, cards, cookingPlan };
})();
