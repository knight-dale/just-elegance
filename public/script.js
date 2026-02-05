import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: window.location.origin + '../index.html' 
        }
    });
    if (error) console.error(error.message);
}

document.getElementById('googleLoginBtn')?.addEventListener('click', signInWithGoogle);

document.getElementById('logInBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "../index.html";
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "../index.html";
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

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log("Auth state changed:", event);
        if (!session && window.location.pathname.includes('checkout')) {
            alert("Your session has timed out. Redirecting to login...");
            window.location.href = "login.html";
        }
    }
});

document.getElementById('confirm-order')?.addEventListener('click', async (e) => {
    const btn = e.target;
    if (btn.disabled) return;

    console.log("--- Starting Checkout Process ---");
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
        console.error("Auth Error: No valid session found.");
        return alert("Session expired. Please log out and back in.");
    }

    const user = session.user;
    console.log("User verified:", user.email);

    const address = document.getElementById('shipping-address').value.trim();
    const phone = document.getElementById('mpesa-number').value.trim();
    const cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];

    console.log("Form Data:", { address, phone, cartItems: cart.length });

    if (!address || !phone || cart.length === 0) {
        console.warn("Validation Failed.");
        return alert("Missing details or empty cart.");
    }

    btn.disabled = true;
    btn.innerText = "Processing...";

    let cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    console.log("Formatted Phone:", cleanPhone);

    try {
        console.log("Calling Edge Function: quick-responder...");
        const response = await fetch(`${supabaseUrl}/functions/v1/quick-responder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': supabaseKey
            },
            body: JSON.stringify({ cart, phone_number: cleanPhone, address })
        });

        console.log("Response Status:", response.status);
        const result = await response.json();
        console.log("Function Result:", result);

        if (response.ok && result.status === 'success') {
            console.log("STK Push Triggered Successfully!");
            alert(`Success! KES ${result.amount} STK Push sent.`);
            localStorage.removeItem('justEleganceCart');
            window.location.href = "../index.html";
        } else {
            console.error("Function Error Detail:", result);
            throw new Error(result.message || result.error || "Invalid JWT or Session Error");
        }
    } catch (err) {
        console.error("Catch Block Error:", err.message);
        btn.disabled = false;
        btn.innerText = "PLACE ORDER";
        alert("Transaction Error: " + err.message);
    }
});

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout Error:", error.message);
        alert("Error logging out: " + error.message);
    } else {
        localStorage.removeItem('justEleganceCart');
        window.location.href = "../index.html";
    }
}

document.querySelectorAll('#logoutBtn, .logout-link').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleLogout();
    });
});

async function loadOrders() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;

    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error(error.message);

    list.innerHTML = '';
    orders.forEach(order => {
        const row = document.createElement('div');
        row.style = "display:flex; align-items:center; justify-content:space-between; gap:15px; background:white; padding:20px; border-bottom:1px solid #eee; font-size:0.85rem;";
        
        const activeStyle = "background:#000; color:#fff; border:none;";
        const offStyle = "background:#f5f5f5; color:#888; border:1px solid #ddd;";

        row.innerHTML = `
            <div style="flex:1; color:#888;">
                #${order.id.substring(0,5)}<br>${new Date(order.created_at).toLocaleDateString()}
            </div>
            <div style="flex:2;">
                <div style="font-weight:600;">${order.cart.map(item => item.name).join(', ')}</div>
                <div style="font-size:0.75rem; color:var(--accent);">${order.customer_phone || 'No Phone'}</div>
            </div>
            <div style="flex:1; font-weight:600;">KES ${order.total_price.toLocaleString()}</div>
            <div style="flex:2; color:#555;">${order.delivery_address}</div>
            
            <div style="flex:3; display:flex; gap:5px; justify-content:flex-end;">
                <button onclick="updateOrderStatus('${order.id}', 'pending')" 
                    style="padding:6px 10px; cursor:pointer; font-size:0.7rem; border-radius:4px; ${order.status === 'pending' ? activeStyle : offStyle}">Pending</button>
                <button onclick="updateOrderStatus('${order.id}', 'received')" 
                    style="padding:6px 10px; cursor:pointer; font-size:0.7rem; border-radius:4px; ${order.status === 'received' ? activeStyle : offStyle}">Paid</button>
                <button onclick="updateOrderStatus('${order.id}', 'in-transit')" 
                    style="padding:6px 10px; cursor:pointer; font-size:0.7rem; border-radius:4px; ${order.status === 'in-transit' ? activeStyle : offStyle}">Transit</button>
                <button onclick="updateOrderStatus('${order.id}', 'delivered')" 
                    style="padding:6px 10px; cursor:pointer; font-size:0.7rem; border-radius:4px; ${order.status === 'delivered' ? activeStyle : offStyle}">Delivered</button>
            </div>
        `;
        list.appendChild(row);
    });
}

window.updateOrderStatus = async (id, status) => {
    const { error } = await supabase
        .from('orders')
        .update({ status: status })
        .eq('id', id);
    
    if (error) {
        alert("Error updating status: " + error.message);
    } else {
        loadOrders(); 
        const { data: { user } } = await supabase.auth.getUser();
        if (user) loadUserOrders(user);
    }
};

async function loadUserOrders(user) {
    const list = document.getElementById('user-orders-list');
    if (!list || !user) return;
    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    list.innerHTML = orders.length === 0 ? '<p>No orders yet.</p>' : '';
    const labels = { 'pending': 'PENDING', 'received': 'PAYMENT RECEIVED', 'in-transit': 'IN TRANSIT', 'delivered': 'DELIVERED' };
    orders.forEach(order => {
        const card = document.createElement('div');
        card.style = "padding:15px; border:1px solid #eee; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;";
        card.innerHTML = `
            <div><strong>Order #${order.id.substring(0,8)}</strong><br><span style="font-size:0.8rem; color:#888;">${order.cart.map(i => i.name).join(', ')}</span></div>
            <span style="font-weight:bold; color:var(--accent); font-size:0.8rem; letter-spacing:1px;">${labels[order.status] || order.status.toUpperCase()}</span>`;
        list.appendChild(card);
    });
}

document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    const fileInput = document.getElementById('pImage');
    let imageUrl = "";
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error: uploadError } = await supabase.storage.from('curtain-photos').upload(fileName, file);
        if (uploadError) {
            alert("Upload Error: " + uploadError.message);
            btn.disabled = false;
            return;
        }
        imageUrl = supabase.storage.from('curtain-photos').getPublicUrl(fileName).data.publicUrl;
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
    if (error) alert("Error: " + error.message);
    else {
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
        row.style = "display:flex; align-items:center; justify-content:space-between; gap:20px; background:white; padding:10px 20px; border-bottom:1px solid #eee; min-height:60px;";
        row.innerHTML = `
            <img src="${item.image_url}" style="width:45px; height:45px; object-fit:cover; border-radius:4px; flex-shrink:0;">
            <input type="text" value="${item.name}" id="edit-name-${item.id}" style="flex:2; border:none; font-weight:500; font-family:inherit; padding:5px;">
            <div style="flex:1; display:flex; align-items:center; gap:5px;">
                <span style="font-size:0.8rem; color:#888;">KES</span>
                <input type="number" value="${item.price}" id="edit-price-${item.id}" style="width:80px; border:none; font-family:inherit; padding:5px;">
            </div>
            <div style="flex:1; text-align:center;">
                <span onclick="updateStock('${item.id}', ${!item.is_in_stock})" style="cursor:pointer; font-size:0.75rem; padding:4px 8px; border-radius:4px; font-weight:bold; background:${item.is_in_stock ? '#e6f4ea' : '#fce8e6'}; color:${item.is_in_stock ? '#1e7e34' : '#d93025'}; text-transform:uppercase;">
                    ${item.is_in_stock ? 'IN STOCK' : 'OUT OF STOCK'}
                </span>
            </div>
            <div style="display:flex; gap:15px; align-items:center;">
                <button onclick="saveProduct('${item.id}')" style="background:#000; color:#fff; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:0.75rem;">SAVE</button>
                <button onclick="deleteProduct('${item.id}')" style="background:none; border:none; color:#d93025; cursor:pointer; font-size:1.1rem; font-weight:bold;">&times;</button>
            </div>`;
        list.appendChild(row);
    });
}

window.saveProduct = async (id) => {
    const newName = document.getElementById(`edit-name-${id}`).value;
    const newPrice = parseFloat(document.getElementById(`edit-price-${id}`).value);
    const { error } = await supabase.from('products').update({ name: newName, price: newPrice }).eq('id', id);
    if (error) alert(error.message);
    else {
        alert("Product updated!");
        loadInventory();
        loadProducts();
    }
};

window.updateStock = async (id, status) => {
    await supabase.from('products').update({ is_in_stock: status }).eq('id', id);
    loadInventory();
};

window.deleteProduct = async (id) => {
    if (!confirm("Delete permanently?")) return;
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

document.getElementById('forgotPasswordBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;

    if (!email) {
        alert("Please enter your email address first.");
        return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/public/reset-password.html',
    });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Password reset link sent to your email!");
    }
});

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        if (document.getElementById('navCartLink')) document.getElementById('navCartLink').style.display = "inline-block";
        if (user?.user_metadata?.is_admin && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
    await Promise.all([
        loadProducts(), 
        displayCart(), 
        loadInventory(), 
        loadOrders(), 
        loadUserOrders(user)
    ]);
}

init();