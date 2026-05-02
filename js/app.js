// سند سنتر — منطق التطبيق (قاعدة بيانات Google Sheets)
// ── الإعدادات ──
const API_URL = 'https://script.google.com/macros/s/AKfycbxoRaKkmPuzFusdvzkTwXrAhVn4FfFXZFUheS7dftK9RGW7VE0G7rmPOQelMg5wy6wVCg/exec';

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
    const grid = document.getElementById('listing-grid');
    if (!grid) return;
    
    let filtered = allProducts;
    if (currentCategory !== 'all') {
        filtered = allProducts.filter(p => p.category === currentCategory);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(p => p.name.includes(searchQuery) || p.description.includes(searchQuery));
    }

    grid.innerHTML = filtered.map(p => `
        <div onclick="navigate('page_2', '${p.id}')" class="bg-white rounded-2xl p-4 border border-outline shadow-sm">
            <img src="${p.image}" class="w-full h-48 object-cover rounded-xl mb-4" alt="${p.name}">
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
            btn.className = 'bg-primary text-on-primary px-6 py-2 rounded-full font-bold transition-all border-0 cursor-pointer';
        } else {
            btn.className = 'bg-surface-container text-on-surface-variant px-6 py-2 rounded-full font-bold transition-all border-0 cursor-pointer';
        }
    });
}

function populateProductDetail(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('detail-img').src = p.image;
    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-price').textContent = p.price + ' د.أ';
    document.getElementById('detail-desc').textContent = p.description;
    document.getElementById('detail-cat').textContent = p.category;
    
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

let currentSlide = 0;
function changeSlide(idx) {
    const wrapper = document.getElementById('carouselWrapper');
    if (!wrapper) return;
    const slides = document.querySelectorAll('.carousel-slide');
    if (idx < 0) idx = slides.length - 1;
    if (idx >= slides.length) idx = 0;
    
    currentSlide = idx;
    wrapper.style.transform = `translateX(${idx * 100}%)`;
    
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        if (i === idx) {
            dot.className = 'carousel-dot w-8 h-2.5 rounded-full bg-primary transition-all duration-300 cursor-pointer';
        } else {
            dot.className = 'carousel-dot w-2.5 h-2.5 rounded-full bg-white/50 transition-all duration-300 cursor-pointer';
        }
    });
}


// Redefining global window functions for HTML access
window.navigate = navigate;
window.filterCategory = filterCategory;
window.addToCartById = addToCartById;
window.updateItemQty = updateItemQty;
window.toggleFavorite = toggleFavorite;
window.toggleVideoAudio = toggleVideoAudio;
window.changeSlide = changeSlide;
