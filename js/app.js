// سند سنتر — منطق التطبيق (قاعدة بيانات Google Sheets)
// ── الإعدادات ──
const API_URL = 'https://script.google.com/macros/s/AKfycbx6V72d-tWyfPlU7AlA6LSovbdDP-gbRy-gjVnPmMwFoYbf0ub6AcpIomjGTtwN7UpV4g/exec';

const STORAGE_KEYS = {
    PRODUCTS: 'sanadcenter_products',
    CATEGORIES: 'sanadcenter_categories',
    SETTINGS: 'sanadcenter_settings',
    CART: 'sanadcenter_cart',
    FAVORITES: 'sanadcenter_favorites',
    USER: 'sanadcenter_user'
};

// ── State ──
let allProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
let allCategories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
let allSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
let currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
let currentPage = 'page_0';
let currentCategory = 'all';
let searchQuery = '';

// Carousel State
let currentSlide = 0;
let carouselInterval;
let isTransitioning = false;
let startX = 0;
let isDragging = false;

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
        applySettings();
        
        // Init carousel after data is ready
        setTimeout(() => {
            initCarouselDOM();
            updateCarousel(false);
            initSwipe();
            handleVideoPlay();
        }, 500);

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

function renderAll() {
    renderUserProducts(); // Best Sellers
    renderCategories();
    renderHeroSlider();
    renderListingProducts();
    updateListingCategoryButtons();
}

// ── UI Rendering ──

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    if (allCategories.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-4 text-on-surface-variant font-medium">جاري تحميل الأقسام...</p>';
        return;
    }

    grid.innerHTML = allCategories.map(cat => `
        <button onclick="filterCategory('${cat.name}')"
            class="bg-white p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-primary-light/20 cursor-pointer group border border-outline w-full shadow-ambient">
            <div class="w-16 h-16 rounded-full bg-primary-light/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-primary text-3xl">${cat.icon || 'category'}</span>
            </div>
            <span class="font-bold text-on-surface text-sm">${cat.name}</span>
        </button>
    `).join('');
}

function renderHeroSlider() {
    const wrapper = document.getElementById('carouselWrapper');
    const dotsContainer = document.getElementById('carouselDots');
    if (!wrapper || !dotsContainer) return;

    const sliderProducts = allProducts.filter(p => p.inSlider);

    // Initial Video Slide (Slide 0)
    let wrapperHTML = `
        <div class="carousel-slide min-w-full h-full relative" data-slide="0">
            <video id="carouselVideo" class="w-full h-full object-cover" playsinline muted autoplay loop>
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

    let dotsHTML = `<div class="carousel-dot w-8 h-2.5 rounded-full bg-primary transition-all duration-300 cursor-pointer" onclick="changeSlide(0)"></div>`;

    // Dynamic Slides
    sliderProducts.forEach((p, idx) => {
        const slideIdx = idx + 1;
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
        <button onclick="filterCategory('all')" class="${currentCategory === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'} px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap shadow-md border-0 cursor-pointer">الكل</button>
        ${allCategories.map(cat => `
            <button onclick="filterCategory('${cat.name}')" class="${currentCategory === cat.name ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'} px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border-0 cursor-pointer">${cat.name}</button>
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
        
        if (pageId === 'page_0') {
             startCarousel();
        } else {
             clearInterval(carouselInterval);
        }

        if (pageId === 'page_3') renderCart();
        if (pageId === 'page_6') renderFavorites();
        if (pageId === 'page_1') renderListingProducts();
        if (pageId === 'page_7') loadProfile();
    }
}

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        navigate('page_0');
    }
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        showPage(e.state.page);
        if (e.state.page === 'page_2' && e.state.productId) {
            populateProductDetail(e.state.productId);
        }
    } else {
        showPage('page_0');
    }
});

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
    renderAll();
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
    renderAll();
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
    const grid = document.getElementById('listing-products-grid'); // Match index.html ID
    if (!grid) return;

    let filtered = allProducts;
    if (currentCategory !== 'all') {
        filtered = allProducts.filter(p => p.category === currentCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => p.name.includes(searchQuery) || p.description.includes(searchQuery));
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant">لا توجد منتجات حالياً</p>';
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm flex flex-col h-full">
            <img src="${p.image}" class="w-full h-40 object-cover rounded-xl mb-4" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <h4 class="font-bold text-on-surface mb-1 truncate">${p.name}</h4>
            <p class="text-xs text-on-surface-variant line-clamp-2 mb-4 flex-1">${p.description}</p>
            <div class="flex justify-between items-center mt-auto">
                <span class="text-md font-black text-primary">${p.price} د.أ</span>
                <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer">
                    <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                </button>
            </div>
        </div>
    `).join('');
}

function filterCategory(cat) {
    currentCategory = cat;
    if (currentPage !== 'page_1') navigate('page_1');
    renderListingProducts();
    updateListingCategoryButtons();
}

function populateProductDetail(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    const img = document.getElementById('detail-img');
    const name = document.getElementById('detail-name');
    const price = document.getElementById('detail-price');
    const desc = document.getElementById('detail-desc');
    const cat = document.getElementById('detail-cat');
    
    if (img) img.src = p.image;
    if (name) name.textContent = p.name;
    if (price) price.textContent = p.price + ' د.أ';
    if (desc) desc.textContent = p.description;
    if (cat) cat.textContent = p.category;

    const addBtn = document.getElementById('detail-add-btn');
    if (addBtn) {
        addBtn.onclick = () => addToCartById(p.id);
    }
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center py-12 text-on-surface-variant">السلة فارغة</p>';
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.textContent = '0.00 د.أ';
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
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' د.أ';
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    const favoriteProducts = allProducts.filter(p => favorites.includes(p.id));

    if (favoriteProducts.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div class="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
                    <span class="material-symbols-outlined text-4xl">favorite</span>
                </div>
                <h3 class="text-xl font-bold text-on-surface mb-2">قائمة المفضلة فارغة</h3>
                <p class="text-on-surface-variant mb-8 max-w-xs">لم تقم بإضافة أي منتجات إلى مفضلتك بعد.</p>
                <button onclick="navigate('page_1')" class="bg-primary text-on-primary px-8 py-3 rounded-full font-bold transition-all active:scale-95 border-0 cursor-pointer shadow-ambient">تصفح المنتجات</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = favoriteProducts.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm flex flex-col h-full relative group">
            <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-error shadow-sm z-10 border-0 cursor-pointer">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
            </button>
            <img src="${p.image}" class="w-full h-32 sm:h-40 object-cover rounded-xl mb-4" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <h4 class="font-bold text-on-surface mb-1 truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-auto pt-2">
                <span class="text-md font-black text-primary">${p.price} د.أ</span>
                <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="bg-primary-light/20 text-primary w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer">
                    <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                </button>
            </div>
        </div>
    `).join('');
}

// ── Profile Logic ──
function loadProfile() {
    const loginSection = document.getElementById('profile-login-section');
    const infoSection = document.getElementById('profile-info-section');
    if (!loginSection || !infoSection) return;

    if (currentUser) {
        loginSection.style.display = 'none';
        infoSection.style.display = 'block';
        document.getElementById('profile-display-name').textContent = currentUser.name;
        document.getElementById('profile-display-phone').textContent = currentUser.phone;
        document.getElementById('profile-avatar').textContent = currentUser.name.slice(0, 2).toUpperCase();
        loadMyOrders();
    } else {
        loginSection.style.display = 'block';
        infoSection.style.display = 'none';
    }
}

function loginProfile() {
    const name = document.getElementById('profile-name-input').value.trim();
    const phone = document.getElementById('profile-phone-input').value.trim();

    if (!name || !phone) {
        showToast('الرجاء إدخال الاسم ورقم الهاتف');
        return;
    }

    currentUser = { name, phone };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    loadProfile();
    showToast('تم تسجيل الدخول بنجاح');
}

function logoutProfile() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.USER);
    loadProfile();
}

async function loadMyOrders() {
    const list = document.getElementById('my-orders-list');
    if (!list || !currentUser) return;

    try {
        const res = await fetch(`${API_URL}?action=getMyOrders&phone=${currentUser.phone}`);
        const data = await res.json();
        if (data.status === 'success' && data.orders.length > 0) {
            list.innerHTML = data.orders.map(o => `
                <div class="bg-white p-4 rounded-xl border border-outline flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-on-surface">طلب رقم #${o.orderId}</h4>
                        <p class="text-xs text-on-surface-variant">${new Date(o.date).toLocaleDateString('ar-JO')}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-2 py-1 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold">${o.orderStatus}</span>
                        <p class="font-bold text-primary mt-1">${o.total} د.أ</p>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p class="text-center py-8 text-on-surface-variant">لا توجد طلبات سابقة</p>';
        }
    } catch (err) {
        list.innerHTML = '<p class="text-center py-8 text-error">خطأ في تحميل الطلبات</p>';
    }
}

// ── Checkout & Tracking ──
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('عذراً، سلتك فارغة!');
        return;
    }
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function submitCheckout() {
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim() || 'الرمثا'; // Fallback
    const notes = document.getElementById('checkout-notes').value.trim();
    const btn = document.getElementById('submit-checkout-btn');

    if (!name || !phone) {
        showToast('الرجاء إدخال الاسم ورقم الهاتف');
        return;
    }

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span> جارٍ إرسال طلبك...';
    btn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        const orderData = {
            action: 'addOrder',
            customerName: name,
            customerPhone: phone,
            governorate: 'الرمثا',
            address: address,
            products: cart.map(i => `${i.name} (${i.qty})`).join(', '),
            total: cart.reduce((sum, i) => sum + (parseFloat(i.price) * i.qty), 0),
            notes: notes
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        const result = await response.json();

        if (result.status === 'success') {
            cart = [];
            saveCart();
            updateCartBadges();
            closeCheckoutModal();
            navigate('page_5');
        } else {
            showToast('حدث خطأ في إرسال الطلب');
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    } catch (err) {
        console.error('Checkout error:', err);
        showToast('خطأ في الاتصال');
        btn.disabled = false;
        btn.innerHTML = originalContent;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
}

async function refreshTracking() {
    const orderId = document.getElementById('track-order-id')?.value.trim();
    const phone = document.getElementById('track-phone')?.value.trim();
    
    if (!orderId || !phone) {
        // Try to get from last order if available
        const resultSection = document.getElementById('tracking-result-section');
        if (resultSection && resultSection.style.display !== 'none') {
            trackOrder();
        } else {
            showToast('الرجاء إدخال رقم الطلب ورقم الهاتف');
        }
        return;
    }
    trackOrder();
}

async function trackOrder() {
    const orderId = document.getElementById('track-order-id').value.trim();
    const phone = document.getElementById('track-phone').value.trim();
    const btn = document.querySelector('[onclick="trackOrder()"]');
    const resultSection = document.getElementById('tracking-result-section');
    const emptySection = document.getElementById('tracking-empty-section');

    if (!orderId || !phone) {
        showToast('الرجاء إدخال رقم الطلب ورقم الهاتف');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    }

    try {
        const res = await fetch(`${API_URL}?action=trackOrder&orderId=${orderId}&phone=${phone}`);
        const data = await res.json();

        if (data.status === 'success' && data.order) {
            if (emptySection) emptySection.style.display = 'none';
            if (resultSection) resultSection.style.display = 'block';
            
            document.getElementById('track-order-num').textContent = '#' + data.order.orderId;
            document.getElementById('track-order-status').textContent = data.order.orderStatus;
            document.getElementById('track-order-total').textContent = data.order.total + ' د.أ';
            
            // Highlight status step (if UI has them)
            // ... logic to update visual stepper ...
        } else {
            showToast('الطلب غير موجود أو البيانات غير صحيحة');
        }
    } catch (err) {
        console.error('Tracking error:', err);
        showToast('خطأ في الاتصال بالخادم');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">search</span> تتبع الطلب';
        }
    }
}

// ── Carousel Advanced ──
function initCarouselDOM() {
    const wrap = document.getElementById('carouselWrapper');
    if (!wrap) return;
    const originalSlides = wrap.querySelectorAll('.carousel-slide');
    if (originalSlides.length > 1) {
        // Clone first slide for seamless loop if needed
    }
    // Update global refs
    const slides = wrap.querySelectorAll('.carousel-slide');
}

function updateCarousel(animate = true) {
    const wrapper = document.getElementById('carouselWrapper');
    if (!wrapper) return;
    
    if (animate) {
        wrapper.style.transition = 'transform 0.5s ease-out';
    } else {
        wrapper.style.transition = 'none';
    }
    wrapper.style.transform = `translateX(${currentSlide * 100}%)`;

    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        if (index === currentSlide) {
            dot.className = 'carousel-dot w-8 h-2.5 rounded-full bg-primary transition-all duration-300 cursor-pointer';
        } else {
            dot.className = 'carousel-dot w-2.5 h-2.5 rounded-full bg-white/50 transition-all duration-300 cursor-pointer';
        }
    });
}

function nextSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length <= 1) return;
    currentSlide = (currentSlide + 1) % slides.length;
    updateCarousel(true);
    handleVideoPlay();
}

function prevSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length <= 1) return;
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateCarousel(true);
    handleVideoPlay();
}

function handleVideoPlay() {
    const video = document.getElementById('carouselVideo');
    if (!video) return;
    if (currentSlide === 0) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }
}

function startCarousel() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(nextSlide, 5000);
}

function changeSlide(idx) {
    currentSlide = idx;
    updateCarousel(true);
    handleVideoPlay();
    startCarousel();
}

function initSwipe() {
    const carousel = document.getElementById('heroCarousel');
    const wrapper = document.getElementById('carouselWrapper');
    if (!carousel || !wrapper) return;

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        clearInterval(carouselInterval);
        wrapper.style.transition = 'none';
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const percentMove = (diff / carousel.offsetWidth) * 100;
        wrapper.style.transform = `translateX(${(currentSlide * 100) + percentMove}%)`;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;

        if (Math.abs(diff) > 50) {
            if (diff < 0) nextSlide(); else prevSlide();
        } else {
            updateCarousel(true);
        }
        startCarousel();
        handleVideoPlay();
    });
}

// ── Global Helpers ──
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

function updateBottomNavState(pageId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const target = btn.getAttribute('data-target');
        if (target === pageId) {
            btn.classList.add('text-primary');
            btn.classList.remove('text-on-surface-variant');
        } else {
            btn.classList.remove('text-primary');
            btn.classList.add('text-on-surface-variant');
        }
    });
}

function toggleVideoAudio(e) {
    if (e) e.stopPropagation();
    const video = document.getElementById('carouselVideo');
    const btn = document.getElementById('videoAudioBtn');
    if (!video || !btn) return;
    video.muted = !video.muted;
    btn.innerHTML = `<span class="material-symbols-outlined text-xl">${video.muted ? 'volume_off' : 'volume_up'}</span>`;
}

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    updateCartBadges();
});

// Expose functions to window
window.navigate = navigate;
window.showPage = showPage;
window.goBack = goBack;
window.filterCategory = filterCategory;
window.addToCartById = addToCartById;
window.updateItemQty = updateItemQty;
window.toggleFavorite = toggleFavorite;
window.toggleVideoAudio = toggleVideoAudio;
window.changeSlide = changeSlide;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.submitCheckout = submitCheckout;
window.loginProfile = loginProfile;
window.logoutProfile = logoutProfile;
window.trackOrder = trackOrder;
