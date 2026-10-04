(async function () {
    const block = document.querySelector('.nav-user');
    const button = document.querySelector('.user-btn');
    button.addEventListener('click', () => {
        block.classList.toggle('open');
        button.setAttribute('aria-expanded', String(block.classList.contains('open')));
    });
    document.addEventListener('click', event => {
        if (!block.contains(event.target)) {
            block.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        }
    });
    document.querySelectorAll('.nav-tabs a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === window.location.pathname.split('/').pop());
    });
    const state = await PantryUI.state.ready;
    document.querySelector('.user-name').textContent = state.user?.displayName || 'Guest';
    document.querySelector('.user-avatar').textContent = (state.user?.displayName || 'G').charAt(0).toUpperCase();
    const logout = document.querySelector('.logout-btn');
    logout.textContent = state.user ? 'Log out' : 'Sign in';
    logout.addEventListener('click', () => PantryUI.action(logout, 'page-status', async () => {
        if (state.user) await PantryAPI.logout();
        window.location.href = 'login.html';
    }));
    if (state.error) PantryUI.message('page-status', state.error.message, true);
})();
