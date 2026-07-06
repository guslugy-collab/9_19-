/* ================= 9.19 PERFUME — общая логика сайта ================= */

/* Единая конфигурация — правь здесь контакты и базовый URL */
const SITE = {
  name: '9.19 PERFUME',
  telegram: 'PERFUME_9_19',            // без @
  whatsapp: '',                        // напр. '79280000000' (пусто = кнопка скрыта)
  city: 'Махачкала',
  baseUrl: 'https://example.github.io/919-perfume', // для og-тегов и sitemap
};

const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const tgLink = text => `https://t.me/${SITE.telegram}?text=${encodeURIComponent(text)}`;
const waLink = text => SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : '';

/* ---------- Корзина (localStorage) ---------- */
const CART_KEY = 'perfume919_cart';
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = c => { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); };

function addToCart(item){
  const cart = getCart();
  const key = item.id + '|' + item.volume;
  const found = cart.find(i => i.id + '|' + i.volume === key);
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
  renderCart();
  openCart();
}
function removeFromCart(key){
  saveCart(getCart().filter(i => i.id + '|' + i.volume !== key));
  renderCart();
}
function changeQty(key, delta){
  const cart = getCart();
  const it = cart.find(i => i.id + '|' + i.volume === key);
  if (!it) return;
  it.qty = Math.max(1, it.qty + delta);
  saveCart(cart);
  renderCart();
}
const cartTotal = () => getCart().reduce((s,i) => s + i.price * i.qty, 0);
const cartCount = () => getCart().reduce((s,i) => s + i.qty, 0);

function updateCartCount(){
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    const n = cartCount();
    el.textContent = n;
    el.style.display = n ? 'flex' : 'none';
  });
}

/* ---------- Шапка и подвал (инъекция во все страницы) ---------- */
function renderHeader(active){
  const links = [
    { href: 'catalog.html?type=original', label: 'Оригиналы' },
    { href: 'catalog.html?type=oil',      label: 'Масляные'  },
    { href: 'catalog.html?whole=1',       label: 'Опт'       },
    { href: 'about.html',                 label: 'О нас'     },
  ];
  const nav = links.map(l =>
    `<a href="${l.href}" class="hover:text-gold transition-colors">${l.label}</a>`).join('');

  return `
  <div class="hairline-b sticky top-0 z-50" style="background:rgba(15,13,11,.86);backdrop-filter:blur(10px)">
    <div class="max-w-6xl mx-auto px-5 h-[68px] flex items-center justify-between">
      <a href="index.html" class="font-serif text-2xl tracking-wide">
        <span class="text-gold">9.19</span> PERFUME
      </a>
      <nav class="hidden md:flex items-center gap-8 text-sm tracking-wide text-[color:var(--muted)]">
        ${nav}
      </nav>
      <div class="flex items-center gap-3">
        <button onclick="openCart()" class="relative p-2 text-gold" aria-label="Корзина">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/>
          </svg>
          <span data-cart-count class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] items-center justify-center" style="background:var(--gold);color:var(--bg);display:none"></span>
        </button>
        <a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" class="btn btn-solid hidden sm:inline-flex">Telegram</a>
        <button onclick="toggleMobileNav()" class="md:hidden p-2 text-gold" aria-label="Меню">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>
    <div id="mobile-nav" class="md:hidden hidden hairline-t">
      <div class="max-w-6xl mx-auto px-5 py-4 flex flex-col gap-4 text-sm tracking-wide">
        ${links.map(l=>`<a href="${l.href}" class="hover:text-gold">${l.label}</a>`).join('')}
        <a href="contacts.html" class="hover:text-gold">Контакты</a>
      </div>
    </div>
  </div>`;
}

function renderFooter(){
  const wa = SITE.whatsapp ? `<a href="${waLink('Здравствуйте!')}" target="_blank" rel="noopener" class="hover:text-gold">WhatsApp</a>` : '';
  return `
  <footer class="hairline-t mt-24">
    <div class="max-w-6xl mx-auto px-5 py-14 grid gap-10 md:grid-cols-3">
      <div>
        <div class="font-serif text-2xl mb-3"><span class="text-gold">9.19</span> PERFUME</div>
        <p class="text-sm leading-relaxed" style="color:var(--muted)">Оригинальная и масляная парфюмерия. Прямые поставки из Турции и ОАЭ. ${SITE.city}.</p>
      </div>
      <div class="text-sm flex flex-col gap-2" style="color:var(--muted)">
        <span class="text-gold tracking-luxe text-xs mb-1">РАЗДЕЛЫ</span>
        <a href="catalog.html" class="hover:text-gold">Каталог</a>
        <a href="about.html" class="hover:text-gold">О нас</a>
        <a href="delivery.html" class="hover:text-gold">Доставка и оплата</a>
        <a href="contacts.html" class="hover:text-gold">Контакты</a>
      </div>
      <div class="text-sm flex flex-col gap-2" style="color:var(--muted)">
        <span class="text-gold tracking-luxe text-xs mb-1">СВЯЗЬ</span>
        <a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" class="hover:text-gold">Telegram @${SITE.telegram}</a>
        ${wa}
        <span>${SITE.city}</span>
        <a href="privacy.html" class="hover:text-gold mt-2 text-xs">Политика конфиденциальности</a>
      </div>
    </div>
    <div class="hairline-t">
      <div class="max-w-6xl mx-auto px-5 py-5 text-xs flex flex-col sm:flex-row gap-2 justify-between" style="color:var(--muted)">
        <span>© 2026 9.19 PERFUME. Реквизиты — заглушка.</span>
        <span>Сайт-каталог. Заказ — через Telegram.</span>
      </div>
    </div>
  </footer>`;
}

/* ---------- Корзина: выезжающая панель ---------- */
function renderCart(){
  const wrap = document.getElementById('cart-body');
  if (!wrap) return;
  const cart = getCart();
  if (!cart.length){
    wrap.innerHTML = `<p class="text-center py-16" style="color:var(--muted)">Корзина пуста</p>`;
    document.getElementById('cart-foot').style.display = 'none';
    return;
  }
  wrap.innerHTML = cart.map(i => {
    const key = i.id + '|' + i.volume;
    return `
    <div class="hairline-b py-4 flex gap-3">
      <div class="flex-1">
        <div class="font-serif text-lg leading-tight">${i.brand} <span style="color:var(--muted)">·</span> ${i.name}</div>
        <div class="text-xs mt-1" style="color:var(--muted)">${i.volume} · ${i.type==='oil'?'масло':'оригинал'}</div>
        <div class="flex items-center gap-3 mt-2">
          <button onclick="changeQty('${key}',-1)" class="w-7 h-7 hairline text-gold">−</button>
          <span class="text-sm w-6 text-center">${i.qty}</span>
          <button onclick="changeQty('${key}',1)" class="w-7 h-7 hairline text-gold">+</button>
        </div>
      </div>
      <div class="text-right">
        <div class="text-gold">${money(i.price * i.qty)}</div>
        <button onclick="removeFromCart('${key}')" class="text-xs mt-2 hover:text-gold" style="color:var(--muted)">удалить</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('cart-foot').style.display = 'block';
  document.getElementById('cart-total').textContent = money(cartTotal());
}

function checkoutTelegram(){
  const cart = getCart();
  if (!cart.length) return;
  if (!document.getElementById('cart-consent').checked){
    document.getElementById('consent-warn').style.display = 'block';
    return;
  }
  const lines = cart.map((i,idx) =>
    `${idx+1}. ${i.brand} ${i.name} — ${i.type==='oil'?'масло':'оригинал'}, ${i.volume} × ${i.qty} = ${money(i.price*i.qty)}`);
  const msg = `Здравствуйте! Хочу заказать в 9.19 PERFUME:\n\n${lines.join('\n')}\n\nИтого: ${money(cartTotal())}`;
  window.open(tgLink(msg), '_blank');
}

/* ---------- UI-хелперы ---------- */
function openCart(){ document.getElementById('cart-drawer')?.classList.add('open'); document.getElementById('overlay')?.classList.add('open'); }
function closeCart(){ document.getElementById('cart-drawer')?.classList.remove('open'); document.getElementById('overlay')?.classList.remove('open'); }
function toggleMobileNav(){ document.getElementById('mobile-nav')?.classList.toggle('hidden'); }

function mountChrome(active){
  const h = document.getElementById('site-header'); if (h) h.innerHTML = renderHeader(active);
  const f = document.getElementById('site-footer'); if (f) f.innerHTML = renderFooter();
  // Разметка корзины (общая)
  if (!document.getElementById('cart-drawer')){
    document.body.insertAdjacentHTML('beforeend', `
      <div id="overlay" class="overlay" onclick="closeCart()"></div>
      <aside id="cart-drawer" class="drawer">
        <div class="hairline-b px-5 h-[68px] flex items-center justify-between">
          <span class="font-serif text-xl">Корзина</span>
          <button onclick="closeCart()" class="text-gold text-2xl leading-none">×</button>
        </div>
        <div id="cart-body" class="flex-1 overflow-auto px-5"></div>
        <div id="cart-foot" class="hairline-t px-5 py-5" style="display:none">
          <div class="flex justify-between mb-4">
            <span style="color:var(--muted)">Итого</span>
            <span id="cart-total" class="text-gold text-lg"></span>
          </div>
          <label class="flex items-start gap-2 text-xs mb-1 cursor-pointer" style="color:var(--muted)">
            <input type="checkbox" id="cart-consent" class="mt-0.5 accent-[color:var(--gold)]">
            <span>Согласен на обработку персональных данных для оформления заказа</span>
          </label>
          <p id="consent-warn" class="text-xs mb-3" style="display:none;color:#c98">Отметьте согласие, чтобы продолжить</p>
          <button onclick="checkoutTelegram()" class="btn btn-solid w-full">Оформить в Telegram</button>
        </div>
      </aside>`);
  }
  updateCartCount();
  renderCart();
}

/* Появление секций при скролле */
function initReveal(){
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.12 });
  els.forEach(e=>io.observe(e));
}

document.addEventListener('DOMContentLoaded', ()=>{
  mountChrome(document.body.dataset.page || '');
  initReveal();
});
