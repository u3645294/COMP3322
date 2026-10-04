import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
const source = readFileSync(new URL('../../../frontend/js/api.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../../../frontend/js/ui.js', import.meta.url), 'utf8');
function browser(overrides = {}) {
  const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: {} }) }));
  const window = { location: { protocol: 'http:', hostname: 'localhost', port: '5173' }, ...overrides };
  const context = vm.createContext({ window, fetch, AbortController, setTimeout, clearTimeout });
  vm.runInContext(source, context);
  return { ...window, fetch, context };
}
describe('frontend API transport', () => {
  it('uses the configured origin, JSON bodies and session cookies', async () => {
    const { PantryAPI, fetch } = browser({ PANTRYCHEF_API_BASE: 'https://api.example.com' });
    const body = { email: 'test@example.com', password: 'password123', displayName: 'Test' };
    await PantryAPI.register(body);
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/v1/auth/register', expect.objectContaining({
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }));
  });
  it('uses same-origin paths on deployed sites', async () => {
    const { PantryAPI, fetch } = browser({ location: { protocol: 'https:', hostname: 'pantry.example.com', port: '' } });
    await PantryAPI.health(); expect(fetch.mock.calls[0][0]).toBe('/api/v1/health');
  });
  it('encodes autocomplete input and paginates recipes/history', async () => {
    const { PantryAPI, fetch } = browser();
    await PantryAPI.ingredients('salt & pepper');
    await PantryAPI.recipes({ limit: 20, offset: 20 });
    await PantryAPI.history({ limit: 10, offset: 30 });
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      'http://localhost:3000/api/v1/ingredients?query=salt%20%26%20pepper',
      'http://localhost:3000/api/v1/recipes?limit=20&offset=20',
      'http://localhost:3000/api/v1/search-history?limit=10&offset=30'
    ]);
  });
  it('does not parse bodyless 204 responses', async () => {
    const { PantryAPI, fetch } = browser(); const json = vi.fn();
    fetch.mockResolvedValue({ ok: true, status: 204, json });
    await expect(PantryAPI.logout()).resolves.toBeNull();
    await expect(PantryAPI.removePantry(9)).resolves.toBeNull();
    await expect(PantryAPI.removeFavorite(123)).resolves.toBeNull();
    expect(json).not.toHaveBeenCalled();
  });
  it('preserves backend error status and field messages', async () => {
    const { PantryAPI, fetch } = browser();
    fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: {
      code: 'VALIDATION_ERROR', message: 'Invalid input.', fields: { 'body.quantity': 'Must be positive.' }
    } }) });
    await expect(PantryAPI.addPantry({ ingredientId: 3, quantity: 0 })).rejects.toMatchObject({
      status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input. Must be positive.'
    });
  });
  it('surfaces network/non-JSON failures', async () => {
    const { PantryAPI, fetch } = browser(); fetch.mockRejectedValueOnce(new Error('Network'));
    await expect(PantryAPI.health()).rejects.toThrow('Unable to reach');
    fetch.mockResolvedValueOnce({ status: 502, json: async () => { throw new Error('HTML'); } });
    await expect(PantryAPI.health()).rejects.toThrow('unexpected response (502)');
  });
  it('loads backend pantry when omitted and preserves IDs through both aliases', async () => {
    const { recipe_match, match_recipe, fetch } = browser(); expect(recipe_match).toBe(match_recipe);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { pantryItems: [
      { ingredientId: 7001, quantity: 50, unit: 'g', expiresOn: null }
    ] } }) });
    const match = { status: false, recipes: [], likedRecipes: [{ recipeId: 991, title: 'Soup' }] };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ match }) });
    await expect(recipe_match({ liked_recipe_ids: [991] }, [7001, 'quick'])).resolves.toBe(match);
    expect(fetch.mock.calls[0][0]).toContain('/pantry-items');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      client_obj: { pantry: [{ ingredient_id: 7001, amount: 50, unit: 'g', expires_on: null }],
        not_allowed: { ingredient_ids: [], tags: [] }, liked_recipe_ids: [991] },
      preference_list: { ingredient_ids: [7001], tags: ['quick'] }, dietary_rules: { rules: [] }
    });
  });
  it('rejects incomplete pantry before sending a match request', async () => {
    const { recipe_match, fetch } = browser();
    await expect(recipe_match({ pantry: [{ ingredientId: 1, quantity: null, unit: 'g' }] })).rejects.toThrow('positive amount');
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe('recipe cooking quantities', () => {
  function plan() {
    const { context, PantryAPI } = browser(); context.PantryAPI = PantryAPI;
    context.document = { addEventListener() {} }; vm.runInContext(ui, context);
    return context.window.PantryUI.cookingPlan;
  }
  const ingredient = { ingredientId: 1, quantity: 100, unit: 'g', optional: false };
  const item = { id: 9, ingredientId: 1, quantity: 150, unit: 'g', expiresOn: null };
  it('aggregates repeated ingredients and skips optional ingredients', () => {
    expect(plan()({ ingredients: [ingredient, { ...ingredient, quantity: 25 }, { ingredientId: 2, optional: true }] }, [item]))
      .toEqual({ ready: true, reason: '', changes: [{ id: 9, quantity: 25 }] });
  });
  it.each([
    [], [{ ...item, quantity: 99 }], [{ ...item, unit: 'kg' }], [{ ...item, quantity: null }],
    [{ ...item, expiresOn: '2000-01-01' }]
  ].map(pantry => ({ pantry })))('refuses missing, insufficient, mismatched, unknown, or expired stock: %j', ({ pantry }) => {
    expect(plan()({ ingredients: [ingredient] }, pantry).ready).toBe(false);
  });
  it('refuses recipes with unspecified required quantities', () => {
    expect(plan()({ ingredients: [{ ...ingredient, quantity: null }] }, [item]).ready).toBe(false);
  });
});

describe('pantry page mutations', () => {
  async function pantryPage() {
    const elements = new Map();
    const pending = [];
    const messages = [];
    const element = id => {
      if (!elements.has(id)) elements.set(id, {
        value: '', hidden: false, disabled: false, innerHTML: '', textContent: '',
        classList: { add() {}, remove() {} },
        listeners: {},
        addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); },
        querySelector() { return element('submit'); },
        reset() {}, scrollIntoView() {}
      });
      return elements.get(id);
    };
    let items = [{ id: 9, ingredientId: 1, canonicalName: 'Rice', quantity: 100, unit: 'g', expiresOn: null }];
    const api = {
      pantry: vi.fn(async () => ({ data: { pantryItems: items } })),
      addPantry: vi.fn(async body => { items = [...items, { id: 10, canonicalName: 'Salt', ...body }]; }),
      updatePantry: vi.fn(async (id, body) => { items = items.map(item => item.id === id ? { ...item, ...body } : item); }),
      removePantry: vi.fn(async id => { items = items.filter(item => item.id !== id); })
    };
    const match = vi.fn(async () => ({ status: true, recipes: [] }));
    const context = vm.createContext({
      document: { getElementById: element }, PantryAPI: api, recipe_match: match,
      setTimeout, clearTimeout,
      PantryUI: {
        escape: String, requireUser() {},
        state: { user: { id: 1 }, favorites: new Set([74]), ready: Promise.resolve() },
        cards(container) { container.textContent = 'Rendered suggestions'; },
        message(target, text, error = false) { messages.push({ text, error }); },
        action(button, target, work) {
          const task = work(); pending.push(task); return task;
        }
      }
    });
    await vm.runInContext(readFileSync(new URL('../../../frontend/js/main_script.js', import.meta.url), 'utf8'), context);
    async function emit(id, type, target = element(id)) {
      for (const handler of element(id).listeners[type] ?? []) handler({ preventDefault() {}, target });
      await Promise.all(pending.splice(0));
    }
    function fill(quantity) {
      element('ingredient-amount').value = String(quantity);
      element('ingredient-unit').value = 'g';
      element('ingredient-expiry').value = '';
    }
    return { api, match, element, emit, fill, messages };
  }
  it('refreshes suggestions using persisted pantry data after adding an ingredient', async () => {
    const page = await pantryPage();
    page.element('ingredient-name').value = '2'; page.fill(25);
    await page.emit('ingredient-form', 'submit');
    expect(page.api.addPantry).toHaveBeenCalledWith({ ingredientId: 2, quantity: 25, unit: 'g', expiresOn: null });
    expect(page.match).toHaveBeenCalledTimes(2);
    expect(page.match.mock.lastCall[0]).toEqual({
      pantry: [
        { id: 9, ingredientId: 1, canonicalName: 'Rice', quantity: 100, unit: 'g', expiresOn: null },
        { id: 10, ingredientId: 2, canonicalName: 'Salt', quantity: 25, unit: 'g', expiresOn: null }
      ], liked_recipe_ids: [74]
    });
  });
  it('refreshes suggestions with edited quantities', async () => {
    const page = await pantryPage();
    await page.emit('pantry-lists', 'click', { closest: selector => selector === '[data-edit]' ? { dataset: { edit: '9' } } : null });
    page.fill(60); await page.emit('ingredient-form', 'submit');
    expect(page.api.updatePantry).toHaveBeenCalledWith(9, { quantity: 60, unit: 'g', expiresOn: null });
    expect(page.match.mock.lastCall[0].pantry[0].quantity).toBe(60);
    expect(page.match).toHaveBeenCalledTimes(2);
  });
  it('removes deleted ingredients from the next match request', async () => {
    const page = await pantryPage();
    await page.emit('pantry-lists', 'click', { closest: selector => selector === '[data-delete]' ? { dataset: { delete: '9' } } : null });
    expect(page.api.removePantry).toHaveBeenCalledWith(9);
    expect(page.match.mock.lastCall[0].pantry).toEqual([]);
    expect(page.match).toHaveBeenCalledTimes(2);
  });
  it('keeps successful writes and clears stale suggestions when matching fails', async () => {
    const page = await pantryPage();
    page.match.mockRejectedValueOnce(new Error('Matching unavailable'));
    page.element('ingredient-name').value = '2'; page.fill(25);
    await page.emit('ingredient-form', 'submit');
    expect((await page.api.pantry()).data.pantryItems).toHaveLength(2);
    expect(page.messages.at(-1)).toEqual({
      text: 'Pantry saved. Suggestions could not be refreshed: Matching unavailable', error: true
    });
    for (const id of ['dishes-container', 'recommended-dishes-container']) {
      expect(page.element(id).textContent).toContain('Refresh suggestions');
    }
  });
  it('reports a saved change when the subsequent pantry reload fails', async () => {
    const page = await pantryPage();
    page.api.pantry.mockRejectedValueOnce(new Error('Pantry unavailable'));
    page.element('ingredient-name').value = '2'; page.fill(25);
    await page.emit('ingredient-form', 'submit');
    expect((await page.api.pantry()).data.pantryItems).toHaveLength(2);
    expect(page.match).toHaveBeenCalledTimes(1);
    expect(page.messages.at(-1)).toEqual({
      text: 'Pantry saved. Suggestions could not be refreshed: Pantry unavailable', error: true
    });
    expect(page.element('dishes-container').textContent).toContain('Refresh suggestions');
  });
});
