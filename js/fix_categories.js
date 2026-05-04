const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const anchor1 = `                    <button onclick="changeSlide(1)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
                    <button onclick="changeSlide(2)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
                </div>`;

const anchor2 = `                <div class="bg-surface-container-low rounded-xl flex flex-col gap-3 group p-3 shadow-none">
                    <div class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer" onclick="navigate('page_2')">
                        <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="كيك الشوكولاتة">`;

const missingHTML = `
            </section>
            
            <!-- Categories Section -->
            <section>
                <div class="flex justify-between items-end mb-6 px-2">
                    <h3 class="text-2xl font-bold text-on-surface">الأقسام</h3>
                    <button onclick="navigate('page_1')" class="text-tertiary font-bold text-sm border-0 bg-transparent cursor-pointer">عرض الكل</button>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <button onclick="navigate('page_1')" class="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors hover:bg-surface-container-highest cursor-pointer group border-0 w-full shadow-none">
                        <div class="w-16 h-16 rounded-full bg-surface flex items-center justify-center group-hover:scale-110 transition-transform shadow-ambient">
                            <span class="material-symbols-outlined text-primary text-3xl">view_day</span>
                        </div>
                        <span class="font-bold text-on-surface-variant">الألواح</span>
                    </button>
                    <button onclick="navigate('page_1')" class="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors hover:bg-surface-container-highest cursor-pointer group border-0 w-full shadow-none">
                        <div class="w-16 h-16 rounded-full bg-surface flex items-center justify-center group-hover:scale-110 transition-transform shadow-ambient">
                            <span class="material-symbols-outlined text-primary text-3xl">inventory_2</span>
                        </div>
                        <span class="font-bold text-on-surface-variant">بوكس</span>
                    </button>
                    <button onclick="navigate('page_1')" class="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors hover:bg-surface-container-highest cursor-pointer group border-0 w-full shadow-none">
                        <div class="w-16 h-16 rounded-full bg-surface flex items-center justify-center group-hover:scale-110 transition-transform shadow-ambient">
                            <span class="material-symbols-outlined text-primary text-3xl">category</span>
                        </div>
                        <span class="font-bold text-on-surface-variant">متفرقات</span>
                    </button>
                </div>
            </section>
            
            <!-- Best Sellers Section -->
            <section>
                <div class="flex justify-between items-end mb-6 px-2">
                    <h3 class="text-2xl font-bold text-on-surface">الأكثر مبيعاً</h3>
                </div>
                <div id="user-products-grid" class="flex gap-6 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 snap-x">
                    <!-- Item 1 -->
                    <div onclick="navigate('page_2')" class="snap-start min-w-[220px] bg-surface-container-low rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-colors relative shadow-none">
                        <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80" class="w-full h-40 object-cover rounded-xl mb-3 shadow-inner" alt="كيك الشوكولاتة">
                        <div><h4 class="font-bold text-on-surface truncate text-lg cursor-pointer">كيك الشوكولاتة الفاخرة</h4><span class="text-sm font-bold text-primary mb-2 block mt-1">١٨٥.٠٠ د.أ</span><div class="flex items-center justify-between gap-1 mt-2"><div class="flex items-center gap-1"><button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer shadow-sm" onclick="event.stopPropagation()">-</button><span class="w-6 h-7 rounded-full flex items-center justify-center bg-surface text-xs font-bold shadow-sm">1</span><button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer shadow-sm" onclick="event.stopPropagation()">+</button></div><div class="flex items-center gap-1"><button class="w-7 h-7 flex items-center justify-center rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 transition-colors border-0 cursor-pointer" onclick="event.stopPropagation()"><span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 0;">favorite</span></button><button onclick="event.stopPropagation(); addToCart({ id: 'detail-1', name: 'كيك الشوكولاتة الفاخرة', price: 185, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80' })" class="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity border-0 cursor-pointer"><span class="material-symbols-outlined text-[16px]">shopping_cart</span></button></div></div></div>
                    </div>
                    <!-- Item 2 -->
                    <div onclick="navigate('page_6')" class="snap-start min-w-[220px] bg-surface-container-low rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-colors relative shadow-none">
                        <img src="https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=400&q=80" class="w-full h-40 object-cover rounded-xl mb-3 shadow-inner" alt="ماكرون">
                        <div><h4 class="font-bold text-on-surface truncate text-lg cursor-pointer">تشكيلة ماكرون فرنسي</h4><span class="text-sm font-bold text-primary mb-2 block mt-1">٤٥.٠٠ د.أ</span><div class="flex items-center justify-between gap-1 mt-2"><div class="flex items-center gap-1"><button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer shadow-sm" onclick="event.stopPropagation()">-</button><span class="w-6 h-7 rounded-full flex items-center justify-center bg-surface text-xs font-bold shadow-sm">1</span><button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer shadow-sm" onclick="event.stopPropagation()">+</button></div><div class="flex items-center gap-1"><button class="w-7 h-7 flex items-center justify-center rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 transition-colors border-0 cursor-pointer" onclick="event.stopPropagation()"><span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 0;">favorite</span></button><button onclick="event.stopPropagation(); addToCart({ id: 'fav-1', name: 'تشكيلة ماكرون فرنسي', price: 45, image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=400&q=80' })" class="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity border-0 cursor-pointer"><span class="material-symbols-outlined text-[16px]">shopping_cart</span></button></div></div></div>
                    </div>
                </div>
            </section>
            
            <!-- Signature Texture Bento Section -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="md:col-span-2 bg-primary-fixed rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden cursor-pointer shadow-ambient" onclick="navigate('page_1')">
                    <div class="flex-1 z-10">
                        <h3 class="text-3xl font-black text-on-primary-fixed mb-4">عروض وخصومات</h3>
                        <p class="text-on-primary-fixed-variant mb-6 leading-relaxed font-bold text-lg">توصيل مجاني للطلبات فوق الـ 50 د.أ</p>
                        <button class="bg-primary text-on-primary px-6 py-3 rounded-md font-bold hover:shadow-ambient transition-all border-0 cursor-pointer">تسوق الآن</button>
                    </div>
                    <div class="w-48 h-48 rounded-full bg-primary-fixed-dim/30 absolute -left-12 -top-12"></div>
                    <div class="absolute -bottom-8 -right-4 opacity-30 transform -rotate-12">
                        <span class="material-symbols-outlined text-[160px] text-on-primary-fixed" style="font-variation-settings: 'FILL' 1;">redeem</span>
                    </div>
                </div>
                <div class="bg-tertiary-container rounded-xl p-8 flex flex-col justify-between text-on-tertiary-container overflow-hidden relative shadow-ambient">
                    <div class="z-10">
                        <h3 class="text-2xl font-black mb-2">توصيل سريع</h3>
                        <p class="font-medium opacity-80">نصل إليك في أقل من ٤٥ دقيقة لضمان وصول حلوياتك طازجة.</p>
                    </div>
                    <div class="absolute -bottom-8 -right-8 opacity-20 transform -rotate-12">
                        <span class="material-symbols-outlined text-[160px]">local_shipping</span>
                    </div>
                    <div class="z-10 mt-8">
                        <span class="text-3xl font-black">٤٥ دقيقة</span>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- ======================= PAGE 1: CATEGORY LISTING ======================= -->
    <div id="page_1" class="app-page" style="display:none; width: 100%; height: 100%;">
        <header class="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-ambient">
            <div class="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary">location_on</span>
                    <span class="text-on-surface-variant font-medium text-sm">الأردن الرمثا</span>
                </div>
                <h1 class="text-2xl font-black text-on-surface tracking-tighter cursor-pointer" onclick="navigate('page_0')">ChocoBox</h1>
                <button onclick="goBack()" class="relative cursor-pointer border-0 bg-transparent text-primary hover:bg-surface-container p-2 rounded-xl transition-colors">
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            </div>
        </header>
        <main class="pt-24 pb-32 px-6 max-w-7xl mx-auto">
            <section class="mb-8">
                <h2 class="text-4xl font-extrabold tracking-tight text-on-surface mb-2">منتجاتنا</h2>
                <p class="text-on-surface-variant text-lg leading-relaxed">اكتشف مجموعتنا المختارة من الحلوى الفاخرة.</p>
            </section>
            <div class="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6 snap-x">
                <button class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold shadow-none transition-transform active:scale-95 border-0">الكل</button>
                <button class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-semibold hover:bg-surface-container-highest transition-colors border-0">الألواح</button>
                <button class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-semibold hover:bg-surface-container-highest transition-colors border-0">بوكس</button>
                <button class="snap-start whitespace-nowrap px-6 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-semibold hover:bg-surface-container-highest transition-colors border-0">متفرقات</button>
            </div>
            <div id="listing-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
`;

// we will split by anchor1 and anchor2.
// Wait, multi_replace_file_content already deleted text between anchor1 and anchor2!
// so the html now has snippet1 ... snippet2, with NO content in between.
// Let's check exactly how it's formatted. It says:
// ```
//                     <button onclick="changeSlide(1)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
//                     <button onclick="changeSlide(2)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
//                 </div>
//                 <div class="bg-surface-container-low rounded-xl flex flex-col gap-3 group p-3 shadow-none">
// ```
// I can just replace this junction.

const badJunction = `                    <button onclick="changeSlide(2)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
                </div>
                <div class="bg-surface-container-low rounded-xl flex flex-col gap-3 group p-3 shadow-none">
                    <div class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer" onclick="navigate('page_2')">
                        <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="كيك الشوكولاتة">`;

const goodJunction = `                    <button onclick="changeSlide(2)" class="carousel-dot w-3 h-3 rounded-full bg-surface-variant transition-colors border-0 cursor-pointer"></button>
                </div>` + missingHTML + `                <div class="bg-surface-container-low rounded-xl flex flex-col gap-3 group p-3 shadow-none">
                    <div class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer" onclick="navigate('page_2')">
                        <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="كيك الشوكولاتة">`;

if (html.includes(badJunction)) {
    html = html.replace(badJunction, goodJunction);
    fs.writeFileSync('index.html', html);
    console.log("Fixed successfully.");
} else {
    console.log("Could not find bad junction.");
}
