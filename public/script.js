import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

document.getElementById('logInBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "../index.html";
});

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= Math.round(rating) ? '★' : '☆';
    }
    return stars;
}

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

document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;

    const fileInput = document.getElementById('pImage');
    let imageUrl = "";

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
        if (uploadError) {
            alert("Image upload failed: " + uploadError.message);
            btn.disabled = false;
            return;
        }
        imageUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
    }

    const newProduct = {
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        category: document.getElementById('pCategory').value,
        placement: document.getElementById('pPlacement').value,
        image_url: imageUrl,
        is_in_stock: document.getElementById('pStock').checked
    };

    const { error } = await supabase.from('products').insert([newProduct]);
    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Product uploaded successfully!");
        e.target.reset();
        loadInventory();
    }
    btn.disabled = false;
});

async function loadInventory() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;
    const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!products) return;
    list.innerHTML = '';
    products.forEach(item => {
        const row = document.createElement('div');
        row.style = "display:flex; align-items:center; gap:15px; background:white; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #ddd;";
        row.innerHTML = `
            <img src="${item.image_url}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
            <div style="flex:1;">
                <h4 style="margin:0;">${item.name}</h4>
                <p style="margin:2px 0; font-size:0.8rem; color:#666;">KES ${item.price.toLocaleString()} | ${item.is_in_stock ? 'In Stock' : 'Out'}</p>
            </div>
            <button onclick="updateStock('${item.id}', ${!item.is_in_stock})">Toggle Stock</button>
            <button onclick="deleteProduct('${item.id}')" style="color:red;">Delete</button>`;
        list.appendChild(row);
    });
}

window.updateStock = async (id, status) => {
    await supabase.from('products').update({ is_in_stock: status }).eq('id', id);
    loadInventory();
};

window.deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from('products').delete().eq('id', id);
    loadInventory();
};

async function loadProducts(filter = "All") {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    let query = supabase.from('products').select('*, product_ratings(total_reviews, average_rating)').order('created_at', { ascending: true });
    if (filter !== "All") query = query.eq('category', filter);
    const { data: products } = await query;
    if (!products) return;
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
                    <span style="font-size:0.8rem; color:#666;">(${stats.total_reviews})</span>
                </div>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>${item.is_in_stock ? 'Add to Cart' : 'Unavailable'}</button>
            </div>`;
        card.querySelector('.cart-trigger').onclick = () => addToCart(item);
        grid.appendChild(card);
    });
}

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        if (document.getElementById('navCartLink')) document.getElementById('navCartLink').style.display = "inline-block";
        if (user?.user_metadata?.is_admin && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
    await Promise.all([loadProducts(), displayCart(), loadInventory()]);
}

init();