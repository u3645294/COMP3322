const params   = new URLSearchParams(window.location.search);
const recipeId = params.get('id');

const recipe   = RECIPES.find(r => r.id === recipeId);

const root = document.getElementById('recipe-root');

if (!recipe) {
    root.innerHTML = `
        <div class="not-found">
            <h1>Recipe not found</h1>
            <p>The recipe you're looking for doesn't exist.</p>
            <a href="main.html">← Back to pantry</a>
        </div>
    `;
} else {
    document.title = `${recipe.name} — Pantry Chef`;
    root.innerHTML = renderRecipe(recipe);
}

function renderRecipe(r) {
    const pantry = loadPantry();
    const match  = computeMatch(r, pantry);

    return `
        <div class="top-banner" style="background-image: url('${escapeHtml(r.photo)}')">
            <a href="main.html" class="back-btn">← Back to Main Page</a>
            <div class="banner-content">
                <h1 class="recipe-name">${escapeHtml(r.name)}</h1>
            </div>
        </div>

        <div class="page-body">
            ${renderMatchPanel(match)}
            ${renderIngredients(r, match)}
            ${renderSteps(r)}
        </div>
    `;
}

function renderMatchPanel(match) {
    const cls = match.percent === 100 ? '' :
                match.percent >= 50   ? 'partial' : 'none';

    const summary = match.missing.length === 0
        ? 'You have everything you need to cook this!'
        : `You're missing ${match.missing.length} ingredient${match.missing.length > 1 ? 's' : ''}.`;

    return `
        <section class="card match-panel">
            <div class="match-header">
                <span class="match-percent ${cls}">${match.percent}%</span>
                <span class="match-summary">${match.matched} of ${match.total} ingredients ready</span>
            </div>
            <div class="match-bar">
                <div class="match-fill ${cls}" style="width: ${match.percent}%"></div>
            </div>
            <p class="match-note">${summary}</p>
        </section>
    `;
}

// Ingredients list
function renderIngredients(r, match) {
    const items = r.ingredients.map(ing => {
        const have      = match.statuses.find(s => s.name === ing.name);
        const enough    = have && have.enough;
        const haveAmt   = have ? have.have : 0;

        return `
            <li class="${enough ? 'ok' : 'missing'}">
                <div class="left">
                    <span class="status">${enough ? '✓' : '✕'}</span>
                    <span class="ing-name">${escapeHtml(ing.name)}</span>
                </div>
                <span class="ing-amount">
                    <span class="${enough ? 'have' : ''}">${formatAmount(haveAmt)}</span>
                    / ${formatAmount(ing.amount)} ${escapeHtml(ing.unit)}
                </span>
            </li>
        `;
    }).join('');

    return `
        <section class="card">
            <h2>Ingredients</h2>
            <ul class="ingredient-list">${items}</ul>
        </section>
    `;
}

// Steps
function renderSteps(r) {
    const steps = r.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('');
    return `
        <section class="card">
            <h2>Recipe Steps</h2>
            <ol class="steps-list">${steps}</ol>
        </section>
    `;
}

function loadPantry() {
    return JSON.parse(localStorage.getItem('pantry') || '[]');
}

function savePantry(p) {
    localStorage.setItem('pantry', JSON.stringify(p));
}

function computeMatch(recipe, pantry) {
    const pantryByName = new Map(pantry.map(p => [p.name, p]));

    const statuses = recipe.ingredients.map(need => {
        const haveItem = pantryByName.get(need.name);
        const haveAmt  = haveItem ? haveItem.amount : 0;
        return {
            name: need.name,
            have: haveAmt,
            need: need.amount,
            unit: need.unit,
            enough: haveAmt >= need.amount
        };
    });

    const missing = statuses.filter(s => !s.enough);
    const matched = statuses.length - missing.length;
    const total   = statuses.length;
    const percent = total === 0 ? 0 : Math.round((matched / total) * 100);

    return { matched, total, percent, missing, statuses };
}

function formatAmount(n) {
    return Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, '');
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[c]));
}