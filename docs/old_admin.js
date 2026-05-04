// ============================================
// ChocoBox — Admin Logic
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxoRaKkmPuzFusdvzkTwXrAhVn4FfFXZFUheS7dftK9RGW7VE0G7rmPOQelMg5wy6wVCg/exec';

let allProducts = [];
let allOrders = [];
let allCustomers = [];

// ── Google Drive Image Helper ──
function getDriveImageUrl(url) {
    if (!url) return 'ball.png';
    const trimmed = url.trim();
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return `https://lh3.googleusercontent.com/d/${match2[1]}`;
    return trimmed;
}

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

async function initAdmin() {
    await fetchProducts();
    await fetchOrders();
    await fetchCustomers();

    setupEventListeners();
    updateDashboardStats();
}

function setupEventListeners() {
    // Add Product Modal
    const addProductBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('add-product-modal');
    const closeBtn = document.getElementById('close-modal-btn');

    if (addProductBtn && modal) {
        addProductBtn.onclick = () => modal.classList.remove('hidden');
    }
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    // Form Submission
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.onsubmit = async (e) => {
            e.preventDefault();
            await saveProduct();
        };
    }

    // Page Switching (Dev Selector)
    window.showPage = (pageId) => {
        document.querySelectorAll('.app-page').forEach(page => page.style.display = 'none');
        const target = document.getElementById(pageId);
        if (target) {
            target.style.display = 'block';
            window.scrollTo(0, 0);
        }
    };
}

// ── Data Fetching ──

async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}?action=getProducts`);
        const data = await response.json();
        if (data.status === 'success') {
            allProducts = data.products;
            renderProducts();
            updateDashboardStats();
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}?action=getAllOrders`);
        const data = await response.json();
        if (data.status === 'success') {
            allOrders = data.orders;
            renderOrders();
            updateDashboardStats();
        }
    } catch (err) {
        console.error('Failed to fetch orders:', err);
    }
}

async function fetchCustomers() {
    try {
        const response = await fetch(`${API_URL}?action=getAllCustomers`);
        const data = await response.json();
        if (data.status === 'success') {
            allCustomers = data.customers;
            renderCustomers();
            updateDashboardStats();
        }
    } catch (err) {
        console.error('Failed to fetch customers:', err);
    }
}

// ── Rendering ──

function renderProducts() {
    const grid = document.getElementById('admin-products-grid');
    if (!grid) return;

    grid.innerHTML = allProducts.map(p => `
        <div class="bg-surface-container-low rounded-xl p-4 shadow-sm group">
            <div class="relative aspect-square rounded-xl overflow-hidden mb-4">
                <img src="${getDriveImageUrl(p.image)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="${p.name}" onerror="this.src='ball.png'">
            </div>
            <h4 class="font-bold text-on-surface truncate">${p.name}</h4>
            <div class="flex justify-between items-center mt-2">
                <span class="text-primary font-bold">${p.price} د.أ</span>
                <span class="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">${p.category}</span>
            </div>
        </div>
    `).join('');

    const totalEl = document.getElementById('total-products');
    if (totalEl) totalEl.textContent = allProducts.length;
}

function renderOrders() {
    // Kitchen Timeline (Live)
    const kitchenContainer = document.getElementById('kitchen-orders-container');
    if (kitchenContainer) {
        const kitchenOrders = allOrders.filter(o => o.orderStatus === 'جديد' || o.orderStatus === 'يُحضّر');
        kitchenContainer.innerHTML = kitchenOrders.map(o => `
            <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm border-r-4 ${o.orderStatus === 'جديد' ? 'border-amber-400' : 'border-blue-400'}">
                <div class="flex justify-between mb-3">
                    <span class="text-xs font-bold text-on-surface-variant">#${o.orderId}</span>
                    <span class="text-xs ${o.orderStatus === 'جديد' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'} px-2 py-0.5 rounded-full font-bold">${o.orderStatus}</span>
                </div>
                <div class="mb-4">
                    <h4 class="text-sm font-bold">${o.customerName}</h4>
                    <p class="text-[10px] text-on-surface-variant truncate">${o.products}</p>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-stone-50">
                    <span class="text-sm font-bold text-primary">${o.total}</span>
                    <select onchange="updateStatus('${o.orderId}', this.value)" class="text-[10px] bg-surface-container border-none rounded-lg font-bold px-2 py-1">
                        <option value="جديد" ${o.orderStatus === 'جديد' ? 'selected' : ''}>جديد</option>
                        <option value="يُحضّر" ${o.orderStatus === 'يُحضّر' ? 'selected' : ''}>يُحضّر</option>
                        <option value="في الطريق" ${o.orderStatus === 'في الطريق' ? 'selected' : ''}>في الطريق</option>
                        <option value="تم التوصيل" ${o.orderStatus === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option>
                        <option value="ملغي" ${o.orderStatus === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    // Activities on Dashboard
    const activityContainer = document.querySelector('.space-y-6'); // Simplified selector
    // In a real implementation, we'd target a specific ID
}

function renderCustomers() {
    const container = document.querySelector('#page_3 main .grid'); // Target the customers grid
    if (!container) return;

    if (allCustomers.length === 0) {
        container.innerHTML = '<p class="text-center py-12">لا يوجد زبائن حالياً</p>';
        return;
    }

    container.innerHTML = allCustomers.map(c => `
        <div class="bg-surface-container-low rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
            <div class="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xl">
                ${c.name ? c.name[0].toUpperCase() : 'U'}
            </div>
            <div class="flex-grow text-center md:text-right">
                <h3 class="text-lg font-bold text-on-surface">${c.name}</h3>
                <p class="text-on-surface-variant text-sm">${c.phone}</p>
            </div>
            <div class="text-center md:text-left">
                <span class="text-xs text-on-surface-variant">تاريخ التسجيل</span>
                <p class="text-sm font-medium">${new Date(c.registrationDate).toLocaleDateString('ar-EG')}</p>
            </div>
        </div>
    `).join('');
}

// ── Actions ──

async function saveProduct() {
    const product = {
        action: 'saveProduct',
        name: document.getElementById('p-name').value,
        description: document.getElementById('p-desc').value,
        price: parseFloat(document.getElementById('p-price').value),
        category: document.getElementById('p-cat').value,
        image: document.getElementById('p-img').value || 'ball.png',
        rating: '5.0',
        fillings: ''
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(product)
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert('تم حفظ المنتج بنجاح');
            document.getElementById('add-product-modal').classList.add('hidden');
            document.getElementById('add-product-form').reset();
            fetchProducts();
        }
    } catch (err) {
        console.error('Error saving product:', err);
    }
}

async function updateStatus(orderId, newStatus) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updateOrderStatus', orderId, status: newStatus })
        });
        const result = await response.json();
        if (result.status === 'success') {
            fetchOrders();
        }
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

function updateDashboardStats() {
    const salesEl = document.getElementById('dash-total-sales');
    const ordersEl = document.getElementById('dash-total-orders');
    const customersEl = document.getElementById('dash-customer-satisfaction');

    if (ordersEl) ordersEl.textContent = allOrders.length;
    
    // Total Sales Calculation
    const totalSales = allOrders
        .filter(o => o.orderStatus !== 'ملغي')
        .reduce((sum, o) => {
            const price = parseFloat(String(o.total).replace(/[^\d.]/g, '')) || 0;
            return sum + price;
        }, 0);
    
    if (salesEl) salesEl.innerHTML = `${totalSales.toLocaleString()} <span class="text-sm font-normal">د.أ</span>`;
    
    if (customersEl) {
        const uniqueCustomers = new Set(allOrders.map(o => o.phone)).size;
        customersEl.textContent = uniqueCustomers;
        // Update the label above it if possible, or just use it for customer count
        const label = customersEl.previousElementSibling;
        if (label) label.textContent = 'إجمالي الزبائن';
    }
}
