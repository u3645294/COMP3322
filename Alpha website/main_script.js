const INGREDIENTS_BY_CATEGORY = {
    "Sauces & Condiments": [
        "Soy Sauce", "Ketchup", "Honey"
    ],
    "Vegetables & Fruits": [
        "Tomato", "Onion", "Garlic"
    ],
    "Meat & Seafood": [
        "Pork", "Beef", "Bacon",
    ],
    "Dairy & Eggs": [
        "Egg", "Milk", "Cheese"
    ],
    "Dry Goods & Spices": [
        "Rice", "Pasta","Salt"
    ]
};

/* { category, name, amount: Number, unit: String } 
   Name is the unique key */
const pantry = JSON.parse(localStorage.getItem('pantry') || '[]');

const ingredientForm  = document.getElementById('ingredient-form');
const categorySelect  = document.getElementById('ingredient-category');
const searchInput     = document.getElementById('ingredient-search');
const nameHidden      = document.getElementById('ingredient-name');
const optionsList     = document.getElementById('ingredient-options');
const amountInput     = document.getElementById('ingredient-amount');
const unitInput       = document.getElementById('ingredient-unit');
const listsWrapper    = document.getElementById('pantry-lists');

const dishesContainer      = document.getElementById('dishes-container');
const recommendedContainer = document.getElementById('recommended-dishes-container');

let activeIndex = -1;

function openOptions(items) {
    optionsList.innerHTML = '';
    activeIndex = -1;

    if (items.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-match';
        li.textContent = 'No matching ingredient';
        optionsList.appendChild(li);
    } else {
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.dataset.value = item;
            optionsList.appendChild(li);
        });
    }

    optionsList.classList.remove('hidden');
}

function closeOptions() {
    optionsList.classList.add('hidden');
    optionsList.innerHTML = '';
    activeIndex = -1;
}

function currentCategoryItems() {
    return INGREDIENTS_BY_CATEGORY[categorySelect.value] || [];
}

categorySelect.addEventListener('change', () => {
    searchInput.disabled = false;
    searchInput.value = '';
    nameHidden.value = '';
    searchInput.focus();
    openOptions(currentCategoryItems());
});

searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    nameHidden.value = '';
    const matches = currentCategoryItems().filter(i =>
        i.toLowerCase().includes(q)
    );
    openOptions(matches);
});

function highlight(items) {
    items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

optionsList.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-value]');
    if (li) pickIngredient(li.dataset.value);
});

function pickIngredient(value) {
    searchInput.value = value;
    nameHidden.value = value;

    const existing = pantry.find(p => p.name === value);
    if (existing) {
        unitInput.value = existing.unit;
        unitInput.disabled = true;
    } else {
        unitInput.disabled = false;
    }

    closeOptions();
    amountInput.focus();
}

document.addEventListener('click', (e) => {
    if (!document.getElementById('ingredient-combo').contains(e.target)) {
        closeOptions();
    }
});

// Adding ingredients to pantry
ingredientForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const category = categorySelect.value;
    const name     = nameHidden.value;
    const amount   = Number(amountInput.value);
    const unit     = unitInput.value;

    if (!category || !name || !amount || amount <= 0) {
        if (!name) {
            searchInput.focus();
            openOptions(currentCategoryItems());
        } else if (!amount || amount <= 0) {
            amountInput.focus();
        }
        return;
    }

    const existing = pantry.find(p => p.name === name);

    if (existing) {
        if (existing.unit !== unit) {
            alert(`"${name}" is already tracked in ${existing.unit}. ` +
                  `Add it using ${existing.unit} instead.`);
            unitInput.value = existing.unit;
            return;
        }
        existing.amount += amount;
    } else {
        pantry.push({ category, name, amount, unit });
    }

    renderPantry();
    renderDishSections();

    // Reset
    searchInput.value = '';
    nameHidden.value = '';
    amountInput.value = '';
    unitInput.disabled = false;
    searchInput.focus();
});

// Render pantry list
function renderPantry() {
    listsWrapper.innerHTML = '';

    Object.keys(INGREDIENTS_BY_CATEGORY).forEach(category => {
        const items = pantry
            .map((item, index) => ({ ...item, index }))
            .filter(item => item.category === category);

        if (!items.length) return;

        const heading = document.createElement('h3');
        heading.className = 'list-heading';
        heading.textContent = category;
        listsWrapper.appendChild(heading);

        const ul = document.createElement('ul');
        ul.className = 'pantry-list';

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'pantry-item';
            li.innerHTML = `
                <div class="info">
                    <span class="name">${escapeHtml(item.name)}</span>
                    <span class="amount">${formatAmount(item.amount)} ${item.unit}</span>
                </div>
                <div class="remove-controls">
                    <button class="remove-amount" data-index="${item.index}" title="Remove some">−</button>
                    <button class="remove-all" data-index="${item.index}" title="Remove all">✕</button>
                </div>
            `;
            ul.appendChild(li);
        });

        listsWrapper.appendChild(ul);
    });

    localStorage.setItem('pantry', JSON.stringify(pantry));
}

// Remove ingredients from pantry
document.querySelector('.sidebar').addEventListener('click', (e) => {
    const index = Number(e.target.dataset.index);
    if (Number.isNaN(index)) return;

    if (e.target.classList.contains('remove-all')) {
        pantry.splice(index, 1);
        renderPantry();
        renderDishSections();
    } else if (e.target.classList.contains('remove-amount')) {
        const item = pantry[index];
        const input = prompt(
            `How much ${item.unit} of "${item.name}" do you want to remove?`,
            item.amount
        );
        if (input === null) return;
        const amt = Number(input);
        if (!Number.isFinite(amt) || amt <= 0) return;

        if (amt >= item.amount) {
            pantry.splice(index, 1);
        } else {
            item.amount -= amt;
        }
        renderPantry();
        renderDishSections();
    }
});

function ingredientMatch(recipe, pantryArr) {
    const pantryByName = new Map(pantryArr.map(p => [p.name, p]));
    const missing = [];

    recipe.ingredients.forEach(need => {
        const have = pantryByName.get(need.name);
        if (!have || have.amount < need.amount) {
            missing.push(need);
        }
    });

    const matched = recipe.ingredients.length - missing.length;
    const total   = recipe.ingredients.length;
    const percent = total === 0 ? 0 : Math.round((matched / total) * 100);

    return { matched, total, percent, missing };
}

// Render recipe cards
function createRecipeCard(recipe, pantryArr) {
    const match = ingredientMatch(recipe, pantryArr);

    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id;

    const missingText = match.missing.length
        ? `Missing: ${match.missing.map(m => m.name).join(', ')}`
        : 'You have everything!';

    card.innerHTML = `
        <img
            class="card-photo"
            src="${escapeHtml(recipe.photo)}"
            alt="${escapeHtml(recipe.name)}"
            loading="lazy"
            onerror="this.style.display='none'"
        >
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

function renderRecipes(container, recipes, pantryArr) {
    container.innerHTML = '';

    if (!recipes.length) {
        container.innerHTML = '<p class="comments">No dishes to show yet.</p>';
        return;
    }

    recipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, pantryArr));
    });
}


function renderDishSections() {
    const ranked = RECIPES.map(recipe => ({
        recipe,
        match: ingredientMatch(recipe, pantry)
    }));

    const available = ranked
        .filter(r => r.match.percent === 100)
        .sort((a, b) => a.recipe.time - b.recipe.time)
        .map(r => r.recipe);

    const recommended = ranked
        .filter(r => r.match.percent >= 50 && r.match.percent < 100)
        .sort((a, b) => b.match.percent - a.match.percent)
        .map(r => r.recipe);

    renderRecipes(dishesContainer, available, pantry);
    renderRecipes(recommendedContainer, recommended, pantry);
}

document.querySelector('.main-content').addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (!card) return;
    const id = card.dataset.recipeId;
    window.location.href = `recipe.html?id=${id}`;
    console.log('Clicked recipe:', id);
});


function formatAmount(n) {
    return Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, '');
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[c]));
}

renderPantry();
renderDishSections();