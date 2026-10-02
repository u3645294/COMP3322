const FAV_KEY = 'favourites';

function getFavourites() {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveFavourites(ids) {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

function isFavourite(id) {
    return getFavourites().includes(id);
}

function toggleFavourite(id) {
    const favs = getFavourites();
    const idx  = favs.indexOf(id);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(id);
    }
    saveFavourites(favs);
    // Let other parts of the page react
    window.dispatchEvent(new CustomEvent('favourites:changed', { detail: { id } }));
    return idx < 0;  
}

window.getFavourites  = getFavourites;
window.saveFavourites = saveFavourites;
window.isFavourite    = isFavourite;
window.toggleFavourite = toggleFavourite;