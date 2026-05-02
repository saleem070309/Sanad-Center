// ============================================
// Sanad Center — Admin Logic
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbx6V72d-tWyfPlU7AlA6LSovbdDP-gbRy-gjVnPmMwFoYbf0ub6AcpIomjGTtwN7UpV4g/exec';

let allProducts = [];
let allOrders = [];
let allCustomers = [];
let allCategories = [];
let allSettings = {};

const MATERIAL_ICONS = [
  'home_appliance', 'blender', 'microwave', 'vacuum', 'iron', 'coffee_maker', 
  'devices', 'smartphone', 'laptop', 'tv', 'speaker', 'lightbulb',
  'kitchen', 'chair', 'bed', 'closet', 'cleaning_services', 'ac_unit',
  'category', 'shopping_bag', 'star', 'bolt', 'eco', 'tools',
  'wash', 'oven', 'fan', 'dry', 'shelves', 'flatware'
];

// Formatting Helpers
function getDriveImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return `https://lh3.googleusercontent.com/d/${match2[1]}`;
  return trimmed;
}

function parseCurrency(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
}

function getInitials(name) {
  if (!name) return 'U';
  return name.substring(0, 2).toUpperCase();
}

function cleanWhatsAppPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\s+/g, '').replace('+', '').replace(/^00/, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '962' + clean.substring(1);
  }
  if (clean.length === 9 && !clean.startsWith('962')) {
    clean = '962' + clean;
  }
  return clean;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIconPicker();
  fetchData();
});

async function fetchData(forceRefresh = false) {
  if (forceRefresh) {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';
  }
  try {
    const [prodRes, ordRes, custRes, catRes, setRes] = await Promise.all([
      fetch(`${API_URL}?action=getProducts&_=${Date.now()}`),
      fetch(`${API_URL}?action=getAllOrders&_=${Date.now()}`),
      fetch(`${API_URL}?action=getAllCustomers&_=${Date.now()}`),
      fetch(`${API_URL}?action=getCategories&_=${Date.now()}`),
      fetch(`${API_URL}?action=getSettings&_=${Date.now()}`)
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
    if (setData.status === 'success') allSettings = setData.settings || {};

    renderAll();
  } catch (err) {
    console.error("Error fetching data:", err);
    alert("حدث خطأ أثناء جلب البيانات. يرجى التحقق من اتصالك بالإنترنت.");
  } finally {
    const loader = document.getElementById('global-loader');
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
  populateCategorySelects();
}

// Navigation
window.showPage = function(pageId) {
  document.querySelectorAll('.app-page').forEach(page => {
    page.style.display = 'none';
  });
  const target = document.getElementById(pageId);
  if (target) target.style.display = 'block';
  window.scrollTo(0, 0);

  // Update Desktop Nav
  document.querySelectorAll('.nav-desktop').forEach((btn) => {
    const targetId = btn.getAttribute('data-target');
    if (targetId === pageId) {
      btn.className = 'nav-desktop w-full flex items-center gap-3 px-4 py-3 bg-primary-container/20 text-primary rounded-xl font-bold text-sm transition-all border-0 cursor-pointer text-right';
    } else {
      btn.className = 'nav-desktop w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container/50 rounded-xl transition-all font-medium text-sm border-0 cursor-pointer text-right bg-transparent';
    }
  });

  // Update Mobile Nav
  document.querySelectorAll('.nav-mobile').forEach((btn) => {
    const targetId = btn.getAttribute('data-target');
    if (targetId === pageId) {
      btn.className = 'nav-mobile flex flex-col items-center justify-center text-primary px-3 py-1.5 transition-all bg-transparent border-0 cursor-pointer min-w-[60px]';
    } else {
      btn.className = 'nav-mobile flex flex-col items-center justify-center text-on-surface-variant px-3 py-1.5 transition-all bg-transparent border-0 cursor-pointer min-w-[60px]';
    }
  });
}

// Render Dashboard
function renderDashboard() {
  const totalOrders = allOrders.length;
  const validOrders = allOrders.filter(o => o.orderStatus !== 'ملغي');

  const totalSales = validOrders.reduce((sum, o) => sum + parseCurrency(o.total), 0);
  const avgValue = validOrders.length > 0 ? (totalSales / validOrders.length) : 0;

  const totalOrdersEl = document.getElementById('dash-total-orders');
  if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;

  const totalSalesEl = document.getElementById('dash-total-sales');
  if (totalSalesEl) totalSalesEl.innerHTML = `${totalSales.toLocaleString()} <span class="text-sm font-normal">د.أ</span>`;

  const avgValueEl = document.getElementById('dash-avg-value');
  if (avgValueEl) avgValueEl.innerHTML = `${avgValue.toFixed(2)} <span class="text-sm font-normal">د.أ</span>`;

  const totalCustomersEl = document.getElementById('dash-total-customers');
  if (totalCustomersEl) totalCustomersEl.textContent = allCustomers.length;

  let productCounts = {};
  validOrders.forEach(o => {
    if (o.products) {
      const items = o.products.split('|').map(i => i.trim());
      items.forEach(item => {
        const parts = item.split('x');
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
  const topProdEl = document.getElementById('dash-top-product');
  if (topProdEl) topProdEl.textContent = topProduct;

  const recent = allOrders.slice(0, 5); 
  const activityContainer = document.getElementById('dash-recent-activities');
  if (activityContainer) {
    if (recent.length === 0) {
      activityContainer.innerHTML = '<p class="text-on-surface-variant text-center py-4">لا توجد أنشطة حديثة</p>';
    } else {
      activityContainer.innerHTML = recent.map(o => {
        const statusColors = {
          'جديد': 'text-blue-600 bg-blue-100',
          'يُحضّر': 'text-amber-600 bg-amber-100',
          'في الطريق': 'text-green-600 bg-green-100',
          'تم التوصيل': 'text-gray-600 bg-gray-100',
          'ملغي': 'text-red-600 bg-red-100'
        };
        const colorClass = statusColors[o.orderStatus] || 'text-primary bg-primary-container/20';
        const dateObj = new Date(o.date);
        const dateStr = isNaN(dateObj) ? o.date : dateObj.toLocaleDateString('ar-EG') + ' ' + dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="flex gap-4 items-center border-b border-surface-container-highest pb-4 last:border-0 last:pb-0">
              <div class="w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center shrink-0 font-bold text-xs">
                  ${o.orderStatus}
              </div>
              <div class="flex-1">
                  <div class="flex justify-between mb-1">
                      <h4 class="font-bold text-on-surface truncate pr-2 max-w-[200px]">${o.customerName}</h4>
                      <span class="text-xs text-on-surface-variant font-bold">#${o.orderId}</span>
                  </div>
                  <p class="text-xs text-on-surface-variant truncate max-w-[250px]">${o.products}</p>
                  <p class="text-[10px] text-on-surface-variant/70 mt-1">${dateStr}</p>
              </div>
              <div class="text-left shrink-0">
                  <span class="font-bold text-primary block">${o.total}</span>
              </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Render Orders
function renderOrdersPage() {
  const kitchenList = allOrders.filter(o => o.orderStatus === 'جديد');
  const packingList = allOrders.filter(o => o.orderStatus === 'يُحضّر');
  const deliveryList = allOrders.filter(o => o.orderStatus === 'في الطريق');

  const kitchenCount = document.getElementById('count-kitchen');
  if (kitchenCount) kitchenCount.textContent = kitchenList.length;

  const packingCount = document.getElementById('count-packing');
  if (packingCount) packingCount.textContent = packingList.length;

  const deliveryCount = document.getElementById('count-delivery');
  if (deliveryCount) deliveryCount.textContent = deliveryList.length;

  const renderOrderCard = (o, borderColorClass) => `
    <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm border-r-4 ${borderColorClass}">
        <div class="flex justify-between mb-3">
            <span class="text-xs font-bold text-on-surface-variant">#${o.orderId}</span>
            <span class="text-[10px] text-on-surface-variant">${new Date(o.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="mb-4">
            <h4 class="text-sm font-bold text-on-surface mb-1">${o.customerName}</h4>
            <a href="https://api.whatsapp.com/send?phone=${cleanWhatsAppPhone(o.phone)}" target="_blank" class="text-xs text-primary font-bold mb-2 no-underline flex items-center gap-1 hover:underline">
                <span class="material-symbols-outlined text-[14px]">chat</span> ${o.phone}
            </a>
            <p class="text-[11px] text-on-surface-variant leading-relaxed bg-surface p-2 rounded-md">${o.products.replace(/\|/g, '<br/>')}</p>
            ${o.notes ? `<p class="text-[10px] text-amber-700 bg-amber-50 mt-2 p-1.5 rounded">ملاحظة: ${o.notes}</p>` : ''}
            ${o.address ? `<p class="text-[10px] text-on-surface-variant mt-2 border-t pt-2 border-outline-variant/20 line-clamp-2"><span class="material-symbols-outlined text-[12px] align-middle">location_on</span> ${o.address}</p>` : ''}
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

  const emptyMsg = '<div class="text-center text-sm text-on-surface-variant p-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">لا توجد طلبات هنا</div>';

  const kitchenGrid = document.getElementById('orders-kitchen');
  if (kitchenGrid) kitchenGrid.innerHTML = kitchenList.length ? kitchenList.map(o => renderOrderCard(o, 'border-blue-400')).join('') : emptyMsg;

  const packingGrid = document.getElementById('orders-packing');
  if (packingGrid) packingGrid.innerHTML = packingList.length ? packingList.map(o => renderOrderCard(o, 'border-amber-400')).join('') : emptyMsg;

  const deliveryGrid = document.getElementById('orders-delivery');
  if (deliveryGrid) deliveryGrid.innerHTML = deliveryList.length ? deliveryList.map(o => renderOrderCard(o, 'border-green-400')).join('') : emptyMsg;
}

// Update Order Status
async function updateStatus(orderId, newStatus) {
  showLoader();
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateOrderStatus', orderId, status: newStatus })
    });
    const result = await response.json();
    if (result.status === 'success') {
      const order = allOrders.find(o => o.orderId === orderId);
      if (order) order.orderStatus = newStatus;
      renderAll();
    } else {
      alert('فشل التحديث: ' + result.message);
    }
  } catch (err) {
    console.error('Error updating status:', err);
    alert('خطأ في الاتصال بالخادم.');
  } finally {
    hideLoader();
  }
}

// Render Products
function renderProductsPage() {
  const totalProductsEl = document.getElementById('total-products');
  if (totalProductsEl) totalProductsEl.textContent = allProducts.length;

  const grid = document.getElementById('admin-products-grid');
  if (!grid) return;

  if (allProducts.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا توجد منتجات مسجلة. اضغط على إضافة منتج للبدء.</p>';
    return;
  }

  grid.innerHTML = allProducts.map(p => {
    const imgUrl = getDriveImageUrl(p.image);
    const finalImg = imgUrl ? imgUrl : `https://placehold.co/400x400/f1f5f9/1e3a8a?text=${encodeURIComponent(p.name)}`;

    return `
      <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm group flex flex-col h-full border border-surface-container">
          <div class="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-surface-container">
              <img src="${finalImg}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${p.name}" onerror="this.src='assets/images/ball.png'">
              <div class="absolute top-2 right-2 flex flex-col gap-1">
                 ${p.isBestSeller ? '<span class="bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">أكثر مبيعاً</span>' : ''}
                 ${p.inSlider ? '<span class="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">في السلايدر</span>' : ''}
              </div>
          </div>
          <div class="flex-1 flex flex-col">
              <div class="flex justify-between items-start mb-1 gap-2">
                  <h4 class="font-bold text-on-surface text-sm line-clamp-2">${p.name}</h4>
                  <span class="text-[10px] text-on-surface-variant bg-surface px-2 py-1 rounded-md whitespace-nowrap shrink-0 border border-outline-variant/30">${p.category}</span>
              </div>
              <p class="text-xs text-on-surface-variant line-clamp-2 mt-1 mb-auto">${p.description || 'لا يوجد وصف'}</p>
              <div class="mt-4 pt-3 border-t border-surface-container-highest flex justify-between items-center">
                  <span class="text-lg font-black text-primary">${p.price} <span class="text-xs font-normal">د.أ</span></span>
                  <div class="flex gap-2">
                      <button onclick="editProduct('${p.id}')" class="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-primary/10 text-primary transition border-0 cursor-pointer">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onclick="deleteProduct('${p.id}')" class="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-error/10 text-error transition border-0 cursor-pointer">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                  </div>
              </div>
          </div>
      </div>
    `}).join('');
}

// Render Categories
function renderCategoriesPage() {
  const grid = document.getElementById('admin-categories-grid');
  if (!grid) return;

  if (allCategories.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا توجد أقسام مسجلة.</p>';
    return;
  }

  grid.innerHTML = allCategories.map(cat => `
    <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container flex items-center gap-4 group">
      <div class="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
        <span class="material-symbols-outlined">${cat.icon || 'category'}</span>
      </div>
      <div class="flex-grow">
        <h4 class="font-bold text-on-surface">${cat.name}</h4>
      </div>
      <button onclick="deleteCategory('${cat.name}')" class="w-9 h-9 rounded-full bg-surface-container hover:bg-error/10 text-error flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border-0 cursor-pointer">
        <span class="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  `).join('');
}

// Render Settings
function renderSettingsPage() {
  const phoneInput = document.getElementById('set-phone');
  const fbInput = document.getElementById('set-fb');
  const fbNameInput = document.getElementById('set-fb-name');
  const videoInput = document.getElementById('set-video');

  if (phoneInput) phoneInput.value = allSettings.phone || '';
  if (fbInput) fbInput.value = allSettings.facebook || '';
  if (fbNameInput) fbNameInput.value = allSettings.facebook_name || '';
  if (videoInput) videoInput.value = allSettings.hero_video || '';
}

function populateCategorySelects() {
  const select = document.getElementById('p-cat');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = allCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  if (currentVal) select.value = currentVal;
}

// Product Management
window.openProductModal = function(pId = null) {
  const modal = document.getElementById('add-product-modal');
  const form = document.getElementById('add-product-form');
  const title = document.getElementById('modal-title');
  const idInput = document.getElementById('p-id');

  form.reset();
  resetImageUpload();
  
  if (pId) {
    const p = allProducts.find(x => x.id === pId);
    if (p) {
      title.textContent = 'تعديل المنتج';
      idInput.value = p.id;
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-desc').value = p.description;
      document.getElementById('p-price').value = p.price;
      document.getElementById('p-cat').value = p.category;
      document.getElementById('p-img-url').value = p.image;
      document.getElementById('p-best').checked = p.isBestSeller;
      document.getElementById('p-slider').checked = p.inSlider;
      
      if (p.image) {
        const preview = document.getElementById('p-img-preview');
        preview.src = getDriveImageUrl(p.image);
        document.getElementById('image-preview-container').classList.remove('hidden');
        document.getElementById('upload-controls').classList.add('hidden');
      }
    }
  } else {
    title.textContent = 'إضافة منتج جديد';
    idInput.value = '';
  }
  
  modal.classList.remove('hidden');
}

window.closeProductModal = function() {
  document.getElementById('add-product-modal').classList.add('hidden');
}

window.deleteProduct = async function(pId) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  showLoader();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteProduct', id: pId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      fetchData(true);
    } else {
      alert('فشل الحذف: ' + data.message);
    }
  } catch (err) {
    alert('خطأ في الاتصال');
  } finally {
    hideLoader();
  }
}

window.editProduct = function(pId) {
  openProductModal(pId);
}

// Category Management
window.deleteCategory = async function(name) {
  if (!confirm(`هل أنت متأكد من حذف قسم "${name}"؟`)) return;
  showLoader();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteCategory', name })
    });
    const data = await res.json();
    if (data.status === 'success') {
      fetchData(true);
    } else {
      alert('فشل الحذف: ' + data.message);
    }
  } catch (err) {
    alert('خطأ في الاتصال');
  } finally {
    hideLoader();
  }
}

// Image Handling
window.previewImage = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('p-img-preview');
      preview.src = e.target.result;
      document.getElementById('image-preview-container').classList.remove('hidden');
      document.getElementById('upload-controls').classList.add('hidden');
    }
    reader.readAsDataURL(input.files[0]);
  }
}

window.resetImageUpload = function() {
  document.getElementById('p-img-file').value = '';
  document.getElementById('p-img-url').value = '';
  document.getElementById('image-preview-container').classList.add('hidden');
  document.getElementById('upload-controls').classList.remove('hidden');
}

async function uploadFileToDrive(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function() {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'uploadImage',
            base64: base64,
            mimeType: file.type,
            fileName: file.name
          })
        });
        const data = await res.json();
        if (data.status === 'success') resolve(data.url);
        else reject(data.message);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Icon Picker Setup
function setupIconPicker() {
  const picker = document.getElementById('icon-picker');
  if (!picker) return;
  
  picker.innerHTML = MATERIAL_ICONS.map(icon => `
    <div onclick="selectIcon('${icon}', this)" class="icon-option border border-outline-variant rounded-lg p-2 flex items-center justify-center cursor-pointer hover:bg-primary-container/20 transition-colors">
      <span class="material-symbols-outlined">${icon}</span>
    </div>
  `).join('');
}

window.selectIcon = function(icon, el) {
  document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('cat-icon').value = icon;
}

// Event Listeners
function setupEventListeners() {
  // Product Form
  const prodForm = document.getElementById('add-product-form');
  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-prod');
      btn.disabled = true;
      btn.textContent = 'جاري المعالجة...';

      try {
        let imageUrl = document.getElementById('p-img-url').value;
        const fileInput = document.getElementById('p-img-file');
        
        if (fileInput.files.length > 0) {
          btn.textContent = 'جاري رفع الصورة...';
          imageUrl = await uploadFileToDrive(fileInput.files[0]);
        }

        const pId = document.getElementById('p-id').value;
        const payload = {
          action: pId ? 'updateProduct' : 'saveProduct',
          id: pId,
          name: document.getElementById('p-name').value,
          description: document.getElementById('p-desc').value,
          price: parseFloat(document.getElementById('p-price').value),
          category: document.getElementById('p-cat').value,
          image: imageUrl,
          isBestSeller: document.getElementById('p-best').checked,
          inSlider: document.getElementById('p-slider').checked
        };

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
          closeProductModal();
          fetchData(true);
        } else {
          alert('فشل الحفظ: ' + data.message);
        }
      } catch (err) {
        alert('حدث خطأ: ' + err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التغييرات';
      }
    });
  }

  // Category Form
  const catForm = document.getElementById('add-category-form');
  if (catForm) {
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoader();
      try {
        const payload = {
          action: 'saveCategory',
          name: document.getElementById('cat-name').value,
          icon: document.getElementById('cat-icon').value
        };
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
          document.getElementById('add-category-modal').classList.add('hidden');
          catForm.reset();
          fetchData(true);
        }
      } catch (err) {
        alert('حدث خطأ');
      } finally {
        hideLoader();
      }
    });
  }

  // Settings Form
  const setForm = document.getElementById('settings-form');
  if (setForm) {
    setForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoader();
      try {
        const payload = {
          action: 'updateSettings',
          settings: {
            phone: document.getElementById('set-phone').value,
            facebook: document.getElementById('set-fb').value,
            facebook_name: document.getElementById('set-fb-name').value,
            hero_video: document.getElementById('set-video').value
          }
        };
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
          alert('تم تحديث الإعدادات بنجاح');
          fetchData(true);
        }
      } catch (err) {
        alert('حدث خطأ');
      } finally {
        hideLoader();
      }
    });
  }
}

function showLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'flex';
}

function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'none';
}

// Customers Page Logic
function renderCustomersPage() {
  const grid = document.getElementById('admin-customers-grid');
  if (!grid) return;

  if (allCustomers.length === 0) {
    grid.innerHTML = '<p class="text-center py-12 text-on-surface-variant font-bold bg-surface-container-low rounded-2xl">لا يوجد عملاء مسجلين حتى الآن.</p>';
    return;
  }

  const spendingMap = {};
  const lastOrderMap = {};

  allOrders.forEach(o => {
    if (o.orderStatus !== 'ملغي') {
      const phone = String(o.phone).trim();
      const total = parseCurrency(o.total);
      spendingMap[phone] = (spendingMap[phone] || 0) + total;

      if (!lastOrderMap[phone] || new Date(o.date) > new Date(lastOrderMap[phone].date)) {
        lastOrderMap[phone] = { date: o.date, products: o.products };
      }
    }
  });

  const customersData = allCustomers.map(c => {
    const phone = String(c.phone).trim();
    const totalSpent = spendingMap[phone] || 0;
    let tier = { label: 'جديد', class: 'bg-surface-container text-on-surface-variant' };

    if (totalSpent > 150) tier = { label: 'ذهبي (Gold)', class: 'bg-amber-100 text-amber-800 border border-amber-300' };
    else if (totalSpent > 50) tier = { label: 'فضي (Silver)', class: 'bg-gray-200 text-gray-800 border border-gray-400' };
    else if (totalSpent > 0) tier = { label: 'برونزي (Bronze)', class: 'bg-orange-100 text-orange-900 border border-orange-300' };

    return { ...c, totalSpent, tier, lastOrder: lastOrderMap[phone] };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  grid.innerHTML = customersData.map(c => {
    const initials = getInitials(c.name);
    const dateStr = new Date(c.registrationDate).toLocaleDateString('ar-EG');
    const lastProd = c.lastOrder ? c.lastOrder.products.split('|')[0] : 'لا توجد طلبات مكتملة';
    const lastDate = c.lastOrder ? new Date(c.lastOrder.date).toLocaleDateString('ar-EG') : '';

    return `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 border border-surface-container">
          <div class="w-16 h-16 rounded-full bg-primary-container/40 flex items-center justify-center text-primary font-black text-2xl shrink-0">
              ${initials}
          </div>
          <div class="flex-grow text-center md:text-right">
              <h3 class="text-xl font-bold text-on-surface mb-1">${c.name}</h3>
              <p class="text-on-surface-variant text-sm font-medium" dir="ltr">${c.phone}</p>
          </div>
          
          <div class="flex flex-col items-center md:items-start gap-1 px-4 md:border-r border-surface-container-highest flex-1">
              <span class="text-on-surface-variant text-xs font-bold">آخر طلب</span>
              <p class="text-sm font-medium text-on-surface line-clamp-1" title="${lastProd}">${lastProd}</p>
              <span class="text-[10px] text-on-surface-variant bg-surface px-2 py-0.5 rounded">${lastDate || 'N/A'}</span>
          </div>

          <div class="flex flex-col items-center gap-2 px-4 md:border-r border-surface-container-highest">
              <span class="${c.tier.class} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">${c.tier.label}</span>
              <span class="text-[10px] text-on-surface-variant">انضم في ${dateStr}</span>
          </div>

          <div class="flex flex-col items-center md:items-end gap-1 px-4 shrink-0">
              <span class="text-on-surface-variant text-xs font-bold">إجمالي المشتريات</span>
              <span class="text-xl font-black text-primary">${c.totalSpent.toFixed(2)} د.أ</span>
          </div>
      </div>
    `}).join('');
}
