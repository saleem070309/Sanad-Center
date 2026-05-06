/**
 * Sanad Center - Admin Dashboard Logic
 * Handles products, orders, customers, and settings management.
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbx6V72d-tWyfPlU7AlA6LSovbdDP-gbRy-gjVnPmMwFoYbf0ub6AcpIomjGTtwN7UpV4g/exec';

// --- Global State ---
let allProducts = [];
let allOrders = [];
let allCustomers = [];
let allCategories = [];
let storeSettings = {};

// --- Icon List for Categories ---
const MATERIAL_ICONS = [
    'category', 'blender', 'vacuum', 'devices', 'kitchen', 'home_appliance', 'smart_toy', 
    'tv', 'speaker', 'laptop_mac', 'smartphone', 'router', 'wash', 'iron', 'microwave',
    'oven_gen', 'coffee_maker', 'air_purifier', 'nest_cam_iq', 'light', 'thermometer', 
    'bolt', 'water_drop', 'shopping_cart', 'store', 'card_giftcard', 'auto_fix_high'
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

window.fetchData = async function(forceRefresh = false) {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';

    try {
        const [prodRes, ordRes, custRes, catRes, setRes] = await Promise.all([
            fetch(`${API_URL}?action=getProducts`),
            fetch(`${API_URL}?action=getAllOrders`),
            fetch(`${API_URL}?action=getAllCustomers`),
            fetch(`${API_URL}?action=getCategories`),
            fetch(`${API_URL}?action=getSettings`)
        ]);

        const prodData = await prodRes.json();
        const ordData = await ordRes.json();
        const custData = await custRes.json();
        const catData = await catRes.json();
        const setData = await setRes.json();

        if (prodData.status === 'success') allProducts = prodData.products || [];
        if (ordData.status === 'success') allOrders = ordData.orders || [];
        if (custData.status === 'success') allCustomers = custData.customers || [];
        if (catData.status === 'success') allCategories = catData.categories || [];
        if (setData.status === 'success') storeSettings = setData.settings || {};

        renderAll();
    } catch (err) {
        console.error('Error fetching data:', err);
        alert('حدث خطأ أثناء جلب البيانات. يرجى التحقق من اتصالك بالإنترنت.');
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

function renderAll() {
    renderDashboard();
    renderOrdersPage();
    renderProductsPage();
    renderCustomersPage();
    renderCategoriesPage();
    renderSettingsPage();
    renderIconPicker();
}

// --- Navigation ---
window.showPage = function(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) target.style.display = 'block';

    // Update Nav active states
    document.querySelectorAll('.nav-desktop, .nav-mobile').forEach(btn => {
        const btnTarget = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (btnTarget === pageId) {
            btn.classList.add('bg-primary-container/20', 'text-primary');
            btn.classList.remove('text-on-surface-variant');
        } else {
            btn.classList.remove('bg-primary-container/20', 'text-primary');
            btn.classList.add('text-on-surface-variant');
        }
    });

    window.scrollTo(0, 0);
};

// --- Dashboard ---
function renderDashboard() {
    const validOrders = allOrders.filter(o => o.orderStatus !== 'ملغي');
    const totalSales = validOrders.reduce((sum, o) => sum + parseCurrency(o.total), 0);
    const avgValue = validOrders.length > 0 ? (totalSales / validOrders.length) : 0;

    setVal('dash-total-sales', `${totalSales.toLocaleString()} <span class="text-sm font-normal">د.أ</span>`);
    setVal('dash-total-orders', allOrders.length);
    setVal('dash-avg-value', `${avgValue.toFixed(2)} <span class="text-sm font-normal">د.أ</span>`);
    setVal('dash-total-customers', allCustomers.length);

    // Top Product
    let productCounts = {};
    validOrders.forEach(o => {
        if (o.products) {
            o.products.split('|').forEach(pStr => {
                const parts = pStr.split('x');
                const name = parts[0].trim();
                const qty = parts.length > 1 ? parseInt(parts[1]) : 1;
                productCounts[name] = (productCounts[name] || 0) + qty;
            });
        }
    });
    
    let topProduct = 'لا يوجد بيانات';
    let maxQty = 0;
    for (const [name, qty] of Object.entries(productCounts)) {
        if (qty > maxQty) {
            maxQty = qty;
            topProduct = name;
        }
    }
    setVal('dash-top-product', topProduct);

    // Recent Activities
    const activityContainer = document.getElementById('dash-recent-activities');
    if (activityContainer) {
        const recent = allOrders.slice(0, 5);
        if (recent.length === 0) {
            activityContainer.innerHTML = '<p class="text-on-surface-variant text-center py-4">لا توجد أنشطة حديثة</p>';
        } else {
            activityContainer.innerHTML = recent.map(o => {
                const statusColor = getStatusColor(o.orderStatus);
                return `
                    <div class="flex gap-4 items-center border-b border-surface-container-highest pb-4 last:border-0 last:pb-0">
                        <div class="w-12 h-12 rounded-xl ${statusColor} flex items-center justify-center shrink-0 font-bold text-[10px] text-center p-1">
                            ${o.orderStatus}
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between mb-1">
                                <h4 class="font-bold text-on-surface truncate pr-2 max-w-[200px]">${o.customerName || 'بدون اسم'}</h4>
                                <span class="text-xs text-on-surface-variant font-bold">#${o.orderId}</span>
                            </div>
                            <p class="text-[10px] text-on-surface-variant truncate max-w-[250px]">${o.products || ''}</p>
                            <p class="text-[8px] text-on-surface-variant/70 mt-1">${formatDate(o.date)}</p>
                        </div>
                        <div class="text-left shrink-0">
                            <span class="font-bold text-primary block text-sm">${o.total}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// --- Orders ---
function renderOrdersPage() {
    const kitchenList = allOrders.filter(o => o.orderStatus === 'جديد');
    const packingList = allOrders.filter(o => o.orderStatus === 'يُحضّر');
    const deliveryList = allOrders.filter(o => o.orderStatus === 'في الطريق');

    setVal('count-kitchen', kitchenList.length);
    setVal('count-packing', packingList.length);
    setVal('count-delivery', deliveryList.length);

    const renderOrderCard = (o, borderColor) => `
        <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm border-r-4 ${borderColor}">
            <div class="flex justify-between mb-3">
                <span class="text-xs font-bold text-on-surface-variant">#${o.orderId}</span>
                <span class="text-[10px] text-on-surface-variant">${formatDate(o.date, true)}</span>
            </div>
            <div class="mb-4">
                <h4 class="text-sm font-bold text-on-surface mb-1">${o.customerName || 'بدون اسم'}</h4>
                <p class="text-xs text-primary font-bold mb-2" dir="ltr">${o.phone || o.customerPhone || 'بدون هاتف'}</p>
                <div class="text-[11px] text-on-surface-variant leading-relaxed bg-surface p-2 rounded-md">
                    ${o.products.replace(/\|/g, '<br/>')}
                </div>
                ${o.notes ? `<p class="text-[10px] text-amber-700 bg-amber-50 mt-2 p-1.5 rounded">ملاحظة: ${o.notes}</p>` : ''}
                ${o.address ? `<p class="text-[10px] text-on-surface-variant mt-2 border-t pt-2 border-outline-variant/20"><span class="material-symbols-outlined text-[12px] align-middle">location_on</span> ${o.address}</p>` : ''}
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-surface-container-highest">
                <span class="text-sm font-bold text-primary">${o.total}</span>
                <select onchange="updateStatus('${o.orderId}', this.value)" class="text-[11px] bg-surface-container border-0 rounded-lg font-bold px-2 py-1.5 text-primary cursor-pointer focus:ring-0">
                    <option value="جديد" ${o.orderStatus === 'جديد' ? 'selected' : ''}>جديد</option>
                    <option value="يُحضّر" ${o.orderStatus === 'يُحضّر' ? 'selected' : ''}>يُحضّر</option>
                    <option value="في الطريق" ${o.orderStatus === 'في الطريق' ? 'selected' : ''}>في الطريق</option>
                    <option value="تم التوصيل" ${o.orderStatus === 'تم التوصيل' ? 'selected' : ''}>تم التوصيل</option>
                    <option value="ملغي" ${o.orderStatus === 'ملغي' ? 'selected' : ''}>ملغي</option>
                </select>
            </div>
        </div>
    `;

    const emptyMsg = '<div class="text-center text-sm text-on-surface-variant p-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">لا توجد طلبات</div>';

    setHtml('orders-kitchen', kitchenList.length ? kitchenList.map(o => renderOrderCard(o, 'border-blue-400')).join('') : emptyMsg);
    setHtml('orders-packing', packingList.length ? packingList.map(o => renderOrderCard(o, 'border-amber-400')).join('') : emptyMsg);
    setHtml('orders-delivery', deliveryList.length ? deliveryList.map(o => renderOrderCard(o, 'border-green-400')).join('') : emptyMsg);
}

window.updateStatus = async function(orderId, newStatus) {
    document.getElementById('global-loader').style.display = 'flex';
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updateOrderStatus', orderId, status: newStatus })
        });
        const result = await res.json();
        if (result.status === 'success') {
            await fetchData(true);
        } else {
            alert('فشل التحديث: ' + result.message);
        }
    } catch (err) {
        console.error('Error updating status:', err);
        alert('خطأ في الاتصال بالخادم.');
    } finally {
        document.getElementById('global-loader').style.display = 'none';
    }
};

// --- Products ---
function renderProductsPage() {
    // Update category dropdown in modal
    const catSelect = document.getElementById('p-cat');
    if (catSelect) {
        catSelect.innerHTML = '<option value="">اختر القسم...</option>' + 
            allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    setVal('total-products', allProducts.length);
    const grid = document.getElementById('admin-products-grid');
    if (!grid) return;

    if (allProducts.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا توجد منتجات مسجلة.</p>';
        return;
    }

    grid.innerHTML = allProducts.map(p => `
        <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm group flex flex-col h-full border border-surface-container">
            <div class="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-surface-container">
                <img src="${getDriveImageUrl(p.image)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://placehold.co/400x400/f1f5f9/1e3a8a?text=${encodeURIComponent(p.name)}'">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onclick="editProduct('${p.id}')" class="w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center border-0 cursor-pointer"><span class="material-symbols-outlined">edit</span></button>
                    <button onclick="deleteProduct('${p.id}')" class="w-10 h-10 rounded-full bg-white text-error flex items-center justify-center border-0 cursor-pointer"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </div>
            <div class="flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-1 gap-2">
                    <h4 class="font-bold text-on-surface text-sm line-clamp-2">${p.name}</h4>
                    <span class="text-[10px] text-on-surface-variant bg-surface px-2 py-1 rounded-md border border-outline-variant/30">${p.category}</span>
                </div>
                <p class="text-xs text-on-surface-variant line-clamp-2 mt-1 mb-auto">${p.description || 'لا يوجد وصف'}</p>
                <div class="mt-4 pt-3 border-t border-surface-container-highest flex justify-between items-center">
                    <span class="text-lg font-black text-primary">${p.price} <span class="text-xs font-normal">د.أ</span></span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Customers ---

window.editProduct = function(id) {
    openProductModal(id);
};


// Helper: show custom delete confirm modal, returns a Promise<boolean>
function showDeleteConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('delete-confirm-modal');
        const text  = document.getElementById('delete-confirm-text');
        const okBtn = document.getElementById('delete-confirm-btn');
        const cancelBtn = document.getElementById('delete-cancel-btn');

        if (message) text.textContent = message;
        modal.classList.remove('hidden');

        const cleanup = () => modal.classList.add('hidden');

        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };

        okBtn.onclick = onOk;
        cancelBtn.onclick = onCancel;
        modal.onclick = (e) => { if (e.target === modal) onCancel(); };
    });
}

window.deleteProduct = async function(id) {
    const confirmed = await showDeleteConfirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذه العملية.');
    if (!confirmed) return;

    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'deleteProduct', id })
        });
        const result = await res.json();
        if (result.status === 'success') {
            await fetchData(true);
        } else {
            alert('فشل الحذف: ' + (result.message || 'خطأ غير معروف'));
        }
    } catch (e) {
        console.error('Delete error:', e);
        alert('خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً.');
    } finally {
        if (loader) loader.style.display = 'none';
    }
};

// --- Customers ---
function renderCustomersPage() {
    const grid = document.getElementById('admin-customers-grid');
    if (!grid) return;

    if (allCustomers.length === 0) {
        grid.innerHTML = '<p class="text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا يوجد عملاء.</p>';
        return;
    }

    // Spending map
    const spendingMap = {};
    const lastOrderMap = {};
    allOrders.forEach(o => {
        if (o.orderStatus !== 'ملغي') {
            const phone = String(o.phone || o.customerPhone).trim();
            const total = parseCurrency(o.total);
            spendingMap[phone] = (spendingMap[phone] || 0) + total;
            if (!lastOrderMap[phone] || new Date(o.date) > new Date(lastOrderMap[phone].date)) {
                lastOrderMap[phone] = o;
            }
        }
    });

    const customersData = allCustomers.map(c => {
        const phone = String(c.phone).trim();
        const totalSpent = spendingMap[phone] || 0;
        let tier = { label: 'جديد', class: 'bg-surface-container text-on-surface-variant' };
        if (totalSpent > 150) tier = { label: 'ذهبي', class: 'bg-amber-100 text-amber-800 border-amber-300' };
        else if (totalSpent > 50) tier = { label: 'فضي', class: 'bg-gray-200 text-gray-800 border-gray-400' };
        else if (totalSpent > 0) tier = { label: 'برونزي', class: 'bg-orange-100 text-orange-900 border-orange-300' };
        return { ...c, totalSpent, tier, lastOrder: lastOrderMap[phone] };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    grid.innerHTML = customersData.map(c => `
        <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 border border-surface-container">
            <div class="w-16 h-16 rounded-full bg-primary-container/40 flex items-center justify-center text-primary font-black text-2xl shrink-0">
                ${(String(c.name || 'عميل')).substring(0, 2).toUpperCase()}
            </div>
            <div class="flex-grow text-center md:text-right">
                <h3 class="text-xl font-bold text-on-surface mb-1">${c.name || 'عميل'}</h3>
                <p class="text-on-surface-variant text-sm font-medium" dir="ltr">${c.phone}</p>
            </div>
            <div class="flex flex-col items-center md:items-start gap-1 px-4 md:border-r border-surface-container-highest flex-1">
                <span class="text-on-surface-variant text-xs font-bold">آخر طلب</span>
                <p class="text-sm font-medium text-on-surface line-clamp-1">${c.lastOrder ? c.lastOrder.products.split('|')[0] : 'لا يوجد'}</p>
                <span class="text-[10px] text-on-surface-variant bg-surface px-2 py-0.5 rounded">${c.lastOrder ? formatDate(c.lastOrder.date) : 'N/A'}</span>
            </div>
            <div class="flex flex-col items-center gap-2 px-4 md:border-r border-surface-container-highest">
                <span class="${c.tier.class} px-3 py-1 rounded-full text-xs font-bold border">${c.tier.label}</span>
                <span class="text-[10px] text-on-surface-variant">إجمالي: ${c.totalSpent.toFixed(2)} د.أ</span>
            </div>
        </div>
    `).join('');
}

// --- Categories ---
function renderCategoriesPage() {
    const grid = document.getElementById('admin-categories-grid');
    if (!grid) return;
    
    if (allCategories.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا توجد أقسام مضافة.</p>';
        return;
    }

    grid.innerHTML = allCategories.map((cat, idx) => `
        <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-center justify-between border border-surface-container">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined">${cat.icon || 'category'}</span>
                </div>
                <div>
                    <h4 class="font-bold text-on-surface">${cat.name}</h4>
                </div>
            </div>
            <button class="delete-cat-btn text-error bg-transparent border-0 cursor-pointer p-2 hover:bg-error-container/20 rounded-full transition-colors" data-name="${encodeURIComponent(cat.name)}">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `).join('');

    // Event delegation to safely handle Arabic names
    grid.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = decodeURIComponent(btn.dataset.name);
            deleteCategory(name);
        });
    });
}

function renderIconPicker() {
    const picker = document.getElementById('icon-picker');
    if (!picker) return;

    picker.innerHTML = MATERIAL_ICONS.map(icon => `
        <div onclick="selectIcon('${icon}', this)" class="icon-option flex items-center justify-center p-2 rounded-lg cursor-pointer hover:bg-primary/10 border border-transparent transition-all">
            <span class="material-symbols-outlined">${icon}</span>
        </div>
    `).join('');
}

window.selectIcon = function(icon, el) {
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected', 'bg-primary', 'text-white'));
    el.classList.add('selected', 'bg-primary', 'text-white');
    document.getElementById('cat-icon').value = icon;
};

window.deleteCategory = async function(id) {
    const confirmed = await showDeleteConfirm('سيتم حذف هذا القسم نهائياً. هل أنت متأكد؟');
    if (!confirmed) return;

    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'deleteCategory', name: id })
        });
        const result = await res.json();
        if (result.status !== 'success') {
            alert('فشل الحذف: ' + (result.message || 'خطأ غير معروف'));
        } else {
            await fetchData(true);
        }
    } catch(e) {
        console.error('Delete category error:', e);
        alert('خطأ في الاتصال بالخادم.');
    } finally {
        if (loader) loader.style.display = 'none';
    }
};

// --- Settings ---
function renderSettingsPage() {
    if (!storeSettings) return;
    setValInput('set-phone', storeSettings.phone || '');
    setValInput('set-fb', storeSettings.facebook || '');
    setValInput('set-fb-name', storeSettings.facebook_name || '');
}

// --- Event Listeners ---
function setupEventListeners() {
    // Add Product Form
    const prodForm = document.getElementById('add-product-form');
    if (prodForm) {
        prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = 'جاري الحفظ...';
            
            const id = document.getElementById('p-id').value;
            const imgFile = document.getElementById('p-img-file').files[0];
            let imageUrl = document.getElementById('p-img-url').value;

            // Handle Image Upload if a new file is selected
            if (imgFile) {
                btn.innerHTML = 'جاري رفع الصورة...';
                try {
                    const base64 = await toBase64(imgFile);
                    const uploadRes = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: JSON.stringify({
                            action: 'uploadImage',
                            base64: base64.split(',')[1],
                            mimeType: imgFile.type,
                            fileName: imgFile.name
                        })
                    });
                    const uploadResult = await uploadRes.json();
                    if (uploadResult.status === 'success') {
                        imageUrl = uploadResult.url;
                    }
                } catch (err) {
                    console.error('Image upload failed:', err);
                }
            }

            btn.innerHTML = 'جاري حفظ المنتج...';
            const product = {
                action: id ? 'updateProduct' : 'saveProduct',
                id: id || undefined,
                name: document.getElementById('p-name').value,
                description: document.getElementById('p-desc').value,
                price: parseFloat(document.getElementById('p-price').value),
                category: document.getElementById('p-cat').value,
                image: imageUrl,
                rating: '5.0',
                fillings: '',
                isBestSeller: document.getElementById('p-best').checked,
                inSlider: document.getElementById('p-slider').checked
            };

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(product)
                });
                const result = await res.json();
                if (result.status === 'success') {
                    document.getElementById('add-product-modal').classList.add('hidden');
                    prodForm.reset();
                    await fetchData(true);
                }
            } catch (err) {}
            btn.disabled = false;
            btn.innerHTML = 'حفظ المنتج';
        });
    }

    // Add Category Form
    const catForm = document.getElementById('add-category-form');
    if (catForm) {
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cat-name').value;
            const icon = document.getElementById('cat-icon').value;
            
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'saveCategory', name, icon })
                });
                catForm.reset();
                document.getElementById('add-category-modal').classList.add('hidden');
                await fetchData(true);
            } catch(e) {}
        });
    }

    // Settings Form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            
            const settingsPayload = {
                action: 'updateSettings',
                settings: {
                    phone: document.getElementById('set-phone').value,
                    facebook: document.getElementById('set-fb').value,
                    facebook_name: document.getElementById('set-fb-name').value
                }
            };

            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(settingsPayload)
                });
                alert('تم حفظ الإعدادات بنجاح');
            } catch (err) {}
            btn.disabled = false;
        });
    }
}

// --- Helpers ---
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
}
function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}
function setValInput(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
function parseCurrency(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
}
function getStatusColor(status) {
    const colors = {
        'جديد': 'text-blue-600 bg-blue-100',
        'يُحضّر': 'text-amber-600 bg-amber-100',
        'في الطريق': 'text-green-600 bg-green-100',
        'تم التوصيل': 'text-gray-600 bg-gray-100',
        'ملغي': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-primary bg-primary-container/20';
}
function formatDate(dateStr, withTime = false) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const options = { dateStyle: 'short' };
    if (withTime) options.timeStyle = 'short';
    return d.toLocaleString('ar-EG', options);
}
function getDriveImageUrl(url) {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

// Global helper for opening modal
window.openProductModal = function(id = '') {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;
    
    const form = document.getElementById('add-product-form');
    if (form) form.reset();
    
    document.getElementById('p-id').value = id || '';
    document.getElementById('p-img-url').value = '';
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('upload-controls').classList.remove('hidden');
    
    if (id) {
        const p = allProducts.find(x => x.id === id);
        if (p) {
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-desc').value = p.description;
            document.getElementById('p-price').value = p.price;
            document.getElementById('p-cat').value = p.category;
            document.getElementById('p-img-url').value = p.image;
            document.getElementById('p-best').checked = p.isBestSeller;
            document.getElementById('p-slider').checked = p.isSlider;
            
            if (p.image) {
                document.getElementById('p-img-preview').src = getDriveImageUrl(p.image);
                document.getElementById('image-preview-container').classList.remove('hidden');
                document.getElementById('upload-controls').classList.add('hidden');
            }
            document.getElementById('modal-title').textContent = 'تعديل المنتج';
        }
    } else {
        document.getElementById('modal-title').textContent = 'إضافة منتج جديد';
    }
    
    modal.classList.remove('hidden');
};

window.closeProductModal = function() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('hidden');
};

window.previewImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('p-img-preview').src = e.target.result;
            document.getElementById('image-preview-container').classList.remove('hidden');
            document.getElementById('upload-controls').classList.add('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.resetImageUpload = function() {
    document.getElementById('p-img-file').value = '';
    document.getElementById('p-img-url').value = '';
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('upload-controls').classList.remove('hidden');
};

window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};
