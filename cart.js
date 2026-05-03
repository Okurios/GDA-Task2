// 1. Παίρνουμε τα δεδομένα από τη μνήμη
let cartItems = JSON.parse(localStorage.getItem("gda_cart")) || [];

const tableBody = document.getElementById("cart-table-body");
const totalDisplay = document.getElementById("cart-total-price");

function loadCart() {
    tableBody.innerHTML = "";
    let total = 0;

    if (cartItems.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Your cart is empty.</td></tr>";
    } else {
        cartItems.forEach((item, index) => {
            total += item.price;
            
            let row = `<tr>
                <td>${item.name}</td>
                <td>€ ${item.price.toFixed(2)}</td>
                <td><button onclick="removeItem(${index})" style="color:red; cursor:pointer; border:none; background:none;">Delete ❌</button></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }

    totalDisplay.innerText = `€ ${total.toFixed(2)}`;
}

// 2. Αφαίρεση προϊόντος
function removeItem(index) {
    cartItems.splice(index, 1); 
    localStorage.setItem("gda_cart", JSON.stringify(cartItems)); 
    loadCart(); 
}

// 3. Ολοκλήρωση
function completeOrder() {
    if (cartItems.length === 0) {
        alert("Someone added first!");
        return;
    }
    const method = document.querySelector('input[name="payment"]:checked').value;
    alert("The order was complete within " + method + "! Thank you.");
    
    
    localStorage.removeItem("gda_cart");
    window.location.href = "dashboard.html";
}

loadCart();