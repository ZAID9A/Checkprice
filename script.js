/**
 * أسعار الخضروات والفواكه
 * يجلب البيانات من Google Sheets ويعرضها في بطاقات
 * بدون خادم - بدون قاعدة بيانات - مجاني
 */

// ========== الإعدادات ==========
// ضع معرف النشر من Google Sheet هنا (الرقم من رابط /pub/)
const SHEET_CONFIG = {
  id: '2PACX-1vQaQ7geiJtS5OX9vn_I2D49lBHN25NXxAi93trE26Mewrs2MZicj5hXotXqZzKm5xUL1MpaicS4gq2u'
};

// خريطة رموز تعبيرية للمنتجات (تُستخدم عند عدم وجود صورة)
const EMOJI_MAP = {
  طماطم: '🍅', خيار: '🥒', بصل: '🧅', بطاطس: '🥔',
  جزر: '🥕', كوسا: '🥬', باذنجان: '🍆', فلفل: '🌶️',
  تفاح: '🍎', موز: '🍌', برتقال: '🍊', عنب: '🍇',
  ليمون: '🍋', فراولة: '🍓', بطيخ: '🍉', شمام: '🍈',
  خوخ: '🍑', مشمش: '🍑', كرز: '🍒', رمان: '🔴',
  توت: '🫐', أناناس: '🍍', مانجو: '🥭', فجل: '🌶️',
  خس: '🥬', سبانخ: '🥬', ملفوف: '🥬', قرنبيط: '🥦',
  بروكلي: '🥦', ذرة: '🌽', فطر: '🍄', ثوم: '🧄',
  زنجبيل: '🫚', بطاطا: '🍠', جرجير: '🌿', نعناع: '🌿',
  بقدونس: '🌿', كزبرة: '🌿', شبت: '🌿',
  كيوي: '🥝', أفوكادو: '🥑', بامية: '🫘', فاصوليا: '🫘',
  بازلاء: '🫛', كراث: '🥬', كرفس: '🥬', جريب فروت: '🍊',
  تين: '🫐', جوافة: '🍈', كمثرى: '🍐', سفرجل: '🍐',
  بلح: '🌴', تمر: '🌴'
};

// بيانات تجريبية (تظهر تلقائياً إذا لم يتم تعيين Google Sheet)
const DEMO_DATA = {
  stores: ['المتجر الأول', 'المتجر الثاني', 'المتجر الثالث'],
  products: [
    { name: 'طماطم', image: '', prices: [5.00, 5.50, 4.75], date: '2026-05-19' },
    { name: 'خيار', image: '', prices: [3.00, 3.25, 2.80], date: '2026-05-19' },
    { name: 'بصل', image: '', prices: [2.50, 2.75, 2.30], date: '2026-05-19' },
    { name: 'بطاطس', image: '', prices: [3.50, 3.75, 3.25], date: '2026-05-19' },
    { name: 'جزر', image: '', prices: [4.00, 4.25, 3.75], date: '2026-05-19' },
    { name: 'كوسا', image: '', prices: [6.00, 6.50, 5.75], date: '2026-05-19' },
    { name: 'باذنجان', image: '', prices: [4.50, 4.75, 4.25], date: '2026-05-19' },
    { name: 'فلفل أخضر', image: '', prices: [8.00, 8.50, 7.50], date: '2026-05-19' },
    { name: 'تفاح', image: '', prices: [7.00, 7.50, 6.75], date: '2026-05-19' },
    { name: 'موز', image: '', prices: [5.50, 6.00, 5.25], date: '2026-05-19' },
    { name: 'برتقال', image: '', prices: [4.00, 4.50, 3.75], date: '2026-05-19' },
    { name: 'عنب', image: '', prices: [9.00, 9.50, 8.75], date: '2026-05-19' }
  ],
  lastUpdated: '2026-05-19'
};

// ========== جلب البيانات من Google Sheets (CSV) ==========
async function fetchFromSheet() {
  const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_CONFIG.id}/pub?output=csv`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) throw new Error('فشل الاتصال');

  const csv = await response.text();
  return parseCSV(csv);
}

// تحليل CSV إلى كائنات منتجات
function parseCSV(csv) {
  const lines = csv.trim().split('\n').map(l => l.replace(/\r$/, ''));
  if (lines.length < 2) throw new Error('لا توجد بيانات');

  const headers = lines[0].split(',');

  // البحث عن عمود التاريخ
  const dateKeywords = ['آخر', 'تاريخ', 'update', 'date'];
  let dateIdx = headers.length - 1;
  for (let i = 0; i < headers.length; i++) {
    if (dateKeywords.some(k => headers[i].includes(k))) { dateIdx = i; break; }
  }

  // أعمدة المتاجر: من C (2) إلى قبل عمود التاريخ
  const stores = [], storeIndices = [];
  for (let i = 2; i < dateIdx; i++) {
    const name = headers[i].trim();
    if (name) { stores.push(name); storeIndices.push(i); }
  }

  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const name = (cells[0] || '').trim();
    if (!name) continue;

    const image = (cells[1] || '').trim();
    const prices = storeIndices.map(idx => {
      const val = (cells[idx] || '').trim();
      return val ? parseFloat(val) : null;
    });
    const date = (cells[dateIdx] || '').trim().replace(/\r$/, '');

    products.push({ name, image, prices, date });
  }

  return { stores, products };
}

// ========== الحصول على الرمز التعبيري للمنتج ==========
function getEmoji(name) {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return '🥗';
}

// ========== عرض المنتجات ==========
function renderProducts(data) {
  const grid = document.getElementById('products-grid');
  const loading = document.getElementById('loading');
  const updateDate = document.getElementById('update-date');

  // إخفاء مؤشر التحميل
  loading.style.display = 'none';

  // عرض تاريخ آخر تحديث
  const dates = data.products.filter(p => p.date).map(p => p.date);
  const latestDate = dates.length > 0
    ? dates.sort((a, b) => b.localeCompare(a))[0]
    : data.lastUpdated || '--';
  updateDate.textContent = latestDate;

  // إنشاء بطاقات المنتجات
  grid.innerHTML = data.products.map(product => {
    const emoji = getEmoji(product.name);
    const dateDisplay = product.date || latestDate;

    // صورة أو رمز تعبيري
    let imageHtml;
    if (product.image) {
      imageHtml = `
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.remove();this.parentElement.querySelector('.emoji-placeholder').style.display='flex'">
        <div class="emoji-placeholder" style="display:none">${emoji}</div>
      `;
    } else {
      imageHtml = `<div class="emoji-placeholder">${emoji}</div>`;
    }

    // قائمة الأسعار
    const pricesHtml = product.prices.map((price, i) => {
      if (price == null) return '';
      const storeName = data.stores[i] || `متجر ${i + 1}`;
      return `
        <li class="price-item">
          <span class="store-name">${storeName}</span>
          <span class="price-value">${price.toFixed(2)} <img src="assets/omr.svg" alt="OMR" class="currency-icon"></span>
        </li>
      `;
    }).join('');

    return `
      <article class="product-card">
        <div class="product-image">${imageHtml}</div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <ul class="prices-list">${pricesHtml}</ul>
          <div class="product-date">🗓 ${dateDisplay}</div>
        </div>
      </article>
    `;
  }).join('');
}

// عرض رسالة خطأ
function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  const errorEl = document.getElementById('error');
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

// ========== التخزين المؤقت (localStorage) ==========
const CACHE_KEY = 'price_cache';

function saveCache(data) {
  try {
    const cache = { stores: data.stores, products: data.products, time: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* مساحة تخزين ممتلئة */ }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// ========== تهيئة الموقع وجلب البيانات ==========
async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const warningEl = document.getElementById('warning');
  errorEl.style.display = 'none';
  warningEl.style.display = 'none';

  // 1. عرض البيانات المخزنة فوراً (إن وجدت)
  const cached = loadCache();
  let hasShownData = false;
  if (cached && cached.products && cached.products.length > 0) {
    loading.style.display = 'none';
    renderProducts(cached);
    hasShownData = true;
  }

  // 2. جلب بيانات جديدة في الخلفية
  if (SHEET_CONFIG.id && SHEET_CONFIG.id.length > 5) {
    let fetchDone = false;

    // مؤشر 10 ثوانٍ: إذا لم يكتمل الجلب، أظهر تحذير
    const warnTimer = setTimeout(() => {
      if (!fetchDone) {
        warningEl.textContent = '⚠ لا يوجد اتصال بالإنترنت. يتم عرض البيانات المتوفرة.';
        warningEl.style.display = 'block';
        if (!hasShownData) {
          loading.textContent = 'يعمل بدون اتصال...';
          loading.style.display = 'none';
          renderProducts(DEMO_DATA);
          hasShownData = true;
          showError('⚠ لا يوجد اتصال بالإنترنت. يتم عرض بيانات تجريبية.');
        }
      }
    }, 10000);

    try {
      const data = await fetchFromSheet();
      fetchDone = true;
      clearTimeout(warnTimer);
      warningEl.style.display = 'none';

      saveCache(data);
      loading.style.display = 'none';
      renderProducts(data);
    } catch (e) {
      fetchDone = true;
      clearTimeout(warnTimer);
      warningEl.textContent = '⚠ تعذر الاتصال بالإنترنت.';
      warningEl.style.display = 'block';
      if (!hasShownData) {
        loading.style.display = 'none';
        renderProducts(DEMO_DATA);
        showError('⚠ يتم عرض بيانات تجريبية بدلاً من البيانات المباشرة.');
      }
    }
  } else if (!hasShownData) {
    // لا يوجد معرف Google Sheet → بيانات تجريبية
    loading.style.display = 'none';
    renderProducts(DEMO_DATA);
    showError('⚠ لم يتم تعيين Google Sheet. يتم عرض بيانات تجريبية.');
  }
}

// ========== التشغيل ==========
document.addEventListener('DOMContentLoaded', init);

// تحديث تلقائي كل 5 دقائق
setInterval(init, 300000);
