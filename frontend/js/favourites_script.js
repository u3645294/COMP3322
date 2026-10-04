(async function () {
    const { state, action, cards, message, requireUser } = PantryUI;
    const container = document.getElementById('favourites-container');
    await state.ready;
    async function load() {
        requireUser();
        const favorites = (await PantryAPI.favorites()).data.favorites;
        cards(container, favorites);
        document.getElementById('favourites-empty').hidden = favorites.length > 0;
        if (!favorites.length) container.innerHTML = '';
        message('page-status', 'Favourites loaded.');
    }
    document.addEventListener('favorites-changed', () => action(null, 'page-status', load));
    await action(null, 'page-status', load);
})();
