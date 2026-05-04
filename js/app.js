// سند سنتر — منطق التطبيق (قاعدة بيانات Google Sheets)
// ── الإعدادات ──
const API_URL = 'https://script.google.com/macros/s/AKfycbx6V72d-tWyfPlU7AlA6LSovbdDP-gbRy-gjVnPmMwFoYbf0ub6AcpIomjGTtwN7UpV4g/exec';

const STORAGE_KEYS = {
    PRODUCTS: 'sanadcenter_products',
    CATEGORIES: 'sanadcenter_categories',
    SETTINGS: 'sanadcenter_settings',
    CART: 'sanadcenter_cart',
    FAVORITES: 'sanadcenter_favorites'
};

// ── State ──
let allProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
let allCategories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
let allSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
let currentPage = 'page_0';

// -- Location & Map State --
let selectionMap = null;
let selectionMarker = null;
let currentCoords = { lat: 32.5514, lng: 36.0114 }; // Default: Ramtha

// ── Google Drive Image Helper ──
function getDriveImageUrl(url) {
    if (!url) return 'assets/images/ball.png'; // fallback
    const trimmed = url.trim();
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return `https://lh3.googleusercontent.com/d/${match2[1]}`;
    return trimmed;
}

// ── Data Management ──
async function fetchData() {
    if (!API_URL) return;

    try {
        const [prodRes, catRes, setRes] = await Promise.all([
            fetch(`${API_URL}?action=getProducts`),
            fetch(`${API_URL}?action=getCategories`),
            fetch(`${API_URL}?action=getSettings`)
        ]);

        const prodData = await prodRes.json();
        const catData = await catRes.json();
        const setData = await setRes.json();

        if (prodData.status === 'success') {
            allProducts = prodData.products.map(p => ({
                ...p,
                id: String(p.id),
                image: getDriveImageUrl(p.image)
            }));
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProducts));
        }

        if (catData.status === 'success') {
            allCategories = catData.categories || [];
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(allCategories));
        }

        if (setData.status === 'success') {
            allSettings = setData.settings || {};
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(allSettings));
        }

        renderAll();
        initHeroSlider(); // Initialize slider ONCE after data loads
        applySettings();
    } catch (err) {
        console.error('Failed to fetch data:', err);
    }
}

function applySettings() {
    // WhatsApp
    const waLink = document.getElementById('footer-wa-link');
    const waText = document.getElementById('footer-wa-text');
    if (allSettings.phone) {
        const cleanPhone = allSettings.phone.replace(/\s+/g, '').replace('+', '');
        if (waLink) waLink.href = `https://wa.me/${cleanPhone}`;
        if (waText) waText.textContent = allSettings.phone;
    }

    // Facebook
    const fbLink = document.getElementById('footer-fb-link');
    const fbText = document.getElementById('footer-fb-text');
    if (allSettings.facebook) {
        if (fbLink) fbLink.href = allSettings.facebook;
    }
    if (allSettings.facebook_name) {
        if (fbText) fbText.textContent = allSettings.facebook_name;
    }
}

// Flag to track if the hero slider has been initialized
let heroSliderInitialized = false;

function renderAll() {
    renderUserProducts(); // Best Sellers
    renderCategories();
    renderListingProducts();
    updateListingCategoryButtons();
    updateCartBadges();
}

// Called ONCE after data is fetched to set up the slider
function initHeroSlider() {
    if (heroSliderInitialized) return;
    renderHeroSlider();
    heroSliderInitialized = true;
    // Re-init the carousel from index.html's carousel logic
    if (typeof initCarousel === 'function') {
        initCarousel();
    }
}

// ── UI Rendering ──

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    if (allCategories.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-4">جاري تحميل الأقسام...</p>';
        return;
    }

    grid.innerHTML = allCategories.map(cat => `
        <button onclick="filterCategory('${cat.name}')"
            class="bg-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-primary-light/20 cursor-pointer group border border-outline min-w-[120px] flex-shrink-0 shadow-ambient">
            <div class="w-16 h-16 rounded-full bg-primary-light/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-primary text-3xl">${cat.icon || 'category'}</span>
            </div>
            <span class="font-bold text-on-surface text-sm whitespace-nowrap">${cat.name}</span>
        </button>
    `).join('');
}

function renderHeroSlider() {
    const wrapper = document.getElementById('carouselWrapper');
    const dotsContainer = document.getElementById('carouselDots');
    if (!wrapper || !dotsContainer) return;

    const sliderProducts = allProducts.filter(p => p.inSlider);

    // Slide 0: Video Banner (always present)
    let wrapperHTML = `
        <div class="carousel-slide min-w-full h-full relative" data-slide="0">
            <video id="carouselVideo" class="w-full h-full object-cover" playsinline muted autoplay>
                <source src="assets/videos/demo.mp4" type="video/mp4">
            </video>
            <div class="absolute inset-0 bg-black/20 pointer-events-none"></div>
            <div class="absolute bottom-0 right-0 p-8 text-white text-right max-w-lg pointer-events-none">
                <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight">شاهد مجموعتنا الجديدة</h2>
                <p class="text-white/80 mb-6 font-medium">تجربة تسوق فريدة تنتظرك.</p>
            </div>
            <button id="videoAudioBtn" onclick="toggleVideoAudio(event)" class="absolute bottom-8 left-8 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border-0 cursor-pointer z-10">
                <span class="material-symbols-outlined text-xl">volume_off</span>
            </button>
        </div>
    `;

    // Slide 1: Static Hero Banner (always present)
    wrapperHTML += `
        <div class="carousel-slide min-w-full h-full relative" data-slide="1">
            <img class="w-full h-full object-cover" src="assets/images/hero.png" alt="سند سنتر" />
            <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent pointer-events-none"></div>
            <div class="absolute bottom-0 right-0 p-8 text-white text-right max-w-lg pointer-events-none">
                <span class="inline-block px-4 py-1 rounded-full bg-accent text-white text-xs font-bold tracking-widest mb-4">جديد</span>
                <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight">اجعل منزلك ذكياً وعصرياً</h2>
                <p class="text-white/80 mb-6 font-medium">اكتشف تشكيلتنا الجديدة من الأجهزة المنزلية المتطورة.</p>
                <button onclick="event.stopPropagation(); navigate('page_1')"
                    class="bg-accent text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-ambient border-0 pointer-events-auto cursor-pointer">تسوق الآن</button>
            </div>
        </div>
    `;

    let dotsHTML = `
        <div class="carousel-dot w-8 h-2.5 rounded-full bg-primary transition-all duration-300 cursor-pointer" onclick="changeSlide(0)"></div>
        <div class="carousel-dot w-2.5 h-2.5 rounded-full bg-white/50 transition-all duration-300 cursor-pointer" onclick="changeSlide(1)"></div>
    `;

    // Dynamic Product Slides (from slider products)
    sliderProducts.forEach((p, idx) => {
        const slideIdx = idx + 2; // starts at 2 (after video + hero)
        wrapperHTML += `
            <div class="carousel-slide min-w-full h-full relative" data-slide="${slideIdx}">
                <img class="w-full h-full object-cover" src="${p.image}" alt="${p.name}" onerror="this.src='assets/images/hero.png'" />
                <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent pointer-events-none"></div>
                <div class="absolute bottom-0 right-0 p-8 text-white text-right max-w-lg pointer-events-none">
                    <span class="inline-block px-4 py-1 rounded-full bg-accent text-white text-xs font-bold tracking-widest mb-4">مميز</span>
                    <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight">${p.name}</h2>
                    <p class="text-white/80 mb-6 font-medium line-clamp-2">${p.description}</p>
                    <button onclick="event.stopPropagation(); navigate('page_2', '${p.id}')"
                        class="bg-accent text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-ambient border-0 pointer-events-auto cursor-pointer">اكتشف المزيد</button>
                </div>
            </div>
        `;
        dotsHTML += `<div class="carousel-dot w-2.5 h-2.5 rounded-full bg-white/50 transition-all duration-300 cursor-pointer" onclick="changeSlide(${slideIdx})"></div>`;
    });

    wrapper.innerHTML = wrapperHTML;
    dotsContainer.innerHTML = dotsHTML;
}

function renderUserProducts() {
    const grid = document.getElementById('user-products-grid');
    if (!grid) return;

    const bestSellers = allProducts.filter(p => p.isBestSeller);
    const products = bestSellers.length > 0 ? bestSellers : allProducts.slice(0, 8);

    if (products.length === 0) {
        grid.innerHTML = '<p class="text-center py-12 text-on-surface-variant font-bold min-w-full">جاري تحميل المنتجات...</p>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div onclick="navigate('page_2', '${p.id}')"
            class="snap-start min-w-[220px] bg-surface-container-low rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-colors relative shadow-none">
            <img src="${p.image}" class="w-full h-40 object-cover rounded-xl mb-3 shadow-inner" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <div>
                <h4 class="font-bold text-on-surface truncate text-lg">${p.name}</h4>
                <span class="text-sm font-bold text-primary mb-2 block mt-1">${p.price} د.أ</span>
                <div class="flex items-center justify-between gap-1 mt-2">
                    <div class="flex items-center gap-1">
                        <button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer" onclick="event.stopPropagation(); updateItemQty('${p.id}', -1)">-</button>
                        <span class="w-6 h-7 rounded-full flex items-center justify-center bg-surface text-xs font-bold">${getCartQty(p.id)}</span>
                        <button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer" onclick="event.stopPropagation(); updateItemQty('${p.id}', 1)">+</button>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 transition-colors border-0 cursor-pointer">
                            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${isFavorite(p.id) ? 1 : 0};">favorite</span>
                        </button>
                        <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity border-0 cursor-pointer">
                            <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateListingCategoryButtons() {
    const container = document.getElementById('listing-category-filters');
    if (!container) return;

    container.innerHTML = `
        <button onclick="filterCategory('all')" class="bg-primary text-on-primary px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap shadow-md border-0 cursor-pointer">الكل</button>
        ${allCategories.map(cat => `
            <button onclick="filterCategory('${cat.name}')" class="bg-surface-container text-on-surface-variant px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border-0 cursor-pointer">${cat.name}</button>
        `).join('')}
    `;
}

// ── Navigation ──
function navigate(pageId, productId = null) {
    if (currentPage === pageId && !productId) return;
    if (pageId === 'page_2' && productId) populateProductDetail(productId);
    history.pushState({ page: pageId, productId }, "", "#" + pageId);
    showPage(pageId);
}

function showPage(pageId) {
    document.querySelectorAll('.app-page').forEach(page => page.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
        currentPage = pageId;
        updateBottomNavState(pageId);
        if (pageId === 'page_3') renderCart();
        if (pageId === 'page_6') renderFavorites();
        if (pageId === 'page_1') filterCategory('all');
        if (pageId === 'page_7') loadProfile();
    }
}

function getCartQty(id) {
    const item = cart.find(i => i.id === id);
    return item ? item.qty : 0;
}

function updateItemQty(id, delta) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    let item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    } else if (delta > 0) {
        cart.push({ ...p, qty: 1 });
    }

    saveCart();
    renderUserProducts();
    renderListingProducts();
    if (currentPage === 'page_3') renderCart();
    updateCartBadges();
}

function addToCartById(id) {
    updateItemQty(id, 1);
    showToast('تمت الإضافة إلى السلة');
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    renderUserProducts();
    renderListingProducts();
    if (currentPage === 'page_6') renderFavorites();
}

function isFavorite(id) {
    return favorites.includes(id);
}

function saveCart() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

function saveFavorites() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

function updateCartBadges() {
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll('.cart-badge').forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? 'flex' : 'none';
    });
}

function renderListingProducts() {
    const grid = document.getElementById('listing-products-grid');
    if (!grid) return;

    let filtered = allProducts;
    if (currentCategory !== 'all') {
        filtered = allProducts.filter(p => p.category === currentCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => p.name.includes(searchQuery) || p.description.includes(searchQuery));
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold">لا توجد منتجات في هذا القسم</p>';
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <img src="${p.image}" class="w-full h-48 object-cover rounded-xl mb-4" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <h4 class="font-bold text-on-surface mb-1">${p.name}</h4>
            <p class="text-sm text-on-surface-variant line-clamp-2 mb-4">${p.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-lg font-black text-primary">${p.price} د.أ</span>
                <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer">
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            </div>
        </div>
    `).join('');
}

let currentCategory = 'all';
let searchQuery = '';

function filterCategory(cat) {
    currentCategory = cat;
    if (currentPage !== 'page_1') navigate('page_1');
    renderListingProducts();

    // Update active button state
    document.querySelectorAll('#listing-category-filters button').forEach(btn => {
        if (btn.textContent === (cat === 'all' ? 'الكل' : cat)) {
            btn.className = 'bg-primary text-on-primary px-6 py-2 rounded-full font-bold transition-all border-0 cursor-pointer whitespace-nowrap';
        } else {
            btn.className = 'bg-surface-container text-on-surface-variant px-6 py-2 rounded-full font-bold transition-all border-0 cursor-pointer whitespace-nowrap';
        }
    });
}

function populateProductDetail(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    const container = document.getElementById('product-detail-content');
    if (!container) return;

    container.innerHTML = `
        <div class="relative w-full h-[350px] rounded-2xl overflow-hidden mb-6">
            <img src="${p.image}" class="w-full h-full object-cover" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <button onclick="toggleFavorite('${p.id}')" class="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center border-0 cursor-pointer">
                <span class="material-symbols-outlined text-tertiary" style="font-variation-settings: 'FILL' ${isFavorite(p.id) ? 1 : 0};">favorite</span>
            </button>
        </div>
        <div class="px-2 space-y-4">
            <span class="text-xs font-bold text-primary bg-primary-container/30 px-3 py-1 rounded-full whitespace-nowrap">${p.category}</span>
            <h2 class="text-3xl font-black text-on-surface">${p.name}</h2>
            <p class="text-on-surface-variant leading-relaxed">${p.description}</p>
            <div class="flex items-center justify-between mt-6 pt-4 border-t border-outline/20">
                <span class="text-3xl font-black text-primary">${p.price} د.أ</span>
                <button onclick="addToCartById('${p.id}')"
                    class="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 border-0 cursor-pointer flex items-center gap-2">
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                    أضف للسلة
                </button>
            </div>
        </div>
    `;
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center py-12 text-on-surface-variant">السلة فارغة</p>';
        document.getElementById('cart-total').textContent = '0.00 د.أ';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="flex gap-4 items-center bg-white p-4 rounded-2xl border border-outline">
            <img src="${item.image}" class="w-20 h-20 object-cover rounded-xl" alt="${item.name}">
            <div class="flex-1">
                <h4 class="font-bold text-on-surface">${item.name}</h4>
                <p class="text-primary font-bold">${item.price} د.أ</p>
                <div class="flex items-center gap-3 mt-2">
                    <button onclick="updateItemQty('${item.id}', -1)" class="w-8 h-8 rounded-full bg-surface-container border-0 cursor-pointer">-</button>
                    <span class="font-bold">${item.qty}</span>
                    <button onclick="updateItemQty('${item.id}', 1)" class="w-8 h-8 rounded-full bg-surface-container border-0 cursor-pointer">+</button>
                </div>
            </div>
            <button onclick="updateItemQty('${item.id}', -${item.qty})" class="text-error border-0 bg-transparent cursor-pointer">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + (parseFloat(i.price) * i.qty), 0);
    document.getElementById('cart-total').textContent = total.toFixed(2) + ' د.أ';
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-6 py-3 rounded-full text-sm font-bold shadow-lg z-[1000] transition-opacity duration-300';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}


// ── Favorites Rendering ──
function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    const favProducts = allProducts.filter(p => favorites.includes(p.id));

    if (favProducts.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold">لم تضف أي منتج للمفضلة بعد</p>';
        return;
    }

    grid.innerHTML = favProducts.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm cursor-pointer hover:shadow-md transition-shadow relative">
            <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center border-0 cursor-pointer z-10">
                <span class="material-symbols-outlined text-tertiary text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
            </button>
            <img src="${p.image}" class="w-full h-40 object-cover rounded-xl mb-3" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <h4 class="font-bold text-on-surface truncate">${p.name}</h4>
            <span class="text-sm font-bold text-primary">${p.price} د.أ</span>
        </div>
    `).join('');
}

// ── Profile Functions ──
function loadProfile() {
    const userData = JSON.parse(localStorage.getItem('sanadcenter_user') || 'null');
    if (userData) {
        document.getElementById('profile-login-section').style.display = 'none';
        document.getElementById('profile-info-section').style.display = 'block';
        document.getElementById('profile-display-name').textContent = userData.name;
        document.getElementById('profile-display-phone').textContent = userData.phone;
        const initials = userData.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        document.getElementById('profile-avatar').textContent = initials;
        loadMyOrders(userData.phone);
    } else {
        document.getElementById('profile-login-section').style.display = 'block';
        document.getElementById('profile-info-section').style.display = 'none';
    }
}

function loginProfile() {
    const name = document.getElementById('profile-name-input').value.trim();
    const phone = document.getElementById('profile-phone-input').value.trim();
    if (!name || !phone) {
        showToast('الرجاء إدخال الاسم ورقم الهاتف');
        return;
    }
    localStorage.setItem('sanadcenter_user', JSON.stringify({ name, phone }));
    loadProfile();
    showToast('تم التسجيل بنجاح!');
}

function logoutProfile() {
    localStorage.removeItem('sanadcenter_user');
    loadProfile();
    showToast('تم تسجيل الخروج');
}

function showEditProfile() {
    const userData = JSON.parse(localStorage.getItem('sanadcenter_user') || '{}');
    document.getElementById('profile-edit-name').value = userData.name || '';
    document.getElementById('profile-edit-phone').value = userData.phone || '';
    document.getElementById('profile-edit-form').style.display = 'block';
}

function saveProfileEdit() {
    const name = document.getElementById('profile-edit-name').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    if (!name || !phone) {
        showToast('الرجاء ملء جميع الحقول');
        return;
    }
    localStorage.setItem('sanadcenter_user', JSON.stringify({ name, phone }));
    document.getElementById('profile-edit-form').style.display = 'none';
    loadProfile();
    showToast('تم حفظ التعديلات');
}

function loadMyOrders(phone) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-on-surface-variant py-8">لا توجد طلبات سابقة</p>';
}

// ── Back Navigation ──
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        navigate('page_0');
    }
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        showPage(e.state.page);
    } else {
        showPage('page_0');
    }
});

// ── Bottom Nav State ──
function updateBottomNavState(pageId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const match = btn.getAttribute('onclick').match(/'([^']+)'/);
        if (!match) return;
        const target = match[1];
        if (target === pageId) {
            btn.classList.add('text-primary');
            btn.classList.remove('text-on-surface-variant');
        } else {
            btn.classList.remove('text-primary');
            btn.classList.add('text-on-surface-variant');
        }
    });
}

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    updateCartBadges();
    updateBottomNavState('page_0');
});

// Redefining global window functions for HTML access
window.navigate = navigate;
window.goBack = goBack;
window.filterCategory = filterCategory;
window.addToCartById = addToCartById;
// -- Location & Checkout Functions --

async function getMyLocation() {
    if (!navigator.geolocation) {
        showToast("عذراً، متصفحك لا يدعم تحديد الموقع");
        return;
    }

    showToast("جاري تحديد موقعك...");
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        currentCoords = { lat: latitude, lng: longitude };
        
        document.getElementById('checkout-latlng').value = `${latitude},${longitude}`;
        
        // Update Address Box
        document.getElementById('checkout-address-box').classList.remove('hidden');
        document.getElementById('checkout-address-text').textContent = "جاري جلب العنوان...";
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
            const data = await res.json();
            const address = data.display_name || `${latitude}, ${longitude}`;
            document.getElementById('checkout-address-text').textContent = address;
            document.getElementById('checkout-address').classList.remove('hidden');
        } catch (err) {
            document.getElementById('checkout-address-text').textContent = `${latitude}, ${longitude}`;
            document.getElementById('checkout-address').classList.remove('hidden');
        }
    }, (error) => {
        showToast("فشل تحديد الموقع. يرجى المحاولة يدوياً.");
    });
}

function openMapSelection() {
    const container = document.getElementById('checkout-map-container');
    container.classList.remove('hidden');
    
    if (!selectionMap) {
        selectionMap = L.map('checkoutSelectionMap', {
            zoomControl: false
        }).setView([currentCoords.lat, currentCoords.lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(selectionMap);
        
        // Use map move to update currentCoords
        selectionMap.on('move', () => {
            const center = selectionMap.getCenter();
            currentCoords = { lat: center.lat, lng: center.lng };
        });
    } else {
        selectionMap.setView([currentCoords.lat, currentCoords.lng], 15);
    }
    
    setTimeout(() => selectionMap.invalidateSize(), 300);
}

async function confirmMapSelection() {
    const { lat, lng } = currentCoords;
    document.getElementById('checkout-latlng').value = `${lat},${lng}`;
    
    document.getElementById('checkout-map-container').classList.add('hidden');
    document.getElementById('checkout-address-box').classList.remove('hidden');
    document.getElementById('checkout-address-text').textContent = "جاري جلب العنوان...";
    
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
        const data = await res.json();
        const address = data.display_name || `${lat}, ${lng}`;
        document.getElementById('checkout-address-text').textContent = address;
        document.getElementById('checkout-address').classList.remove('hidden');
    } catch (err) {
        document.getElementById('checkout-address-text').textContent = `${lat}, ${lng}`;
        document.getElementById('checkout-address').classList.remove('hidden');
    }
}

async function submitOrderToSheet() {
    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const addressDetails = document.getElementById('checkout-address').value;
    const latlng = document.getElementById('checkout-latlng').value;
    const addressFull = document.getElementById('checkout-address-text').textContent;
    const notes = document.getElementById('checkout-notes').value;

    if (!name || !phone || (!latlng && !addressDetails)) {
        showToast("يرجى ملء جميع الخانات الأساسية");
        return false;
    }

    const orderData = {
        action: 'addOrder',
        customerName: name,
        customerPhone: phone,
        governorate: '',
        address: `${addressFull} | ${addressDetails}`,
        products: JSON.stringify(cart),
        total: cart.reduce((sum, i) => sum + (parseFloat(i.price) * i.qty), 0),
        customerLocation: latlng,
        notes: notes
    };

    showToast("جاري إرسال طلبك...");

    try {
        await fetch(`${API_URL}`, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        showToast("تم إرسال طلبك بنجاح! سنتواصل معك قريباً.");
        
        // Clear Cart
        cart = [];
        saveCart();
        updateCartBadges();
        closeCheckoutModal();
        navigate('page_0');
        
        return true;
    } catch (err) {
        console.error("Order submission failed:", err);
        showToast("فشل إرسال الطلب. يرجى المحاولة مرة أخرى.");
        return false;
    }
}

// Redefining global window functions for HTML access
window.navigate = navigate;
window.goBack = goBack;
window.filterCategory = filterCategory;
window.addToCartById = addToCartById;
window.updateItemQty = updateItemQty;
window.toggleFavorite = toggleFavorite;
window.loginProfile = loginProfile;
window.logoutProfile = logoutProfile;
window.showEditProfile = showEditProfile;
window.saveProfileEdit = saveProfileEdit;
window.renderFavorites = renderFavorites;
window.loadProfile = loadProfile;
window.getMyLocation = getMyLocation;
window.openMapSelection = openMapSelection;
window.confirmMapSelection = confirmMapSelection;
window.submitOrderToSheet = submitOrderToSheet;
