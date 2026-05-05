/**
 * Sanad Center - Main Application Logic
 * Handles products, cart, ordering, and user profile.
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbx6V72d-tWyfPlU7AlA6LSovbdDP-gbRy-gjVnPmMwFoYbf0ub6AcpIomjGTtwN7UpV4g/exec';

// --- Global State ---
let allProducts = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('sanad_cart') || '[]');
let currentUser = JSON.parse(localStorage.getItem('sanad_user') || 'null');
let navigationHistory = ['page_0'];

function normalizePhone(phone) {
    if (!phone) return '';
    let p = String(phone).trim().replace(/\s+/g, '');
    while (p.length > 0 && p.startsWith('0')) {
        p = p.substring(1);
    }
    return p;
}

function isValidPhone(phone) {
    return /^07[0-9]{8}$/.test(String(phone).trim());
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupGlobalEventListeners();
});

async function initApp() {
    updateCartBadge();
    renderCart();
    await fetchData();
    
    // Check for user login
    if (currentUser) {
        showProfileInfo();
    }

    // Initialize carousel after products (if any are dynamic) or on start
    initCarousel();
}

async function fetchData() {
    try {
        const [prodRes, catRes, setRes] = await Promise.all([
            fetch(`${API_URL}?action=getProducts`),
            fetch(`${API_URL}?action=getCategories`),
            fetch(`${API_URL}?action=getSettings`)
        ]);

        const prodData = await prodRes.json();
        const catData = await catRes.json();
        const setData = await setRes.json();

        if (prodData.status === 'success') allProducts = prodData.products || [];
        if (catData.status === 'success') categories = catData.categories || [];
        
        renderCategories();
        renderProducts();
        applySettings(setData.settings);
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

function applySettings(settings) {
    if (!settings) return;
    if (settings.phone) {
        const waLink = document.getElementById('footer-wa-link');
        const waText = document.getElementById('footer-wa-text');
        if (waLink) waLink.href = `https://api.whatsapp.com/send?phone=${settings.phone.replace(/\s+/g, '')}`;
        if (waText) waText.textContent = settings.phone;
    }
    if (settings.facebook) {
        const fbLink = document.getElementById('footer-fb-link');
        if (fbLink) fbLink.href = settings.facebook;
    }
    if (settings.facebook_name) {
        const fbText = document.getElementById('footer-fb-text');
        if (fbText) fbText.textContent = settings.facebook_name;
    }
}

// --- Navigation ---
window.navigate = function(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) target.style.display = 'block';
    
    if (navigationHistory[navigationHistory.length - 1] !== pageId) {
        navigationHistory.push(pageId);
    }
    
    // Update active state in bottom nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === pageId) {
            btn.classList.add('text-primary');
            btn.classList.remove('text-on-surface-variant');
        } else {
            btn.classList.remove('text-primary');
            btn.classList.add('text-on-surface-variant');
        }
    });

    window.scrollTo(0, 0);

    if (pageId === 'page_7' && currentUser) {
        fetchMyOrders();
    }

    const globalNav = document.getElementById('global-nav');
    if (globalNav) {
        if (pageId === 'page_2') {
            globalNav.style.display = 'none';
        } else {
            globalNav.style.display = 'block';
        }
    }
};

window.goBack = function() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const prevPage = navigationHistory[navigationHistory.length - 1];
        navigate(prevPage);
    } else {
        navigate('page_0');
    }
};

// --- Rendering ---
function renderCategories() {
    const homeGrid = document.getElementById('categories-grid');
    const listingFilters = document.getElementById('listing-category-filters');
    
    // 1. Populate Home Grid
    if (homeGrid) {
        homeGrid.innerHTML = categories.map(cat => `
            <div onclick="filterCategory('${cat.name}')" 
                 class="flex-shrink-0 w-24 flex flex-col items-center gap-2 cursor-pointer group">
                <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center group-hover:bg-primary-light/30 transition-colors">
                    <span class="material-symbols-outlined text-primary text-3xl">${cat.icon || 'category'}</span>
                </div>
                <span class="text-xs font-bold text-on-surface-variant text-center leading-tight">${cat.name}</span>
            </div>
        `).join('');
    }

    // 2. Populate Listing Filters
    if (listingFilters) {
        let html = `
            <button onclick="filterCategory('all')"
                class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-primary text-white font-bold shadow-ambient transition-transform active:scale-95 border-0 cursor-pointer hover:bg-primary/90">الكل</button>
        `;
        html += categories.map(cat => `
            <button onclick="filterCategory('${cat.name}')"
                class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-white text-on-surface-variant font-semibold border border-outline hover:bg-primary-light/20 transition-colors cursor-pointer">${cat.name}</button>
        `).join('');
        listingFilters.innerHTML = html;
    }
}

window.filterCategory = function(catName) {
    navigate('page_1');
    renderProducts(catName);
    
    // Update listing filters
    const filters = document.getElementById('listing-category-filters');
    if (filters) {
        filters.querySelectorAll('button').forEach(btn => {
            const isSelected = btn.textContent.trim() === catName || (catName === 'all' && btn.textContent.trim() === 'الكل');
            if (isSelected) {
                btn.classList.add('bg-primary', 'text-white', 'hover:bg-primary/90');
                btn.classList.remove('bg-white', 'text-on-surface-variant', 'hover:bg-primary-light/20');
            } else {
                btn.classList.remove('bg-primary', 'text-white', 'hover:bg-primary/90');
                btn.classList.add('bg-white', 'text-on-surface-variant', 'hover:bg-primary-light/20');
            }
        });
    }
};

function renderProducts(filter = 'all') {
    const homeGrid = document.getElementById('user-products-grid');
    const listingGrid = document.getElementById('listing-products-grid');
    
    let filtered = allProducts;
    if (filter !== 'all') {
        filtered = allProducts.filter(p => p.category === filter);
    }

    const productHTML = (p) => `
        <div onclick="populateProductDetail('${p.id}')" class="min-w-[200px] w-full bg-surface-container-low rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer snap-start">
            <div class="relative h-48 overflow-hidden">
                <img src="${getDriveImageUrl(p.image)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x400/f1f5f9/1e3a8a?text=${encodeURIComponent(p.name)}'">
                ${p.isBestSeller ? '<span class="absolute top-3 right-3 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-full">الأكثر مبيعاً</span>' : ''}
            </div>
            <div class="p-4">
                <h4 class="font-bold text-on-surface text-sm line-clamp-1 mb-1">${p.name}</h4>
                <p class="text-[10px] text-on-surface-variant mb-3">${p.category}</p>
                <div class="flex justify-between items-center">
                    <span class="text-primary font-black">${p.price} <small class="text-[10px] font-normal">د.أ</small></span>
                    <button onclick="event.stopPropagation(); addToCart('${p.id}')" class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center border-0 cursor-pointer active:scale-90 transition-transform">
                        <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (homeGrid && filter === 'all') {
        const bestSellers = allProducts.filter(p => p.isBestSeller);
        homeGrid.innerHTML = bestSellers.map(productHTML).join('');
    }
    
    if (listingGrid) {
        listingGrid.innerHTML = filtered.map(productHTML).join('');
    }
}

window.populateProductDetail = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    const container = document.getElementById('product-detail-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="space-y-8">
            <div class="relative h-[400px] -mx-4 md:mx-0 md:rounded-3xl overflow-hidden shadow-ambient">
                <img src="${getDriveImageUrl(p.image)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/800x800/f1f5f9/1e3a8a?text=${encodeURIComponent(p.name)}'">
                <button onclick="toggleFavorite('${p.id}')" class="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border-0 cursor-pointer">
                    <span class="material-symbols-outlined ${isFavorite(p.id) ? 'fill-1 text-accent' : ''}">favorite</span>
                </button>
            </div>
            
            <div class="px-2">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-xs font-bold text-primary bg-primary-light/30 px-3 py-1 rounded-full mb-3 inline-block">${p.category}</span>
                        <h2 class="text-3xl font-black text-on-surface leading-tight">${p.name}</h2>
                    </div>
                    <div class="text-left">
                        <span class="text-4xl font-black text-primary">${p.price}</span>
                        <span class="text-sm font-bold text-on-surface-variant block">د.أ</span>
                    </div>
                </div>
                
                <p class="text-on-surface-variant leading-relaxed text-lg mb-8">${p.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>
                
                <div class="grid grid-cols-3 gap-4 mb-10">
                    <div class="bg-surface-container rounded-2xl p-4 text-center">
                        <span class="material-symbols-outlined text-primary mb-1">verified</span>
                        <p class="text-[10px] font-bold text-on-surface-variant uppercase">أصلي 100%</p>
                    </div>
                    <div class="bg-surface-container rounded-2xl p-4 text-center">
                        <span class="material-symbols-outlined text-primary mb-1">local_shipping</span>
                        <p class="text-[10px] font-bold text-on-surface-variant uppercase">توصيل سريع</p>
                    </div>
                    <div class="bg-surface-container rounded-2xl p-4 text-center">
                        <span class="material-symbols-outlined text-primary mb-1">workspace_premium</span>
                        <p class="text-[10px] font-bold text-on-surface-variant uppercase">كفالة ذهبية</p>
                    </div>
                </div>
                
                <div class="mt-12 bg-surface-container rounded-3xl p-6 border border-outline-variant/30 shadow-sm mb-10">
                    <div class="flex flex-col sm:flex-row gap-4 items-center">
                        <div class="flex items-center bg-white rounded-2xl px-4 py-2 shadow-sm border border-outline/10">
                            <button onclick="changeQtyDetail(-1)" class="w-12 h-12 flex items-center justify-center text-primary border-0 bg-transparent cursor-pointer hover:bg-primary-light/10 rounded-full transition-colors"><span class="material-symbols-outlined text-2xl">remove</span></button>
                            <span id="detail-qty" class="w-16 text-center font-black text-xl">1</span>
                            <button onclick="changeQtyDetail(1)" class="w-12 h-12 flex items-center justify-center text-primary border-0 bg-transparent cursor-pointer hover:bg-primary-light/10 rounded-full transition-colors"><span class="material-symbols-outlined text-2xl">add</span></button>
                        </div>
                        <button onclick="addToCart('${p.id}', parseInt(document.getElementById('detail-qty').textContent))" class="w-full sm:flex-1 bg-primary text-on-primary py-5 rounded-2xl font-bold text-xl shadow-ambient active:scale-95 transition-all border-0 cursor-pointer flex items-center justify-center gap-3">
                            <span class="material-symbols-outlined">shopping_cart</span>
                            إضافة للسلة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    navigate('page_2');
};

window.changeQtyDetail = function(delta) {
    const el = document.getElementById('detail-qty');
    let qty = parseInt(el.textContent);
    qty = Math.max(1, qty + delta);
    el.textContent = qty;
};

// --- Cart Logic ---
window.addToCart = function(id, qty = 1) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    const existing = cart.find(x => x.id === id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            qty: qty
        });
    }
    
    saveCart();
    updateCartBadge();
    renderCart();
    showToast('تمت الإضافة للسلة!');
};

function saveCart() {
    localStorage.setItem('sanad_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    badges.forEach(b => {
        b.textContent = total;
        b.style.display = total > 0 ? 'flex' : 'none';
    });
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="py-20 text-center space-y-4">
                <div class="w-24 h-24 rounded-full bg-surface-container mx-auto flex items-center justify-center">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant">shopping_basket</span>
                </div>
                <h3 class="text-xl font-bold text-on-surface">سلتك فارغة</h3>
                <p class="text-on-surface-variant">لم تقم بإضافة أي منتجات للسلة بعد.</p>
                <button onclick="navigate('page_1')" class="bg-primary text-on-primary px-8 py-3 rounded-full font-bold border-0 cursor-pointer">ابدأ التسوق</button>
            </div>
        `;
        document.getElementById('cart-count-header').textContent = 'السلة فارغة';
        updateCartTotals();
        return;
    }

    document.getElementById('cart-count-header').textContent = `لديك ${cart.length} منتجات في السلة`;

    container.innerHTML = cart.map(item => `
        <div class="bg-surface-container-low p-4 rounded-2xl flex gap-4 items-center">
            <div class="w-20 h-20 rounded-xl overflow-hidden bg-surface shrink-0">
                <img src="${getDriveImageUrl(item.image)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/200x200/f1f5f9/1e3a8a?text=${encodeURIComponent(item.name)}'">
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-on-surface text-sm mb-1">${item.name}</h4>
                <p class="text-primary font-black text-sm">${item.price} د.أ</p>
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center bg-surface rounded-lg px-1">
                        <button onclick="changeQty('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-primary border-0 bg-transparent cursor-pointer"><span class="material-symbols-outlined text-sm">remove</span></button>
                        <span class="w-8 text-center font-bold text-xs">${item.qty}</span>
                        <button onclick="changeQty('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-primary border-0 bg-transparent cursor-pointer"><span class="material-symbols-outlined text-sm">add</span></button>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="text-error border-0 bg-transparent cursor-pointer p-1"><span class="material-symbols-outlined text-lg">delete</span></button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartTotals();
}

window.changeQty = function(id, delta) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            updateCartBadge();
            renderCart();
        }
    }
};

window.removeFromCart = function(id) {
    cart = cart.filter(x => x.id !== id);
    saveCart();
    updateCartBadge();
    renderCart();
};

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const regionEl = document.getElementById('detected-region');
    const region = (regionEl && regionEl.value) || (currentUser && currentUser.region) || 'الرمثا';
    const delivery = subtotal > 0 ? (region === 'الرمثا' ? 1.0 : 3.0) : 0;
    const total = subtotal + delivery;

    if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').textContent = `${subtotal.toFixed(2)} د.أ`;
    if (document.getElementById('cart-delivery')) document.getElementById('cart-delivery').textContent = `${delivery.toFixed(2)} د.أ`;
    if (document.getElementById('cart-total')) document.getElementById('cart-total').textContent = `${total.toFixed(2)} د.أ`;
}

// --- Checkout & Ordering ---
window.submitOrderToSheet = async function() {
    const data = {
        ...currentUser,
        notes: document.getElementById('checkout-notes').value.trim(),
        products: cart.map(item => `${item.name} x${item.qty}`).join(' | '),
        total: (cart.reduce((sum, item) => sum + (item.price * item.qty), 0) + (currentUser.region === 'الرمثا' ? 1.0 : 3.0)).toFixed(2) + ' د.أ'
    };
    const name = data.name;
    const phone = data.phone;
    const address = data.address;
    const notes = data.notes;
    const location = data.latlng;
    const region = data.region;

    const productsStr = cart.map(item => `${item.name} x${item.qty}`).join(' | ');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const delivery = region === 'الرمثا' ? 1.0 : 3.0;
    const total = `${(subtotal + delivery).toFixed(2)} د.أ`;

    const orderData = {
        action: 'addOrder',
        customerName: data.customerName || data.name,
        customerPhone: data.customerPhone || data.phone,
        governorate: data.governorate || data.region,
        address: data.address,
        products: data.products,
        total: data.total,
        customerLocation: data.customerLocation || data.latlng,
        notes: data.notes
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();
        if (result.status === 'success') {
            localStorage.setItem('last_order_id', result.orderId);
            // Auto login/save customer
            loginProfile(name, phone);
            showToast('تم إرسال طلبك بنجاح!');
            return true;
        } else {
            showToast('فشل إرسال الطلب: ' + result.message);
            return false;
        }
    } catch (err) {
        console.error('Error submitting order:', err);
        showToast('خطأ في الاتصال بالخادم');
        return false;
    }
};

window.openCheckoutModal = function() {
    if (cart.length === 0) {
        showToast('عذراً، سلتك فارغة!');
        return;
    }
    updateCheckoutView();
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.updateCheckoutView = function() {
    const user = JSON.parse(localStorage.getItem('sanad_user')) || {};
    const hasInfo = user.name && user.phone && user.address && user.region;

    const infoSection = document.getElementById('checkout-info-section');
    const formSection = document.getElementById('checkout-form-section');

    if (hasInfo) {
        document.getElementById('summary-name').textContent = user.name;
        document.getElementById('summary-phone').textContent = user.phone;
        document.getElementById('summary-address').textContent = user.address;
        
        const delivery = user.region === 'الرمثا' ? 1.0 : 3.0;
        document.getElementById('summary-delivery-price').textContent = `${delivery.toFixed(2)} د.أ`;

        infoSection.classList.remove('hidden');
        formSection.classList.add('hidden');
    } else {
        infoSection.classList.add('hidden');
        formSection.classList.remove('hidden');
        
        // Pre-fill form if some info exists
        if (user.name) document.getElementById('checkout-name').value = user.name;
        if (user.phone) document.getElementById('checkout-phone').value = user.phone;
    }
};

window.saveCheckoutInfo = function() {
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const latlng = document.getElementById('checkout-latlng').value;
    let region = document.getElementById('detected-region').value;

    if (!name || !phone || !address) {
        showToast('الرجاء إكمال جميع المعلومات');
        return;
    }

    if (!region) {
        // Fallback detection from text or default
        region = address.includes('الرمثا') ? 'الرمثا' : 'خارج الرمثا';
    }

    if (!isValidPhone(phone)) {
        showToast('يرجى إدخال رقم هاتف صحيح يبدأ بـ 07');
        return;
    }

    const updatedUser = { ...(currentUser || {}), name, phone, address, latlng, region };
    currentUser = updatedUser;
    localStorage.setItem('sanad_user', JSON.stringify(updatedUser));
    
    // Sync with backend
    try {
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveCustomer', name, phone })
        });
    } catch(e) {}
    
    updateCheckoutView();
    showToast('تم حفظ المعلومات بنجاح');
};

window.editCheckoutInfo = function() {
    document.getElementById('checkout-info-section').classList.add('hidden');
    document.getElementById('checkout-form-section').classList.remove('hidden');
};

window.confirmOrder = function() {
    submitCheckout();
};

window.closeCheckoutModal = function() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.submitCheckout = async function() {
    const user = currentUser;
    const notes = document.getElementById('checkout-notes').value.trim();
    const btn = document.getElementById('order-now-btn');

    if (!user.name || !user.phone || !user.address) {
        showToast('معلومات الطلب غير مكتملة');
        return;
    }

    // Show loading state
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> جارٍ إرسال طلبك...';
    btn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        // Send to Google Sheets
        const success = await submitOrderToSheet();
        if (success) {
            cart = [];
            saveCart();
            updateCartBadge();
            renderCart();
            closeCheckoutModal();
            navigate('page_0');
        } else {
            // Re-enable if failed
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    } catch (err) {
        console.error('Checkout error:', err);
        showToast('حدث خطأ أثناء إتمام الطلب');
        btn.disabled = false;
        btn.innerHTML = originalContent;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
};



// --- Profile Logic ---
window.loginProfile = async function(manualName, manualPhone) {
    const name = manualName || document.getElementById('profile-name-input').value.trim();
    const phone = manualPhone || document.getElementById('profile-phone-input').value.trim();

    if (!name || !phone) {
        showToast('يرجى إدخال الاسم والهاتف');
        return;
    }

    if (!isValidPhone(phone)) {
        showToast('رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 10 أرقام');
        return;
    }

    currentUser = { ...(currentUser || {}), name, phone };
    localStorage.setItem('sanad_user', JSON.stringify(currentUser));
    
    // Sync with backend
    try {
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveCustomer', name, phone })
        });
    } catch(e) {}

    showProfileInfo();
    fetchMyOrders();
    showToast('تم تحديث بيانات الحساب');
};

function showProfileInfo() {
    document.getElementById('profile-login-section').style.display = 'none';
    document.getElementById('profile-info-section').style.display = 'block';
    
    document.getElementById('profile-display-name').textContent = currentUser.name;
    document.getElementById('profile-display-phone').textContent = currentUser.phone;
    document.getElementById('profile-avatar').textContent = currentUser.name.substring(0, 2).toUpperCase();
}

window.logoutProfile = function() {
    localStorage.removeItem('sanad_user');
    currentUser = null;
    document.getElementById('profile-login-section').style.display = 'block';
    document.getElementById('profile-info-section').style.display = 'none';
};

window.showEditProfile = function() {
    if (!currentUser) return;
    document.getElementById('profile-edit-name').value = currentUser.name;
    document.getElementById('profile-edit-phone').value = currentUser.phone;
    document.getElementById('profile-edit-form').style.display = 'block';
};

window.saveProfileEdit = function() {
    const name = document.getElementById('profile-edit-name').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    
    if (!name || !phone) {
        showToast('يرجى إدخال الاسم والهاتف');
        return;
    }
    
    loginProfile(name, phone);
    document.getElementById('profile-edit-form').style.display = 'none';
};

let myOrdersCached = [];
async function fetchMyOrders() {
    if (!currentUser) return;
    
    const container = document.getElementById('my-orders-list');
    container.innerHTML = '<p class="text-center text-on-surface-variant py-8">جاري تحميل طلباتك...</p>';
    
    try {
        const res = await fetch(`${API_URL}?action=getMyOrders&phone=${currentUser.phone}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.orders.length > 0) {
            myOrdersCached = data.orders;
            container.innerHTML = data.orders.map(o => `
                <div onclick="showOrderDetail('${o.orderId}')" 
                     class="bg-surface-container p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-surface-container-high transition-all active:scale-[0.98]">
                    <div>
                        <h4 class="font-bold text-on-surface">#${o.orderId}</h4>
                        <p class="text-xs text-on-surface-variant">${new Date(o.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div class="text-left">
                        <span class="text-xs font-bold px-2 py-1 rounded-full ${o.orderStatus === 'تم التوصيل' ? 'bg-green-100 text-green-700' : 'bg-primary-container text-primary'}">${o.orderStatus}</span>
                        <p class="text-sm font-black text-primary mt-1">${o.total}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-center text-on-surface-variant py-8">ليس لديك طلبات سابقة</p>';
        }
    } catch (err) {
        container.innerHTML = '<p class="text-center text-error py-8">خطأ في تحميل البيانات</p>';
    }
}

window.cancelOrder = async function(orderId) {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟')) return;
    
    const btn = document.getElementById('cancel-order-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm align-middle">progress_activity</span> جاري الإلغاء...';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updateOrderStatus', orderId: orderId, status: 'ملغي' })
        });
        const result = await res.json();
        if (result.status === 'success') {
            showToast('تم إلغاء الطلب بنجاح');
            closeOrderDetailModal();
            fetchMyOrders();
        } else {
            showToast('تعذر إلغاء الطلب: ' + (result.message || 'خطأ غير معروف'));
        }
    } catch (err) {
        console.error('Cancel order error:', err);
        showToast('خطأ في الاتصال بالخادم');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// --- Map & Location ---
window.getMyLocation = function() {
    const btn = document.getElementById('location-auto-btn');
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> جاري التحديد...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('checkout-latlng').value = `${lat},${lng}`;
                document.getElementById('checkout-address').value = `تم التحديد تلقائياً (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                detectRegion(lat, lng);
                btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> تم التحديد';
                btn.classList.add('bg-green-100', 'text-green-700');
            },
            () => {
                showToast('تعذر الوصول لموقعك. يرجى الاختيار من الخريطة.');
                btn.innerHTML = '<span class="material-symbols-outlined">my_location</span> تحديد تلقائي';
            }
        );
    }
};

function detectRegion(lat, lng) {
    // Basic logic: If near Ramtha coords (approx)
    // Ramtha approx: 32.55, 36.00
    const ramthaLat = 32.55;
    const ramthaLng = 36.00;
    const dist = Math.sqrt(Math.pow(lat - ramthaLat, 2) + Math.pow(lng - ramthaLng, 2));
    
    const region = dist < 0.1 ? 'الرمثا' : 'خارج الرمثا';
    document.getElementById('detected-region').value = region;
    updateCartTotals();
}

let selectionMap = null;
let selectionMarker = null;

window.openMapSelection = function() {
    const container = document.getElementById('checkout-map-container');
    container.classList.remove('hidden');
    
    if (!selectionMap) {
        selectionMap = L.map('checkoutSelectionMap').setView([32.55, 36.00], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(selectionMap);
        
        selectionMap.on('move', () => {
            const center = selectionMap.getCenter();
            document.getElementById('checkout-latlng').value = `${center.lat},${center.lng}`;
        });
    }
};

window.confirmMapSelection = function() {
    const center = selectionMap.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    document.getElementById('checkout-latlng').value = `${lat},${lng}`;
    document.getElementById('checkout-address').value = `تم التحديد عبر الخريطة (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    detectRegion(lat, lng);
    document.getElementById('checkout-map-container').classList.add('hidden');
    showToast('تم حفظ موقع التوصيل');
};

// --- Helpers ---
function getDriveImageUrl(url) {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

window.showToast = function(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
};

function isFavorite(id) {
    const favs = JSON.parse(localStorage.getItem('sanad_favs') || '[]');
    return favs.includes(id);
}

window.toggleFavorite = function(id) {
    let favs = JSON.parse(localStorage.getItem('sanad_favs') || '[]');
    if (favs.includes(id)) {
        favs = favs.filter(x => x !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem('sanad_favs', JSON.stringify(favs));
    populateProductDetail(id); // re-render to update icon
    renderFavorites();
};

function renderFavorites() {
    const container = document.getElementById('favorites-grid');
    if (!container) return;
    
    const favIds = JSON.parse(localStorage.getItem('sanad_favs') || '[]');
    const favProducts = allProducts.filter(p => favIds.includes(p.id));
    
    if (favProducts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 text-on-surface-variant">لا توجد منتجات في المفضلة</p>';
        return;
    }
    
    container.innerHTML = favProducts.map(p => `
        <div onclick="populateProductDetail('${p.id}')" class="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div class="relative h-40 overflow-hidden">
                <img src="${getDriveImageUrl(p.image)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x400/f1f5f9/1e3a8a?text=${encodeURIComponent(p.name)}'">
            </div>
            <div class="p-3">
                <h4 class="font-bold text-on-surface text-xs line-clamp-1 mb-1">${p.name}</h4>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-primary font-black text-xs">${p.price} د.أ</span>
                    <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="text-accent border-0 bg-transparent cursor-pointer">
                        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">favorite</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Video/Audio Control ---
// --- Video/Audio Control ---
window.toggleVideoAudio = function(e) {
    if (e) e.stopPropagation();
    const vid = document.getElementById('carouselVideo');
    const btn = document.getElementById('videoAudioBtn');
    if (!btn) return;

    const icon = btn.querySelector('.material-symbols-outlined');
    if (!vid) {
        // Fallback for button icon if video missing
        return;
    }

    if (vid.muted) {
        vid.muted = false;
        if (icon) icon.textContent = 'volume_up';
        btn.classList.add('bg-primary/40');
        btn.classList.remove('bg-white/20');
    } else {
        vid.muted = true;
        if (icon) icon.textContent = 'volume_off';
        btn.classList.remove('bg-primary/40');
        btn.classList.add('bg-white/20');
    }
};

// --- Carousel Logic ---
let carouselWrapper, dotsContainer;
let currentPos = 1;
let totalReal = 0;
let isAnimating = false;
let isDragging = false;
let startX = 0;
let carouselInterval;

window.initCarousel = function() {
    carouselWrapper = document.getElementById('carouselWrapper');
    if (!carouselWrapper) return;

    // Remove old clones if any (from previous init)
    carouselWrapper.querySelectorAll('.carousel-clone').forEach(c => c.remove());

    const realSlides = carouselWrapper.querySelectorAll('.carousel-slide');
    totalReal = realSlides.length;
    if (totalReal === 0) return;

    // Clone last slide → prepend, Clone first slide → append
    if (totalReal > 1) {
        const cloneFirst = realSlides[0].cloneNode(true);
        const cloneLast = realSlides[totalReal - 1].cloneNode(true);
        cloneFirst.classList.add('carousel-clone');
        cloneLast.classList.add('carousel-clone');
        // Remove IDs from clones to avoid duplicates
        cloneFirst.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        cloneLast.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        carouselWrapper.appendChild(cloneFirst);
        carouselWrapper.insertBefore(cloneLast, carouselWrapper.firstChild);
    }

    currentPos = 1; // start at first real slide
    clearInterval(carouselInterval);
    isAnimating = false;

    // Jump to position without animation
    setPosition(currentPos, false);
    updateDots();
    setupSwipe();
    handleVideoState();
};

function setPosition(pos, animate) {
    if (!carouselWrapper) return;
    carouselWrapper.style.transition = animate ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    carouselWrapper.style.transform = `translateX(${-pos * 100}%)`;
}

function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    const realIdx = (currentPos - 1 + totalReal) % totalReal; 
    dots.forEach((dot, i) => {
        if (i === realIdx) {
            dot.classList.add('bg-primary', 'w-8');
            dot.classList.remove('bg-white/50', 'w-2.5');
        } else {
            dot.classList.add('bg-white/50', 'w-2.5');
            dot.classList.remove('bg-primary', 'w-8');
        }
    });
}

function goToPos(pos, animate) {
    if (isAnimating || !carouselWrapper) return;
    isAnimating = true;
    currentPos = pos;
    setPosition(currentPos, animate);

    if (animate) {
        const onEnd = () => {
            carouselWrapper.removeEventListener('transitionend', onEnd);
            if (currentPos >= totalReal + 1) {
                currentPos = 1;
                setPosition(currentPos, false);
            } else if (currentPos <= 0) {
                currentPos = totalReal;
                setPosition(currentPos, false);
            }
            updateDots();
            isAnimating = false;
            handleVideoState();
        };
        carouselWrapper.addEventListener('transitionend', onEnd);
    } else {
        updateDots();
        isAnimating = false;
        handleVideoState();
    }
}

window.nextSlide = function() {
    if (totalReal <= 1) return;
    goToPos(currentPos + 1, true);
};

window.prevSlide = function() {
    if (totalReal <= 1) return;
    goToPos(currentPos - 1, true);
};

window.changeSlide = function(realIdx) {
    if (isAnimating) return;
    clearInterval(carouselInterval);
    goToPos(realIdx + 1, true);
};

function handleVideoState() {
    const videoEl = document.getElementById('carouselVideo');
    if (!videoEl) {
        startAutoSlide();
        return;
    }

    const realIdx = (currentPos - 1 + totalReal) % totalReal;
    if (realIdx === 0) {
        clearInterval(carouselInterval);
        videoEl.currentTime = 0;
        let p = videoEl.play();
        if (p !== undefined) p.catch(() => {});
        videoEl.onended = () => window.nextSlide();
    } else {
        videoEl.pause();
        videoEl.currentTime = 0;
        startAutoSlide();
    }
}

function startAutoSlide() {
    clearInterval(carouselInterval);
    if (totalReal <= 1 || isDragging) return;
    carouselInterval = setInterval(() => {
        if (!isAnimating && !isDragging) window.nextSlide();
    }, 5000);
}

function setupSwipe() {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel || carousel._swipeAttached) return;
    carousel._swipeAttached = true;

    carousel.addEventListener('touchstart', (e) => {
        if (isAnimating) return;
        startX = e.touches[0].clientX;
        isDragging = true;
        clearInterval(carouselInterval);
        if (carouselWrapper) carouselWrapper.style.transition = 'none';
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging || !carouselWrapper || isAnimating) return;
        const diff = e.touches[0].clientX - startX;
        const percentMove = (diff / carousel.offsetWidth) * 100;
        // In LTR-style layout (forced by dir="ltr"), dragging left means decreasing the translateX (further negative)
        // pos=1 is -100%. If finger moves left (diff < 0), we want to reach -110%.
        // So we add percentMove (which is negative).
        carouselWrapper.style.transform = `translateX(${(currentPos * -100) + percentMove}%)`;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diff = e.changedTouches[0].clientX - startX;

        if (Math.abs(diff) > 50) {
            if (diff < 0) window.nextSlide(); // Swipe left -> Next
            else window.prevSlide();          // Swipe right -> Prev
        } else {
            setPosition(currentPos, true);
            handleVideoState();
        }
    });
}



function setupGlobalEventListeners() {
    // initCarousel is now called from initApp
}


window.showOrderDetail = function(orderId) {
    const order = myOrdersCached.find(o => o.orderId === orderId);
    if (!order) return;

    document.getElementById('modal-order-id').textContent = `طلب رقم #${order.orderId}`;
    document.getElementById('modal-order-date').textContent = new Date(order.date).toLocaleDateString('ar-EG', { dateStyle: 'long' });
    
    const statusEl = document.getElementById('modal-order-status');
    statusEl.textContent = order.orderStatus;
    
    // Status color
    if (order.orderStatus === 'تم التوصيل') {
        statusEl.className = 'px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold';
    } else if (order.orderStatus === 'ملغي') {
        statusEl.className = 'px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold';
    } else {
        statusEl.className = 'px-3 py-1 rounded-full bg-primary-container text-primary text-xs font-bold';
    }

    // Items
    const itemsContainer = document.getElementById('modal-order-items');
    itemsContainer.innerHTML = order.products.split('|').map(p => {
        const parts = p.trim().split(' x ');
        if (parts.length === 2) {
            return `<div class="flex justify-between items-center text-sm py-1 border-b border-outline-variant/10 last:border-0">
                        <span class="text-on-surface">${parts[0]}</span>
                        <span class="font-bold text-primary">x${parts[1]}</span>
                    </div>`;
        }
        return `<p class="text-sm py-1">${p}</p>`;
    }).join('');

    // Totals
    const totalVal = parseFloat(order.total) || 0;
    const deliveryVal = parseFloat(order.delivery) || 0;
    const subtotalVal = totalVal - deliveryVal;

    document.getElementById('modal-order-subtotal').textContent = `${subtotalVal.toFixed(2)} د.أ`;
    document.getElementById('modal-order-delivery').textContent = `${deliveryVal.toFixed(2)} د.أ`;
    document.getElementById('modal-order-total').textContent = `${totalVal.toFixed(2)} د.أ`;

    // Note
    const noteContainer = document.getElementById('modal-order-note-container');
    if (order.note && order.note.trim()) {
        noteContainer.classList.remove('hidden');
        document.getElementById('modal-order-note').textContent = order.note;
    } else {
        noteContainer.classList.add('hidden');
    }
    
    // Cancel Button Visibility
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) {
        if (order.orderStatus === 'جديد') {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => cancelOrder(orderId);
        } else {
            cancelBtn.classList.add('hidden');
        }
    }

    document.getElementById('orderDetailModal').classList.remove('hidden');
    document.getElementById('orderDetailModal').classList.add('flex');
};

window.closeOrderDetailModal = function() {
    document.getElementById('orderDetailModal').classList.add('hidden');
    document.getElementById('orderDetailModal').classList.remove('flex');
};
