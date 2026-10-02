const container = document.getElementById('explore-container');

function loadPantry() {
    try {
        return JSON.parse(localStorage.getItem('pantry') || '[]');
    } catch {
        return [];
    }
}

function render() {
    const pantry = loadPantry();

    container.innerHTML = '';

    RECIPES.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, pantry));
    });
}

function createRecipeCard(recipe, pantryArr) {
    const match = ingredientMatch(recipe, pantryArr);
    const fav   = isFavourite(recipe.id);

    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id;

    const missingText = match.missing.length
        ? `Missing: ${match.missing.map(m => m.name).join(', ')}`
        : 'You have everything!';

    card.innerHTML = `
        <div class="card-photo-wrap">
            <img class="card-photo" src="${escapeHtml(recipe.photo)}"
                 alt="${escapeHtml(recipe.name)}" loading="lazy"
                 onerror="this.style.display='none'">
            <button class="fav-btn ${fav ? 'active' : ''}" type="button"
                    data-recipe-id="${recipe.id}"
                    aria-label="${fav ? 'Remove from favourites' : 'Add to favourites'}"
                    title="${fav ? 'Remove from favourites' : 'Add to favourites'}">${fav ? '❤️' : '🤍'}</button>
        </div>
        <div class="card-body">
            <h3 class="card-title">${escapeHtml(recipe.name)}</h3>
            <div class="match">
                <span>${match.matched}/${match.total} ingredients</span>
                <div class="match-bar">
                    <div class="match-fill" style="width: ${match.percent}%"></div>
                </div>
            </div>
            <div class="missing">${escapeHtml(missingText)}</div>
        </div>
    `;

    return card;
}

function ingredientMatch(recipe, pantryArr) {
    const pantryByName = new Map(pantryArr.map(p => [p.name, p]));
    const missing = [];
    recipe.ingredients.forEach(need => {
        const have = pantryByName.get(need.name);
        if (!have || have.amount < need.amount) missing.push(need);
    });
    const matched = recipe.ingredients.length - missing.length;
    const total   = recipe.ingredients.length;
    const percent = total === 0 ? 0 : Math.round((matched / total) * 100);
    return { matched, total, percent, missing };
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[c]));
}

document.querySelector('.explore-page').addEventListener('click', (e) => {
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
    if (e.key === 'pantry' || e.key === 'favourites') render();
});
window.addEventListener('favourites:changed', render);

render();