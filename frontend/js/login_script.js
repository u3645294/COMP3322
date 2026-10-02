const login_form = document.getElementById('login-form');
const signup_form = document.getElementById('signup-form');

if (login_form) {
    login_form.addEventListener('submit', function (event) {
        event.preventDefault();
        window.location.href = '../pages/main.html';
        // Validation will be added later
    });
}

if (signup_form) {
    signup_form.addEventListener('submit', function (event) {
        event.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        window.location.href = '../pages/main.html';
    });
}