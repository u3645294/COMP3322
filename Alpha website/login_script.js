const form = document.getElementById('login-form');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    window.location.href = 'main.html';
    // To be implemented: Validate user credentials and handle login logic
});