const container  = document.getElementById('history-container');
const emptyState = document.getElementById('history-empty');
const clearBtn   = document.getElementById('clear-history');

function loadPantry() {
    try {
        return JSON.parse(localStorage.getItem('pantry') || '[]');
    } catch {
        return [];
    }
}

function formatCookedAt(ts) {
    const now  = Date.now();
    const diff = now - ts;

    const min  = 60 * 1000;
    const hour = 60 * min;
    const day  = 24 * hour;

    if (diff < min)  return 'Just now';
    if (diff < hour) return `${Math.floor(diff / min)} min ago`;
    if (diff < day)  return `${Math.floor(diff / hour)} h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} d ago`;

    return new Date(ts).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[c]));
}

function ingredientMatch(recipe, pantryArr) {
    const pantryByName = new Map(pantryArr.map(p => [p.name, p]));
    const missing = [];
    (recipe.ingredients || []).forEach(need => {
        const have = pantryByName.get(need.name);
        if (!have || have.amount < need.amount) missing.push(need);
    });
    const matched = recipe.ingredients.length - missing.length;
    const total   = recipe.ingredients.length;
    const percent = total === 0 ? 0 : Math.round((matched / total) * 100);
    return { matched, total, percent, missing };
}

function createHistoryCard(entry, pantryArr) {
    const recipe = RECIPES.find(r => r.id === entry.id) || entry;
    const fav    = typeof isFavourite === 'function' && isFavourite(entry.id);
    const match  = ingredientMatch(recipe, pantryArr);

    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.recipeId = entry.id;

    card.innerHTML = `
        <div class="card-photo-wrap">
            <img class="card-photo" src="${escapeHtml(entry.photo)}"
                 alt="${escapeHtml(entry.name)}" loading="lazy"
                 onerror="this.style.display='none'">
            <button class="fav-btn ${fav ? 'active' : ''}" type="button"
                    data-recipe-id="${entry.id}"
                    aria-label="${fav ? 'Remove from favourites' : 'Add to favourites'}"
                    title="${fav ? 'Remove from favourites' : 'Add to favourites'}">${fav ? '❤️' : '🤍'}</button>
        </div>
        <div class="card-body">
            <h3 class="card-title">${escapeHtml(entry.name)}</h3>

            <div class="cooked-at">Viewed ${formatCookedAt(entry.viewedAt)}</div>

            <div class="match">
                <span>${match.matched}/${match.total} ingredients now</span>
                <div class="match-bar">
                    <div class="match-fill" style="width: ${match.percent}%"></div>
                </div>
            </div>
        </div>
    `;

    return card;
}

function render() {
    const entries = getHistory().slice().reverse();  // newest first
    const pantry  = loadPantry();

    container.innerHTML = '';

    if (entries.length === 0) {
        container.hidden  = true;
        emptyState.hidden = false;
        clearBtn.disabled = true;
        return;
    }

    container.hidden  = false;
    emptyState.hidden = true;
    clearBtn.disabled = false;

    entries.forEach(entry => {
        container.appendChild(createHistoryCard(entry, pantry));
    });
}

clearBtn.addEventListener('click', () => {
    const ok = confirm('Clear your entire cooking history? This cannot be undone.');
    if (!ok) return;
    clearHistory();
    render();
});

document.querySelector('.history-page').addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
        e.stopPropagation();
        const id = favBtn.dataset.recipeId;
        const added = toggleFavourite(id);
        favBtn.classList.toggle('active', added);
        favBtn.textContent = added ? '❤️' : '🤍';
        favBtn.setAttribute('aria-label', added ? 'Remove from favourites' : 'Add to favourites');
        favBtn.title = added ? 'Remove from favourites' : 'Add to favourites';
        return;
    }

    const card = e.target.closest('.recipe-card');
    if (!card) return;
    window.location.href = `recipe.html?id=${card.dataset.recipeId}`;
});

window.addEventListener('storage', (e) => {
    if (e.key === 'history' || e.key === 'favourites' || e.key === 'pantry') render();
});
window.addEventListener('history:changed', render);

render();