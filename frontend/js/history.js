const HISTORY_KEY = 'history';

function getHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveHistory(entries) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function addHistoryEntry(recipe) {
    let entries = getHistory();
    entries = entries.filter(e => e.id !== recipe.id);
    entries.push({
        id: recipe.id,
        name: recipe.name,
        photo: recipe.photo,
        viewedAt: Date.now(),
        ingredients: (recipe.ingredients || []).map(i => ({ ...i }))
    });
    saveHistory(entries);
    window.dispatchEvent(new CustomEvent('history:changed'));
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('history:changed'));
}

window.getHistory      = getHistory;
window.saveHistory     = saveHistory;
window.addHistoryEntry = addHistoryEntry;
window.clearHistory    = clearHistory;