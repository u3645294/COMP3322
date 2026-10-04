(function () {
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const base = window.PANTRYCHEF_API_BASE ??
        (local && window.location.port !== '3000' ? `${window.location.protocol}//${window.location.hostname}:3000` : '');
    async function request(path, method = 'GET', body) {
        let response;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            response = await fetch(`${base}/api/v1${path}`, {
                method, credentials: 'include', signal: controller.signal,
                ...(body === undefined ? {} : {
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                })
            });
        } catch {
            throw new Error(controller.signal.aborted ? 'Pantry Chef took too long to respond. Please try again.' : 'Unable to reach Pantry Chef. Please try again.');
        } finally { clearTimeout(timeout); }
        if (response.status === 204) return null;
        let result;
        try { result = await response.json(); }
        catch { throw new Error(`The server returned an unexpected response (${response.status}).`); }
        if (!response.ok) {
            const fields = Object.values(result.error?.fields || {}).join(' ');
            const error = new Error([result.error?.message || `Request failed (${response.status}).`, fields].filter(Boolean).join(' '));
            error.status = response.status;
            error.code = result.error?.code;
            throw error;
        }
        return result;
    }
    const pageQuery = ({ limit = 20, offset = 0 } = {}) => `?limit=${limit}&offset=${offset}`;
    const api = {
        health: () => request('/health'),
        register: body => request('/auth/register', 'POST', body),
        login: body => request('/auth/login', 'POST', body),
        me: () => request('/auth/me'),
        logout: () => request('/auth/logout', 'POST'),
        ingredients: query => request(`/ingredients?query=${encodeURIComponent(query)}`),
        pantry: () => request('/pantry-items'),
        addPantry: body => request('/pantry-items', 'POST', body),
        updatePantry: (id, body) => request(`/pantry-items/${id}`, 'PATCH', body),
        removePantry: id => request(`/pantry-items/${id}`, 'DELETE'),
        rules: () => request('/dietary-rules'),
        replaceRules: rules => request('/dietary-rules', 'PUT', { rules }),
        recipes: page => request(`/recipes${pageQuery(page)}`),
        recipe: id => request(`/recipes/${id}`),
        search: () => request('/search', 'POST'),
        history: page => request(`/search-history${pageQuery(page)}`),
        historyEntry: id => request(`/search-history/${id}`),
        favorites: () => request('/favorites'),
        addFavorite: recipeId => request('/favorites', 'POST', { recipeId }),
        removeFavorite: recipeId => request(`/favorites/${recipeId}`, 'DELETE')
    };
    async function recipe_match(client_obj = {}, preference_list = {},
        dietary_rule_obj = client_obj.dietary_rules ?? { rules: [] }) {
        const preferences = Array.isArray(preference_list) ? {
            ingredient_ids: preference_list.filter(Number.isInteger),
            tags: preference_list.filter(value => typeof value === 'string')
        } : preference_list;
        const items = client_obj.pantry ?? (await api.pantry()).data.pantryItems;
        const pantry = items.map(item => {
            const amount = item.amount ?? item.quantity;
            if (!(Number(amount) > 0) || !item.unit) {
                throw new Error('Matching needs a positive amount and unit for every pantry item. Please edit your pantry first.');
            }
            return {
                ingredient_id: item.ingredient_id ?? item.ingredientId,
                name: item.name, amount: Number(amount), unit: item.unit,
                expires_on: item.expires_on ?? item.expiresOn ?? null
            };
        });
        const result = await request('/recipe-matches', 'POST', {
            client_obj: {
                pantry, not_allowed: client_obj.not_allowed || { ingredient_ids: [], tags: [] },
                liked_recipe_ids: client_obj.liked_recipe_ids || []
            },
            preference_list: { ingredient_ids: preferences.ingredient_ids || [], tags: preferences.tags || [] },
            dietary_rules: dietary_rule_obj
        });
        return result.match;
    }
    window.PantryAPI = api;
    window.recipe_match = recipe_match;
    window.match_recipe = recipe_match;
})();
