
const userName = localStorage.getItem("userName");

if (!userName) {
    
    window.location.href = "login.html";
} else {
    
    const welcome = document.getElementById("welcome-message");
    if (welcome) {
        welcome.innerText = "GDA Sports Shop - Welcome, " + userName;
    }
}

function logout() {
    window.location.href = "login.html";
}

function filterProducts() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(function(card) {
        const titleText = card.querySelector('.product-title').innerText.toLowerCase();
        if (titleText.includes(searchVal)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}


function filterCategory(category, clickedBtn) {
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });

    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
}


function sortProducts() {
    const sortValue = document.getElementById('sortSelect').value;
    const container = document.getElementById('productsContainer');
    
    
    const products = Array.from(container.querySelectorAll('.product-card'));

    if (sortValue === 'default') {
        window.location.reload(); 
        return;
    }

    products.sort((a, b) => {
        const priceA = parseFloat(a.getAttribute('data-price'));
        const priceB = parseFloat(b.getAttribute('data-price'));

        if (sortValue === 'low') {
            return priceA - priceB; 
        } else if (sortValue === 'high') {
            return priceB - priceA; 
        }
    });

    
    container.innerHTML = "";
    products.forEach(card => {
        container.appendChild(card);
    });
}




let cartItems = JSON.parse(localStorage.getItem("gda_cart")) || [];


updateCartUI();

function addToCart(name, price) {
    
    const product = { name: name, price: price };
    cartItems.push(product);
    
    
    localStorage.setItem("gda_cart", JSON.stringify(cartItems));
    
    
    updateCartUI();
    
    alert(name + " added to cart!");
}


function removeFromCart(productName) {
    
    const index = cartItems.findIndex(item => item.name === productName);
    
    if (index !== -1) {
        cartItems.splice(index, 1);
        
        
        localStorage.setItem("gda_cart", JSON.stringify(cartItems));
        updateCartUI();
        
        console.log(productName + " was removed.");
    } else {
        alert("The product is already in the cart.!");
    }
}


function updateCartUI() {
    const cartBadge = document.getElementById("cart-count");
    if (cartBadge) {
        cartBadge.innerText = cartItems.length;
    }
}