import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "../index.html";
});

// --- UTILITIES ---
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= Math.round(rating) ? '★' : '☆';
    }
    return stars;
}

// --- CART LOGIC ---
function addToCart(item) {
    if (!item.is_in_stock) return alert("This item is out of stock.");
    let cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    cart.push({ id: item.id, name: item.name, price: item.price });
    localStorage.setItem('justEleganceCart', JSON.stringify(cart));
    alert(`${item.name} added to cart.`);
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
    cart.forEach((item, index) => {
        total += item.price;
        const itemRow = document.createElement('div');
        itemRow.className = 'cart-item-row';
        itemRow.style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:0.85rem; border-bottom: 1px solid #eee; padding-bottom: 10px;";
        itemRow.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600;">${item.name}</span>
                <span style="color:var(--text-light);">KES ${item.price.toLocaleString()}</span>
            </div>
            <button class="remove-item-btn" data-index="${index}" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:0.75rem; text-decoration:underline;">Remove</button>`;
        cartItemsDiv.appendChild(itemRow);
    });
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.onclick = (e) => {
            let currentCart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
            currentCart.splice(e.target.getAttribute('data-index'), 1);
            localStorage.setItem('justEleganceCart', JSON.stringify(currentCart));
            displayCart();
        };
    });
    totalDisplay.innerText = `KES ${total.toLocaleString()}`;
}

// --- CHECKOUT ---
document.getElementById('confirm-order')?.addEventListener('click', async (e) => {
    const btn = e.target;
    if (btn.disabled) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!user || !session) {
        btn.disabled = false;
        return alert("Session expired. Please log out and back in.");
    }
    const address = document.getElementById('shipping-address').value.trim();
    const phone = document.getElementById('mpesa-number').value.trim();
    const cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    if (!address || !phone || cart.length === 0) return alert("Missing details or empty cart.");
    btn.disabled = true;
    btn.innerText = "Processing...";
    let cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/quick-responder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ cart, phone_number: cleanPhone, address })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`Success! KES ${result.amount} STK Push sent.`);
            localStorage.removeItem('justEleganceCart');
            window.location.href = "../index.html";
        } else {
            throw new Error(result.error || "Payment trigger failed");
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerText = "PLACE ORDER";
        alert("Transaction Error: " + err.message);
    }
});

// --- ADMIN: ADD PRODUCT ---
document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    const newProduct = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        category: document.getElementById('p-category').value,
        placement: document.getElementById('p-placement').value,
        image_url: document.getElementById('p-image').value,
        is_in_stock: true
    };

    const { error } = await supabase.from('products').insert([newProduct]);
    if (error) alert(error.message);
    else {
        alert("Product added successfully!");
        e.target.reset();
        loadInventory();
        loadProducts();
    }
    btn.disabled = false;
});

// --- ADMIN: INVENTORY ---
async function loadInventory() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;
    const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) return;
    
    list.innerHTML = '';
    products.forEach(item => {
        const row = document.createElement('div');
        row.className = 'admin-inventory-card';
        row.style = "display:flex; align-items:center; gap:15px; background:white; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #ddd;";
        row.innerHTML = `
            <img src="${item.image_url}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <div style="flex:1;">
                <h4 style="margin:0;">${item.name}</h4>
                <p style="margin:5px 0; font-size:0.9rem; color:#666;">KES ${item.price.toLocaleString()} | ${item.category}</p>
                <span style="font-size:0.8rem; padding:2px 8px; border-radius:10px; background:${item.is_in_stock ? '#d4edda' : '#f8d7da'}; color:${item.is_in_stock ? '#155724' : '#721c24'};">
                    ${item.is_in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="updateStock('${item.id}', ${!item.is_in_stock})" style="padding:8px 12px; cursor:pointer; background:#eee; border:1px solid #ccc; border-radius:4px;">Toggle Stock</button>
                <button onclick="deleteProduct('${item.id}')" style="padding:8px 12px; cursor:pointer; background:#fff1f0; color:#cf1322; border:1px solid #ffa39e; border-radius:4px;">Delete</button>
            </div>`;
        list.appendChild(row);
    });
}

window.updateStock = async (id, status) => {
    const { error } = await supabase.from('products').update({ is_in_stock: status }).eq('id', id);
    if (error) alert(error.message);
    else loadInventory();
};

window.deleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else loadInventory();
};

// --- ADMIN: ORDERS ---
async function loadOrders() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;
    const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!orders) return;
    list.innerHTML = '';
    orders.forEach(order => {
        const card = document.createElement('div');
        card.style = "background:white; padding:15px; border:1px solid #ddd; margin-bottom:10px; border-radius:8px;";
        card.innerHTML = `
            <p><strong>Order ID:</strong> ${order.id.substring(0,8)} | <strong>Phone:</strong> ${order.customer_phone}</p>
            <p><strong>Status:</strong> <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></p>
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="updateStatus('${order.id}', 'pending')">Pending</button>
                <button onclick="updateStatus('${order.id}', 'in-transit')">In Transit</button>
                <button onclick="updateStatus('${order.id}', 'delivered')">Delivered</button>
            </div>`;
        list.appendChild(card);
    });
}

window.updateStatus = async (id, status) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    loadOrders();
};

// --- CLIENT: PRODUCTS ---
async function loadProducts(filter = "All") {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    let query = supabase.from('products').select('*, product_ratings(total_reviews, average_rating)').order('created_at', { ascending: true });
    if (filter !== "All") query = query.eq('category', filter);
    const { data: products, error } = await query;
    if (error) return;
    grid.innerHTML = ''; 
    products.forEach(item => {
        const stats = item.product_ratings[0] || { total_reviews: 0, average_rating: 0 };
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="stock-label ${item.is_in_stock ? '' : 'out-of-stock'}">${item.is_in_stock ? 'In Stock' : 'Out of Stock'}</div>
            <img src="${item.image_url}" alt="${item.name}">
            <div class="product-info">
                <h3>${item.name}</h3>
                <div class="rating-bar">
                    <span style="color:#f39c12;">${generateStars(stats.average_rating)}</span>
                    <span style="font-size:0.8rem; color:#666;">(${stats.total_reviews} reviews)</span>
                </div>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>${item.is_in_stock ? 'Add to Cart' : 'Unavailable'}</button>
            </div>`;
        card.querySelector('.cart-trigger').onclick = () => addToCart(item);
        grid.appendChild(card);
    });
}

async function loadUserOrders(user) {
    const list = document.getElementById('user-orders-list');
    if (!list || !user) return;
    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!orders) return;
    list.innerHTML = orders.length === 0 ? '<p>No orders yet.</p>' : '';
    orders.forEach(order => {
        const card = document.createElement('div');
        card.style = "border:1px solid #eee; padding:15px; margin-bottom:10px; border-radius:8px;";
        const displayStatus = order.status === 'awaiting_payment' ? 'PENDING' : order.status.toUpperCase();
        card.innerHTML = `<p>Order #${order.id.substring(0,8)} | Status: <span class="status-badge ${order.status}">${displayStatus}</span></p>`;
        list.appendChild(card);
    });
}

// --- INIT ---
async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (window.location.pathname.includes("checkout.html") && !user) {
        window.location.href = "login.html";
        return;
    }
    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        if (document.getElementById('navCartLink')) document.getElementById('navCartLink').style.display = "inline-block";
        if (user?.user_metadata?.is_admin && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
    await Promise.all([loadProducts(), displayCart(), loadUserOrders(user), loadInventory(), loadOrders()]);
}

init();