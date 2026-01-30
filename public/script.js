import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);
const adminEmail = "jonahjjed@gmail.com";

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== adminEmail) {
        if (window.location.pathname.includes("sales.html")) {
            alert("Access Denied");
            window.location.href = "login.html";
        }
    }
}
checkAdmin();

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
        card.innerHTML = `
            <div class="stock-label ${item.is_in_stock ? '' : 'out-of-stock'}">
                ${item.is_in_stock ? 'In Stock' : 'Out of Stock'}
            </div>
            <img src="${item.image_url}" alt="${item.name}">
            <div class="product-info">
                <h3>${item.name}</h3>
                <p><strong>${item.category}</strong> - ${item.placement}</p>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>
                    Add to Cart
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

async function loadInventory() {
    const list = document.getElementById('admin-product-list');
    if (!list) return;

    const { data: products, error } = await supabase
        .from('products').select('*').order('created_at', { ascending: false });

    if (error) return console.error(error);
    list.innerHTML = '';

    products.forEach(item => {
        const row = document.createElement('div');
        row.className = 'admin-item-row';
        row.innerHTML = `
            <img src="${item.image_url}" width="60">
            <div>
                <label>Name:</label>
                <input type="text" value="${item.name}" id="edit-name-${item.id}">
            </div>
            <div>
                <label>Price:</label>
                <input type="number" value="${item.price}" id="edit-price-${item.id}">
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="edit-stock-${item.id}" ${item.is_in_stock ? 'checked' : ''}>
                <span>In Stock</span>
            </div>
            <div class="admin-actions">
                <button onclick="updateProduct('${item.id}')" class="save-btn">Save</button>
                <button onclick="deleteProduct('${item.id}')" class="delete-btn">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });
}

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
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        let { error: uploadError } = await supabase.storage.from('curtain-photos').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('curtain-photos').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('products').insert([{ 
            name, price: parseFloat(price), image_url: publicUrl, is_in_stock: stock, category, placement
        }]);

        if (dbError) throw dbError;
        alert("Added successfully!");
        document.getElementById('upload-form').reset();
        loadInventory();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Upload Product";
    }
});

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
                "Authorization": "Bearer YOUR_PUBLISHABLE_KEY"
            },
            body: JSON.stringify({
                amount: totalNumeric,
                phone_number: formattedPhone,
                label: "Just Elegance Lighting"
            })
        });

        const paymentData = await response.json();

        if (response.ok) {
            const { error } = await supabase.from('orders').insert([{ 
                user_id: user.id,
                delivery_address: address,
                total_price: totalNumeric,
                status: 'pending_payment'
            }]);

            if (error) throw error;

            alert("Prompt sent! Enter your M-Pesa PIN on your phone to complete the order.");
            localStorage.removeItem('justEleganceCart');
            window.location.href = "index.html";
        } else {
            alert("Payment Error: " + (paymentData.message || "Could not initiate STK Push."));
        }
    } catch (err) {
        alert("System Error: " + err.message);
    }
});

window.updateProduct = async (id) => {
    const newName = document.getElementById(`edit-name-${id}`).value;
    const newPrice = document.getElementById(`edit-price-${id}`).value;
    const newStock = document.getElementById(`edit-stock-${id}`).checked;
    const { error } = await supabase.from('products').update({ name: newName, price: parseFloat(newPrice), is_in_stock: newStock }).eq('id', id);
    if (error) alert(error.message); else alert("Updated!");
};

window.deleteProduct = async (id) => {
    if(confirm("Delete item?")) {
        await supabase.from('products').delete().eq('id', id);
        loadInventory();
    }
};

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
});

document.getElementById('categoryFilter')?.addEventListener('change', (e) => loadProducts(e.target.value));

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        if (document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').style.display = "none";
        if (document.getElementById('navProfileLink')) document.getElementById('navProfileLink').style.display = "inline-block";
        if (user.email === adminEmail && document.getElementById('adminLink')) document.getElementById('adminLink').style.display = "inline-block";
    }
    loadProducts();
    loadInventory();
    displayCart();
}
init();