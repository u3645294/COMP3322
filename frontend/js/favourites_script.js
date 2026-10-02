const recipes = window.RECIPES || [];
const container = document.getElementById('favourites-container');
const empty     = document.getElementById('favourites-empty');

function render() {
    const favIds  = getFavourites();
    const favRecipes = favIds
        .map(id => RECIPES.find(r => r.id === id))
        .filter(Boolean);            // drop ids that no longer exist

    container.innerHTML = '';

    if (favRecipes.length === 0) {
        container.hidden = true;
        empty.hidden = false;
        return;
    }

    container.hidden = false;
    empty.hidden = true;

    const pantry = JSON.parse(localStorage.getItem('pantry') || '[]');

    favRecipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, pantry));
    });
}

function createRecipeCard(recipe, pantryArr) {
    const match = ingredientMatch(recipe, pantryArr);

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
            <button class="fav-btn active" type="button"
                    data-recipe-id="${recipe.id}"
                    aria-label="Remove from favourites"
                    title="Remove from favourites">❤️</button>
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

document.querySelector('.favourites-page').addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-btn');
    if (favBtn) {
        e.stopPropagation();
        toggleFavourite(favBtn.dataset.recipeId);
        render();
        return;
    }

    const card = e.target.closest('.recipe-card');
    if (!card) return;
    window.location.href = `recipe.html?id=${card.dataset.recipeId}`;
});

window.addEventListener('storage', (e) => {
    if (e.key === 'favourites') render();
});
window.addEventListener('favourites:changed', render);

render();