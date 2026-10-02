(function initNavbar() {
    const userBlock = document.querySelector('.nav-user');
    const userBtn   = document.querySelector('.user-btn');
    const logoutBtn = document.querySelector('.logout-btn');

    if (!userBlock || !userBtn) return;

    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userBlock.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!userBlock.contains(e.target)) {
            userBlock.classList.remove('open');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmed = confirm('Log out of Pantry Chef?');
            if (!confirmed) return;

            // To be implemented: clear user session data

            window.location.href = 'login.html';
        });
    }

    const currentPath = window.location.pathname.split('/').pop() || 'main.html';
    document.querySelectorAll('.nav-tabs a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });

    // Replace with real user data later
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) {
        const stored = localStorage.getItem('username');
        userNameEl.textContent = stored || 'Guest';
    }
})();