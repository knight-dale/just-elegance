import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin 
        }
    });
    if (error) console.error(error.message);
}

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email for the confirmation link!");
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "index.html";
});

document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.user_metadata?.is_admin === true;

    if (window.location.pathname.includes("sales.html")) {
        if (!user || !isAdmin) {
            alert("Access Denied");
            window.location.href = "login.html";
            return false;
        }
    }
    return isAdmin;
}

function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image_url
    });
    localStorage.setItem('justEleganceCart', JSON.stringify(cart));
    alert(`${item.name} added to your selection.`);
}

async function loadProducts(filter = "All") {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    let query = supabase.from('products').select('*').order('created_at', { ascending: true });
    if (filter !== "All") query = query.eq('category', filter);

    const { data: products, error } = await query;
    if (error) return console.error(error);

    grid.innerHTML = ''; 

    products.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const stockText = item.is_in_stock ? 'In Stock' : 'Out of Stock';
        const stockClass = item.is_in_stock ? '' : 'out-of-stock';

        card.innerHTML = `
            <div class="stock-label ${stockClass}">
                ${stockText}
            </div>
            <img src="${item.image_url}" alt="${item.name}">
            <div class="product-info">
                <h3>${item.name}</h3>
                <p><strong>${item.category}</strong> - ${item.placement}</p>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>
                    ${item.is_in_stock ? 'Add to Cart' : 'Unavailable'}
                </button>
            </div>
        `;

        card.querySelector('.cart-trigger').addEventListener('click', async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please log in to shop at Just Elegance!");
                window.location.href = "login.html";
            } else {
                addToCart(item);
            }
        });

        grid.appendChild(card);
    });
}

async function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('order-total');
    if (!cartItemsDiv) return;

    const cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="section-desc">Your selection is empty.</p>';
        totalDisplay.innerText = 'KES 0';
        return;
    }

    cart.forEach(item => {
        total += item.price;
        const itemRow = document.createElement('div');
        itemRow.style = "display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;";
        itemRow.innerHTML = `<span>${item.name}</span><span>KES ${item.price.toLocaleString()}</span>`;
        cartItemsDiv.appendChild(itemRow);
    });
    totalDisplay.innerText = `KES ${total.toLocaleString()}`;
}

document.getElementById('confirm-order')?.addEventListener('click', async () => {
    const address = document.getElementById('shipping-address').value;
    const phone = document.getElementById('mpesa-number').value;
    const totalRaw = document.getElementById('order-total').innerText;
    const totalNumeric = parseFloat(totalRaw.replace(/[^\d.]/g, ''));

    if (!address.trim() || !phone.trim()) {
        alert("Please provide both a delivery address and M-Pesa number.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = "login.html";

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    }

    try {
        const response = await fetch("https://api.instasend.com/v1/payment/stk-push/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer ISPubKey_live_fbe987ba-ded0-4538-ab0c-446f5e0bee5c" 
            },
            body: JSON.stringify({
                amount: totalNumeric,
                phone_number: formattedPhone,
                label: "Just Elegance Lighting"
            })
        });

        const paymentData = await response.json();

        if (response.ok) {
            const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzQ6P05s0JL0mWh8Yx3cnBSjpgFiQhOJdoyxBTo76Q0sqcHxouxU4V-qWHbU3CiACtywQ/exec";
            
            fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors", 
                body: JSON.stringify({ amount: totalNumeric })
            });

            await supabase.from('orders').insert([{ 
                user_id: user.id,
                delivery_address: address,
                total_price: totalNumeric,
                status: 'payout_initiated'
            }]);

            alert("Order placed! Once you enter your M-Pesa PIN, funds will be transferred.");
            localStorage.removeItem('justEleganceCart');
            window.location.href = "index.html";
        } else {
            alert("Payment Error: " + (paymentData.message || "STK Push failed."));
        }
    } catch (err) {
        alert("System Error: " + err.message);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
});

document.getElementById('categoryFilter')?.addEventListener('change', (e) => loadProducts(e.target.value));

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = await checkAdmin();

    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        if (isAdmin && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
    
    loadProducts();
    displayCart();
}
init();