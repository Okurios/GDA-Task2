
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', function(event) {

    event.preventDefault();


    const emailInput = document.getElementById('login-email').value;
    const passwordInput = document.getElementById('login-password').value;

    
    const storedEmail = localStorage.getItem("userEmail");
    const storedPassword = localStorage.getItem("userPassword");
    const storedName = localStorage.getItem("userName");

    
    if (emailInput === storedEmail && passwordInput === storedPassword) {
        
        
        alert("Welcome back, " + (storedName || "User") + "! Login Successful.");
        
    
        window.location.href = "dashboard.html";
        
    } else {
        
        
        alert("Invalid Email or Password! Please try again or Register first.");
    }
});