const form = document.querySelector('#login-form, #signup-form');
form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('auth-status');
    button.disabled = true;
    status.textContent = 'Signing in…';
    try {
        const body = { email: form.elements.email.value.trim(), password: form.elements.password.value };
        if (form.id === 'signup-form') {
            if (body.password !== form.elements['confirm-password'].value) throw new Error('Passwords do not match.');
            body.displayName = form.elements.displayName.value.trim();
            await PantryAPI.register(body);
        } else await PantryAPI.login(body);
        window.location.href = 'main.html';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
});
document.getElementById('check-health').addEventListener('click', async event => {
    event.target.disabled = true;
    const status = document.getElementById('health-status');
    status.textContent = 'Checking…';
    try {
        const result = await PantryAPI.health();
        status.textContent = result.data.status === 'ok' ? 'Connected.' : 'Server unavailable.';
    } catch (error) { status.textContent = error.message; }
    finally { event.target.disabled = false; }
});
