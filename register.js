
const registerForm = document.querySelector('form');

registerForm.addEventListener('submit', function(event) {
    
    event.preventDefault();

    
    const fullName = document.querySelectorAll('input')[0].value;
    const email = document.querySelectorAll('input')[1].value;
    const password = document.querySelectorAll('input')[2].value;


    if (password.length < 8) {
        alert("Password must be at least 8 characters long!");
        return;
    }

    
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userPassword", password);
    localStorage.setItem("userName", fullName);

    
    alert("Registration Successful! Welcome to the team, " + fullName + "!");

    
    window.location.href = "login.html";
    // --- 7. ΛΕΙΤΟΥΡΓΙΑ ΚΑΛΑΘΙΟΥ (CART LOGIC) ---
let cartCount = 0; // Ξεκινάμε με μηδέν προϊόντα

function addToCart() {
    // 1. Αυξάνουμε τον μετρητή κατά 1
    cartCount++;
    
    // 2. Ενημερώνουμε το HTML στοιχείο πάνω δεξιά
    const cartElement = document.getElementById("cart-count");
    cartElement.innerText = cartCount;
    
    // 3. (Προαιρετικό) Ένα μικρό εφέ για να καταλάβει ο χρήστης ότι μπήκε
    alert("Το προϊόν προστέθηκε στο καλάθι! Συνολικά: " + cartCount);
}
});