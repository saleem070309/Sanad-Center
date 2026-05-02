/* ============================================
   Sanad Center — Google Apps Script API
   ============================================
   
   عند أول تشغيل، شغّل دالة setupSheets() من القائمة العلوية
   لإنشاء الأوراق والأعمدة تلقائياً.
   
   ============================================ */

// ── إعداد أولي: شغّل هذه الدالة مرة واحدة فقط ──
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- ورقة Products ---
  let productsSheet = ss.getSheetByName('Products');
  if (!productsSheet) {
    productsSheet = ss.insertSheet('Products');
  }
  
  const headers = ['اسم المنتج', 'سعر المنتج', 'وصف المنتج', 'تقييم المنتج', 'رابط صورة المنتج', 'تصنيف المنتج', 'الحشوات', 'الوحدة', 'الأكثر مبيعاً', 'في السلايدر'];
  productsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const headerRange = productsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e3a8a');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  
  productsSheet.setColumnWidth(1, 200);
  productsSheet.setColumnWidth(2, 120);
  productsSheet.setColumnWidth(3, 300);
  productsSheet.setColumnWidth(4, 120);
  productsSheet.setColumnWidth(5, 350);
  productsSheet.setColumnWidth(6, 150);
  productsSheet.setColumnWidth(7, 200);
  productsSheet.setColumnWidth(8, 100);
  productsSheet.setColumnWidth(9, 100);
  productsSheet.setColumnWidth(10, 100);
  
  productsSheet.setFrozenRows(1);
  
  // --- ورقة Customers ---
  let customersSheet = ss.getSheetByName('Customers');
  if (!customersSheet) {
    customersSheet = ss.insertSheet('Customers');
  }
  const custHeaders = ['رقم الهاتف', 'الاسم', 'المحافظة', 'العنوان', 'تاريخ التسجيل'];
  customersSheet.getRange(1, 1, 1, custHeaders.length).setValues([custHeaders]);
  const custHeaderRange = customersSheet.getRange(1, 1, 1, custHeaders.length);
  custHeaderRange.setFontWeight('bold');
  custHeaderRange.setBackground('#1e3a8a');
  custHeaderRange.setFontColor('#ffffff');
  customersSheet.setFrozenRows(1);
  
  // --- ورقة Orders ---
  let ordersSheet = ss.getSheetByName('Orders');
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet('Orders');
  }
  const orderHeaders = ['رقم الطلب', 'الاسم', 'الهاتف', 'المحافظة', 'العنوان', 'المنتجات', 'المجموع', 'الحالة', 'التاريخ', 'موقع العميل', 'موقع الموصل', 'ملاحظات'];
  ordersSheet.getRange(1, 1, 1, orderHeaders.length).setValues([orderHeaders]);
  const orderHeaderRange = ordersSheet.getRange(1, 1, 1, orderHeaders.length);
  orderHeaderRange.setFontWeight('bold');
  orderHeaderRange.setBackground('#1e3a8a');
  orderHeaderRange.setFontColor('#ffffff');
  ordersSheet.setFrozenRows(1);

  // --- ورقة Settings ---
  let settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
  }
  const settingsHeaders = ['المفتاح', 'القيمة'];
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]);
  if (settingsSheet.getLastRow() === 1) {
    settingsSheet.appendRow(['phone', '+962788144210']);
    settingsSheet.appendRow(['facebook', 'https://web.facebook.com/profile.php?id=61583604596426']);
    settingsSheet.appendRow(['facebook_name', 'Sanad Center Jordan']);
  }
  settingsSheet.setFrozenRows(1);

  // --- ورقة Categories ---
  let categoriesSheet = ss.getSheetByName('Categories');
  if (!categoriesSheet) {
    categoriesSheet = ss.insertSheet('Categories');
  }
  const catHeaders = ['اسم القسم', 'الأيقونة'];
  categoriesSheet.getRange(1, 1, 1, catHeaders.length).setValues([catHeaders]);
  if (categoriesSheet.getLastRow() === 1) {
    categoriesSheet.appendRow(['المطبخ', 'blender']);
    categoriesSheet.appendRow(['التنظيف', 'vacuum']);
    categoriesSheet.appendRow(['الأجهزة الذكية', 'devices']);
  }
  categoriesSheet.setFrozenRows(1);
  
  SpreadsheetApp.getUi().alert('✅ تم إعداد الأوراق والأعمدة بنجاح!');
}

// ── API ──
function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch(action) {
    case 'getProducts': result = getProducts(); break;
    case 'getAllOrders': result = getAllOrders(); break;
    case 'getAllCustomers': result = getAllCustomers(); break;
    case 'getSettings': result = getSettings(); break;
    case 'getCategories': result = getCategories(); break;
    case 'getMyOrders': result = getMyOrders(e.parameter.phone); break;
    default: result = { status: 'error', message: 'Unknown action' };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON' })).setMimeType(ContentService.MimeType.JSON);
  }

  let result;
  switch(data.action) {
    case 'addOrder': result = addOrder(data); break;
    case 'saveCustomer': result = saveCustomer(data); break;
    case 'saveProduct': result = saveProduct(data); break;
    case 'updateProduct': result = updateProduct(data); break;
    case 'deleteProduct': result = deleteProduct(data.id); break;
    case 'updateOrderStatus': result = updateOrderStatus(data); break;
    case 'updateSettings': result = updateSettings(data); break;
    case 'saveCategory': result = saveCategory(data); break;
    case 'deleteCategory': result = deleteCategory(data.name); break;
    case 'uploadImage': result = uploadImage(data); break;
    default: result = { status: 'error', message: 'Unknown action: ' + (data ? data.action : 'undefined') };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// -- Products --
function getProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return { status: 'success', products: [] };
  
  const headers = data[0];
  const products = [];
  const m = mapHeaders(headers);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[m.name]) continue;
    
    products.push({
      id: String(i + 1), // Row number as ID
      name: String(row[m.name] || ''),
      price: row[m.price] || 0,
      description: String(row[m.description] || ''),
      rating: String(row[m.rating] || '5.0'),
      image: String(row[m.image] || ''),
      category: String(row[m.category] || ''),
      fillings: row[m.fillings] ? String(row[m.fillings]).split(/[،,]/).map(f => f.trim()).filter(f => f) : [],
      unit: String(row[m.unit] || ''),
      isBestSeller: !!row[m.isBestSeller],
      inSlider: !!row[m.inSlider]
    });
  }
  return { status: 'success', products };
}

function saveProduct(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const m = mapHeaders(headers);

  const rowData = [];
  rowData[m.name] = data.name;
  rowData[m.price] = data.price;
  rowData[m.description] = data.description;
  rowData[m.rating] = data.rating || '5.0';
  rowData[m.image] = data.image;
  rowData[m.category] = data.category;
  rowData[m.fillings] = Array.isArray(data.fillings) ? data.fillings.join(',') : data.fillings;
  rowData[m.unit] = data.unit || '';
  rowData[m.isBestSeller] = data.isBestSeller || false;
  rowData[m.inSlider] = data.inSlider || false;

  sheet.appendRow(rowData);
  return { status: 'success', message: 'تمت إضافة المنتج بنجاح' };
}

function updateProduct(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const m = mapHeaders(headers);
  const rowIndex = parseInt(data.id);

  if (isNaN(rowIndex) || rowIndex < 2) return { status: 'error', message: 'Invalid ID' };

  sheet.getRange(rowIndex, m.name + 1).setValue(data.name);
  sheet.getRange(rowIndex, m.price + 1).setValue(data.price);
  sheet.getRange(rowIndex, m.description + 1).setValue(data.description);
  sheet.getRange(rowIndex, m.image + 1).setValue(data.image);
  sheet.getRange(rowIndex, m.category + 1).setValue(data.category);
  sheet.getRange(rowIndex, m.isBestSeller + 1).setValue(data.isBestSeller);
  sheet.getRange(rowIndex, m.inSlider + 1).setValue(data.inSlider);

  return { status: 'success', message: 'تم تحديث المنتج' };
}

function deleteProduct(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  const rowIndex = parseInt(id);
  if (isNaN(rowIndex) || rowIndex < 2) return { status: 'error', message: 'Invalid ID' };
  sheet.deleteRow(rowIndex);
  return { status: 'success', message: 'تم حذف المنتج' };
}

// -- Settings --
function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return { status: 'success', settings };
}

function updateSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  const settings = data.settings; // Object { phone: "...", facebook: "..." }
  const existing = sheet.getDataRange().getValues();
  
  for (let key in settings) {
    let found = false;
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, settings[key]]);
    }
  }
  return { status: 'success', message: 'تم تحديث الإعدادات' };
}

// -- Categories --
function getCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  const data = sheet.getDataRange().getValues();
  const categories = [];
  for (let i = 1; i < data.length; i++) {
    categories.push({ name: data[i][0], icon: data[i][1] });
  }
  return { status: 'success', categories };
}

function saveCategory(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  sheet.appendRow([data.name, data.icon]);
  return { status: 'success', message: 'تم إضافة القسم' };
}

function deleteCategory(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'تم حذف القسم' };
    }
  }
  return { status: 'error', message: 'القسم غير موجود' };
}

// -- Image Upload --
function uploadImage(data) {
  try {
    const folderName = 'SanadCenter_Images';
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const contentType = data.mimeType || 'image/png';
    const decoded = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(decoded, contentType, data.fileName || 'product_image.png');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { status: 'success', url: file.getUrl() };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// -- Helpers --
function mapHeaders(headers) {
  const mapping = {};
  headers.forEach((h, idx) => {
    const header = String(h).trim();
    if (header === 'اسم المنتج') mapping.name = idx;
    else if (header === 'سعر المنتج') mapping.price = idx;
    else if (header === 'وصف المنتج') mapping.description = idx;
    else if (header === 'تقييم المنتج') mapping.rating = idx;
    else if (header === 'رابط صورة المنتج') mapping.image = idx;
    else if (header === 'تصنيف المنتج') mapping.category = idx;
    else if (header === 'الحشوات' || header === 'النكهات') mapping.fillings = idx;
    else if (header === 'الوحدة') mapping.unit = idx;
    else if (header === 'الأكثر مبيعاً') mapping.isBestSeller = idx;
    else if (header === 'في السلايدر') mapping.inSlider = idx;
  });
  return mapping;
}

// Rest of existing functions (addOrder, saveCustomer, updateOrderStatus, getMyOrders, getAllOrders, getAllCustomers)
function addOrder(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Orders');
  const orderId = 'SC' + Date.now().toString().slice(-6);
  sheet.appendRow([orderId, data.customerName, data.customerPhone, data.governorate, data.address, data.products, data.total, 'جديد', new Date().toISOString(), data.customerLocation || '', '', data.notes || '']);
  return { status: 'success', orderId: orderId };
}

function saveCustomer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Customers');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.phone)) {
      sheet.getRange(i + 1, 2).setValue(data.name);
      return { status: 'success' };
    }
  }
  sheet.appendRow([data.phone, data.name, '', '', new Date().toISOString()]);
  return { status: 'success' };
}

function updateOrderStatus(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  const dataValues = sheet.getDataRange().getValues();
  for (let i = 1; i < dataValues.length; i++) {
    if (String(dataValues[i][0]) === String(data.orderId)) {
      sheet.getRange(i + 1, 8).setValue(data.status);
      return { status: 'success' };
    }
  }
  return { status: 'error' };
}

function getMyOrders(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(phone)) {
      orders.push({ orderId: data[i][0], products: data[i][5], total: data[i][6], orderStatus: data[i][7], date: data[i][8] });
    }
  }
  return { status: 'success', orders: orders.reverse() };
}

function getAllOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders');
  if (!sheet) return { status: 'success', orders: [] };
  const data = sheet.getDataRange().getValues();
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    orders.push({ orderId: data[i][0], customerName: data[i][1], phone: data[i][2], governorate: data[i][3], address: data[i][4], products: data[i][5], total: data[i][6], orderStatus: data[i][7], date: data[i][8], notes: data[i][11] });
  }
  return { status: 'success', orders: orders.reverse() };
}

function getAllCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');
  if (!sheet) return { status: 'success', customers: [] };
  const data = sheet.getDataRange().getValues();
  const customers = [];
  for (let i = 1; i < data.length; i++) {
    customers.push({ phone: data[i][0], name: data[i][1], registrationDate: data[i][4] });
  }
  return { status: 'success', customers: customers };
}
