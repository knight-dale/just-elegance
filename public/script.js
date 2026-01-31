import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) console.error(error.message);
}

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check your email for confirmation!");
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
    const isAdmin = !!user?.user_metadata?.is_admin;
    if (window.location.pathname.includes("sales.html") && (!user || !isAdmin)) {
        alert("Access Denied");
        window.location.href = "login.html";
        return false;
    }
    return isAdmin;
}

function addToCart(item) {
    let cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    cart.push({ id: item.id, name: item.name, price: item.price, image: item.image_url });
    localStorage.setItem('justEleganceCart', JSON.stringify(cart));
    alert(`${item.name} added to selection.`);
}

async function loadProducts(filter = "All") {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    let query = supabase.from('products').select('*').order('created_at', { ascending: true });
    if (filter !== "All") query = query.eq('category', filter);
    const { data: products, error } = await query;
    if (error) return console.error(error);
    const fragment = document.createDocumentFragment();
    grid.innerHTML = ''; 
    products.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const stockText = item.is_in_stock ? 'In Stock' : 'Out of Stock';
        const stockClass = item.is_in_stock ? '' : 'out-of-stock';
        card.innerHTML = `
            <div class="stock-label ${stockClass}">${stockText}</div>
            <img src="${item.image_url}" alt="${item.name}" loading="lazy">
            <div class="product-info">
                <h3>${item.name}</h3>
                <p><strong>${item.category}</strong> - ${item.placement}</p>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>
                    ${item.is_in_stock ? 'Add to Cart' : 'Unavailable'}
                </button>
            </div>`;
        card.querySelector('.cart-trigger').addEventListener('click', async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert("Please log in!"); window.location.href = "login.html"; }
            else addToCart(item);
        });
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

async function loadInventory() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;
    const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const fragment = document.createDocumentFragment();
    list.innerHTML = '';
    products.forEach(item => {
        const row = document.createElement('div');
        row.className = 'admin-item-row';
        row.innerHTML = `
            <img src="${item.image_url}" width="60">
            <div><label>Name:</label><input type="text" value="${item.name}" id="edit-name-${item.id}"></div>
            <div><label>Price:</label><input type="number" value="${item.price}" id="edit-price-${item.id}"></div>
            <div class="checkbox-group"><input type="checkbox" id="edit-stock-${item.id}" ${item.is_in_stock ? 'checked' : ''}><span>In Stock</span></div>
            <div class="admin-actions">
                <button class="save-btn" data-id="${item.id}">Save</button>
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>`;
        row.querySelector('.save-btn').onclick = () => updateProduct(item.id);
        row.querySelector('.delete-btn').onclick = () => deleteProduct(item.id);
        fragment.appendChild(row);
    });
    list.appendChild(fragment);
}

window.updateProduct = async (id) => {
    const name = document.getElementById(`edit-name-${id}`).value;
    const price = document.getElementById(`edit-price-${id}`).value;
    const is_in_stock = document.getElementById(`edit-stock-${id}`).checked;
    const { error } = await supabase.from('products').update({ name, price: parseFloat(price), is_in_stock }).eq('id', id);
    if (error) alert(error.message); else alert("Updated!");
};

window.deleteProduct = async (id) => {
    if (confirm("Delete item?")) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message); else loadInventory();
    }
};

document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Uploading...";
    const name = document.getElementById('pName').value;
    const price = document.getElementById('pPrice').value;
    const category = document.getElementById('pCategory').value;
    const placement = document.getElementById('pPlacement').value;
    const stock = document.getElementById('pStock').checked;
    const file = document.getElementById('pImage').files[0];
    try {
        const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
        const filePath = `products/${fileName}`;
        await supabase.storage.from('curtain-photos').upload(filePath, file);
        const { data: { publicUrl } } = supabase.storage.from('curtain-photos').getPublicUrl(filePath);
        await supabase.from('products').insert([{ name, price: parseFloat(price), image_url: publicUrl, is_in_stock: stock, category, placement }]);
        alert("Added!");
        document.getElementById('upload-form').reset();
        loadInventory();
    } catch (err) { alert(err.message); }
    finally { btn.disabled = false; btn.innerText = "Upload Product"; }
});

async function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('order-total');
    if (!cartItemsDiv) return;
    const cart = JSON.parse(localStorage.getItem('justEleganceCart')) || [];
    cartItemsDiv.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="section-desc">Empty.</p>';
        totalDisplay.innerText = 'KES 0';
        return;
    }
    cart.forEach(item => {
        total += item.price;
        const row = document.createElement('div');
        row.style = "display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.85rem;";
        row.innerHTML = `<span>${item.name}</span><span>KES ${item.price.toLocaleString()}</span>`;
        cartItemsDiv.appendChild(row);
    });
    totalDisplay.innerText = `KES ${total.toLocaleString()}`;
}

document.getElementById('confirm-order')?.addEventListener('click', async () => {
    const address = document.getElementById('shipping-address').value;
    const phone = document.getElementById('mpesa-number').value.trim();
    const totalRaw = document.getElementById('order-total').innerText;
    const totalNumeric = parseFloat(totalRaw.replace(/[^\d.]/g, ''));

    if (!address || !phone) return alert("Please fill all fields.");

    let cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) cleanPhone = '254' + cleanPhone;

    if (cleanPhone.length !== 12) {
        return alert("Invalid phone format. Use 07... or 254...");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = "login.html";

    try {
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwC7T4mQKvhk66vgY_yfCnHbgqR_jm3ZeSvcukWKPKL5Q6xYUVnisZXtq9h7dmK4UqdVA/exec";

        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ 
                amount: totalNumeric,
                phone_number: cleanPhone
            })
        });

        await supabase.from('orders').insert([{ 
            user_id: user.id,
            delivery_address: address,
            total_price: totalNumeric,
            status: 'awaiting_payment'
        }]);

        alert("Prompt sent! Please enter your PIN to deposit funds.");
        localStorage.removeItem('justEleganceCart');
        window.location.href = "index.html";

    } catch (err) {
        alert("Request failed: " + err.message);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
});

document.getElementById('categoryFilter')?.addEventListener('change', (e) => loadProducts(e.target.value));

async function init() {
    const [userRes] = await Promise.all([supabase.auth.getUser(), loadProducts(), loadInventory(), displayCart()]);
    const user = userRes.data.user;
    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        const isAdmin = !!user?.user_metadata?.is_admin;
        if (isAdmin && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
}
init();