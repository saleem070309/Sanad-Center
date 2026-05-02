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

// Call applySettings immediately to use cached values
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
});
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
let currentPage = 'page_0';

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
            fetch(`${API_URL}?action=getProducts&_=${Date.now()}`),
            fetch(`${API_URL}?action=getCategories&_=${Date.now()}`),
            fetch(`${API_URL}?action=getSettings&_=${Date.now()}`)
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
    } catch (err) {
        console.error('Failed to fetch data:', err);
    }
}

function applySettings() {
    // Normalize keys to lowercase for safety
    const settings = {};
    for (let key in allSettings) {
        settings[key.toLowerCase()] = allSettings[key];
    }

    // WhatsApp
    const waLink = document.getElementById('footer-wa-link');
    const waText = document.getElementById('footer-wa-text');
    const phone = settings.phone || settings['رقم الهاتف'];
    if (phone) {
        let cleanPhone = String(phone).replace(/\s+/g, '').replace('+', '').replace(/^00/, '');
        // If it starts with 0 and is 10 digits, it's likely a local Jordanian number
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
            cleanPhone = '962' + cleanPhone.substring(1);
        }
        // If it's 9 digits and doesn't have a country code, prepend 962
        if (cleanPhone.length === 9 && !cleanPhone.startsWith('962')) {
            cleanPhone = '962' + cleanPhone;
        }
        
        if (waLink) waLink.href = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
        if (waText) waText.textContent = phone;
    }

    // Facebook
    const fbLink = document.getElementById('footer-fb-link');
    const fbText = document.getElementById('footer-fb-text');
    const facebook = settings.facebook || settings['رابط الفيسبوك'];
    const facebookName = settings.facebook_name || settings['اسم الصفحة'];

    if (facebook) {
        if (fbLink) fbLink.href = facebook;
    }
    if (facebookName) {
        if (fbText) fbText.textContent = facebookName;
    }
}

function renderAll() {
    renderUserProducts(); // Best Sellers
    renderCategories();
    renderHeroSlider();
    renderListingProducts();
    updateListingCategoryButtons();
    
    // Initialize Carousel if functions from index.html are available
    if (typeof initCarouselDOM === 'function') {
        initCarouselDOM();
        if (typeof updateCarousel === 'function') updateCarousel(false);
        if (typeof initSwipe === 'function') initSwipe();
        if (typeof handleVideoPlay === 'function') handleVideoPlay();
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
        <button onclick="filterCategory('all')" class="bg-primary text-on-primary px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap shadow-md border-0 cursor-pointer">الكل</button>
        ${allCategories.map(cat => `
            <button onclick="filterCategory('${cat.name}')" class="bg-surface-container text-on-surface-variant px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border-0 cursor-pointer">${cat.name}</button>
        `).join('')}
    `;
}

function goBack() {
    if (history.length > 1) {
        history.back();
    } else {
        navigate('page_0');
    }
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        showPage(e.state.page);
        if (e.state.productId) populateProductDetail(e.state.productId);
    } else {
        showPage('page_0');
    }
});

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
    const grid = document.getElementById('listing-products-grid');
    if (!grid) return;
    
    let filtered = allProducts;
    if (currentCategory !== 'all') {
        filtered = allProducts.filter(p => p.category === currentCategory);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(p => p.name.includes(searchQuery) || p.description.includes(searchQuery));
    }

    grid.innerHTML = filtered.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm cursor-pointer hover:bg-surface-container transition-colors">
            <img src="${p.image}" class="w-full h-48 object-cover rounded-xl mb-4" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
            <h4 class="font-bold text-on-surface mb-1 truncate">${p.name}</h4>
            <p class="text-sm text-on-surface-variant line-clamp-2 mb-4">${p.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-lg font-black text-primary">${p.price} د.أ</span>
                <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer active:scale-95 transition-transform">
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
        const btnText = btn.textContent.trim();
        const targetText = (cat === 'all' ? 'الكل' : cat);
        if (btnText === targetText) {
            btn.className = 'snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-primary text-white font-bold shadow-ambient transition-transform active:scale-95 border-0 cursor-pointer';
        } else {
            btn.className = 'snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-white text-on-surface-variant font-semibold border border-outline hover:bg-primary-light/20 transition-colors cursor-pointer';
        }
    });
}

function populateProductDetail(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    const container = document.getElementById('product-detail-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-8 animate-fadeIn">
            <div class="relative rounded-3xl overflow-hidden shadow-ambient group h-[400px]">
                <img src="${p.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
                <div class="absolute top-6 right-6">
                    <button onclick="toggleFavorite('${p.id}')" class="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-tertiary shadow-lg border-0 cursor-pointer active:scale-95 transition-all">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${isFavorite(p.id) ? 1 : 0};">favorite</span>
                    </button>
                </div>
            </div>
            
            <div class="px-2 space-y-6">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="inline-block px-3 py-1 rounded-full bg-primary-light/30 text-primary text-xs font-bold mb-3">${p.category}</span>
                        <h2 class="text-3xl font-black text-on-surface">${p.name}</h2>
                    </div>
                    <div class="text-left">
                        <p class="text-2xl font-black text-primary">${p.price} د.أ</p>
                        <p class="text-xs text-on-surface-variant font-medium">شامل الضريبة</p>
                    </div>
                </div>

                <div class="bg-surface-container-low p-6 rounded-2xl">
                    <h3 class="font-bold text-on-surface mb-3 flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">description</span>
                        وصف المنتج
                    </h3>
                    <p class="text-on-surface-variant leading-relaxed font-medium">${p.description}</p>
                </div>

                <div class="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-xl z-50 border-t border-outline/10">
                    <div class="max-w-4xl mx-auto flex gap-4">
                        <div class="flex items-center bg-surface-container rounded-xl px-2">
                            <button onclick="updateItemQty('${p.id}', -1); populateProductDetail('${p.id}')" class="w-10 h-10 flex items-center justify-center text-primary font-bold border-0 bg-transparent cursor-pointer">-</button>
                            <span class="w-10 text-center font-bold text-lg">${getCartQty(p.id)}</span>
                            <button onclick="updateItemQty('${p.id}', 1); populateProductDetail('${p.id}')" class="w-10 h-10 flex items-center justify-center text-primary font-bold border-0 bg-transparent cursor-pointer">+</button>
                        </div>
                        <button onclick="addToCartById('${p.id}')" class="flex-1 bg-primary text-on-primary py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-ambient border-0 cursor-pointer active:scale-95 transition-all">
                            <span class="material-symbols-outlined">add_shopping_cart</span>
                            إضافة للسلة
                        </button>
                    </div>
                </div>
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


// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    // Re-initialize UI states
    updateCartBadges();
    
    // Auto-slide Hero
    setInterval(() => {
        if (typeof currentSlide !== 'undefined') {
            const next = (currentSlide + 1) % (allProducts.filter(p => p.inSlider).length + 1);
            changeSlide(next);
        }
    }, 5000);
});

function updateBottomNavState(pageId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const target = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
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
    e.stopPropagation();
    const video = document.getElementById('carouselVideo');
    const btn = document.getElementById('videoAudioBtn');
    if (!video || !btn) return;
    video.muted = !video.muted;
    btn.innerHTML = `<span class="material-symbols-outlined text-xl">${video.muted ? 'volume_off' : 'volume_up'}</span>`;
}


// ── Profile Logic ──
const PROFILE_KEY = 'sanadcenter_profile';

function loadProfile() {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    const loginSection = document.getElementById('profile-login-section');
    const infoSection = document.getElementById('profile-info-section');
    
    if (!profile) {
        if (loginSection) loginSection.style.display = 'block';
        if (infoSection) infoSection.style.display = 'none';
    } else {
        if (loginSection) loginSection.style.display = 'none';
        if (infoSection) infoSection.style.display = 'block';
        
        document.getElementById('profile-display-name').textContent = profile.name;
        document.getElementById('profile-display-phone').textContent = profile.phone;
        document.getElementById('profile-avatar').textContent = profile.name.substring(0, 2).toUpperCase();
        
        renderMyOrders(profile.phone);
    }
}

function loginProfile() {
    const name = document.getElementById('profile-name-input').value.trim();
    const phone = document.getElementById('profile-phone-input').value.trim();
    
    if (!name || !phone) {
        showToast('الرجاء إدخال الاسم ورقم الهاتف');
        return;
    }
    
    const profile = { name, phone };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    loadProfile();
    showToast('مرحباً بك ' + name);
}

function logoutProfile() {
    localStorage.removeItem(PROFILE_KEY);
    loadProfile();
}

function renderMyOrders(phone) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    
    // In a real app, we would fetch from API using phone
    container.innerHTML = '<p class="text-center text-on-surface-variant py-8">لا يوجد طلبات سابقة</p>';
}


async function submitOrderToSheet() {
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const notes = document.getElementById('checkout-notes').value.trim();
    
    // Calculate total
    const subtotal = cart.reduce((sum, i) => sum + (parseFloat(i.price) * i.qty), 0);
    const delivery = 2.0; // Fixed for now or get from detected region
    const total = (subtotal + delivery).toFixed(2);
    
    const productsList = cart.map(i => `${i.name} x${i.qty}`).join(' | ');
    
    const payload = {
        action: 'addOrder',
        customerName: name,
        customerPhone: phone,
        address: address,
        products: productsList,
        total: total + ' د.أ',
        notes: notes
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.status === 'success') {
            // Save customer info for profile
            localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone }));
            
            // Redirect to WhatsApp
            const storePhone = (allSettings.phone || '0777349014').replace(/\s+/g, '').replace('+', '').replace(/^00/, '');
            let cleanStorePhone = storePhone;
            if (cleanStorePhone.startsWith('0') && cleanStorePhone.length === 10) {
                cleanStorePhone = '962' + cleanStorePhone.substring(1);
            }
            
            const message = `طلب جديد رقم #${data.orderId}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالمنتجات: ${productsList}\nالمجموع: ${total} د.أ`;
            const encodedMsg = encodeURIComponent(message);
            const waUrl = `https://api.whatsapp.com/send?phone=${cleanStorePhone}&text=${encodedMsg}`;
            
            window.open(waUrl, '_blank');
            showToast('تم إرسال الطلب بنجاح!');
            return true;
        } else {
            showToast('فشل إرسال الطلب: ' + data.message);
            return false;
        }
    } catch (err) {
        console.error('Submit error:', err);
        showToast('حدث خطأ أثناء إرسال الطلب');
        return false;
    }
}

// Global Exports
window.navigate = navigate;
window.goBack = goBack;
window.filterCategory = filterCategory;
window.addToCartById = addToCartById;
window.updateItemQty = updateItemQty;
window.toggleFavorite = toggleFavorite;
window.toggleVideoAudio = toggleVideoAudio;
window.changeSlide = typeof changeSlide !== 'undefined' ? changeSlide : null;
window.loginProfile = loginProfile;
window.logoutProfile = logoutProfile;
window.submitOrderToSheet = submitOrderToSheet;
window.showEditProfile = () => { document.getElementById('profile-edit-form').style.display='block'; };
window.saveProfileEdit = () => {
    const name = document.getElementById('profile-edit-name').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    if (name && phone) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, phone }));
        document.getElementById('profile-edit-form').style.display='none';
        loadProfile();
    }
};

