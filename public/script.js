import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const supabaseUrl = 'https://sigvvutzispubojrjdrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3Z2dXR6aXNwdWJvanJqZHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjY3NzQsImV4cCI6MjA4NTMwMjc3NH0.z9y352u4sJNC4xoT10M-ikuVBm5OizUAyvGBIX2BCBU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) console.error(error.message);
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
});

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= Math.round(rating) ? '★' : '☆';
    }
    return stars;
}

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
                    <span style="font-size:0.8rem; color:#666;">(${stats.total_reviews})</span>
                </div>
                <span class="price">KES ${item.price.toLocaleString()}</span>
                <button class="cart-trigger add-btn" ${item.is_in_stock ? '' : 'disabled'}>Add to Cart</button>
            </div>`;
        card.querySelector('.cart-trigger').onclick = () => addToCart(item);
        grid.appendChild(card);
    });
}

async function loadUserOrders(user) {
    const list = document.getElementById('user-orders-list');
    if (!list || !user) return;

    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    list.innerHTML = orders.length === 0 ? '<p>No orders yet.</p>' : '';
    
    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.style = "border:1px solid #eee; padding:15px; margin-bottom:10px; border-radius:8px;";
        card.innerHTML = `
            <p>Order #${order.id.substring(0,8)} | Status: <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span></p>
            ${order.status === 'delivered' ? `<button class="primary-btn" onclick="openReviewModal('${order.id}')">Rate Purchase</button>` : ''}
        `;
        list.appendChild(card);
    });
}

window.openReviewModal = async (orderId) => {
    const modal = document.getElementById('review-modal');
    modal.style.display = 'block';
    
    document.getElementById('submit-review-btn').onclick = async () => {
        if (activeRating === 0) return alert("Select a rating.");
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('reviews').insert([{ 
            user_id: user.id, 
            rating: activeRating,
            order_id: orderId 
        }]);
        
        if (error) alert("Rating failed.");
        else { alert("Success!"); modal.style.display = 'none'; location.reload(); }
    };
};

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
        if (user?.user_metadata?.is_admin && document.getElementById('adminLink')) {
            document.getElementById('adminLink').style.display = "inline-block";
        }
    }

    await Promise.all([loadProducts(), loadUserOrders(user)]);
}

init();