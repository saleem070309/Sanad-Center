const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const lines = code.split(/\r?\n/);

const missing = [
'                        </div>',
'                    </div>',
'                </div>',
'            </div>',
'            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">',
'                <div class="col-span-1 bg-surface-container-low p-8 rounded-xl flex flex-col gap-4 shadow-none">',
'                    <h3 class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">المعلومات الغذائية</h3>',
'                    <div class="grid grid-cols-2 gap-4">',
'                        <div><p class="text-xs text-on-surface-variant">السعرات</p><p class="text-lg font-bold text-on-surface">٣٤٠</p></div>',
'                        <div><p class="text-xs text-on-surface-variant">الدهون</p><p class="text-lg font-bold text-on-surface">١٤ غ</p></div>',
'                        <div><p class="text-xs text-on-surface-variant">البروتين</p><p class="text-lg font-bold text-on-surface">٥ غ</p></div>',
'                        <div><p class="text-xs text-on-surface-variant">السكر</p><p class="text-lg font-bold text-on-surface">٢٢ غ</p></div>',
'                    </div>',
'                </div>',
'                <div class="col-span-1 md:col-span-2 bg-surface-container-low p-8 rounded-xl shadow-none flex flex-col md:flex-row justify-between items-center gap-8 border-0">',
'                    <div class="flex flex-col gap-2 w-full">',
'                        <span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest">ملاحظات خاصة</span>',
'                        <input class="w-full bg-surface-container-highest border-0 rounded-md p-4 focus:ring-0 text-sm text-on-surface placeholder:text-outline" placeholder="أضف ملاحظة لطاهي الحلويات..." type="text" />',
'                    </div>',
'                </div>',
'            </div>',
'        </main>',
'        <div class="fixed bottom-[84px] md:bottom-0 left-0 w-full z-40 px-6 pb-6 pt-6 bg-surface/90 backdrop-blur-2xl shadow-ambient rounded-t-[1.5rem]">',
'            <div class="max-w-4xl mx-auto flex items-center justify-between gap-6">',
'                <div class="hidden md:flex flex-col">',
'                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">السعر الإجمالي</span>',
'                    <span class="text-2xl font-black text-primary">١٨٥.٠٠ د.أ</span>',
'                </div>',
'                <button onclick="addToCart({ id: \'detail-1\', name: \'كيك الشوكولاتة الفاخرة\', price: 185, image: \'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80\', description: \'كيكة الشوكولاتة الداكنة\' })" class="flex-1 border-0 bg-gradient-to-br from-primary-container to-primary text-on-primary py-4 px-8 rounded-md font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all">',
'                    <span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">shopping_bag</span>',
'                    أضف إلى السلة',
'                </button>',
'                <button onclick="navigate(\'page_6\')" class="w-14 h-14 rounded-md flex items-center justify-center bg-tertiary-container text-on-tertiary-container shadow-none border-0">',
'                    <span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">favorite</span>',
'                </button>',
'            </div>',
'        </div>',
'    </div>'
];

// lines array is zero-indexed
// the target to replace is lines 365 to 372 (inclusive)
// which are indices 364 to 371. That is 371 - 364 + 1 = 8 elements starting at index 364
lines.splice(364, 8, ...missing);
fs.writeFileSync('index.html', lines.join('\r\n'));
