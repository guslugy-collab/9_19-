/* ================= 9.19 PERFUME — общая логика сайта ================= */

/* Единая конфигурация — правь здесь контакты и базовый URL */
const SITE = {
  name: '9.19 PERFUME',
  telegram: 'Pf_9_19',                 // без @
  whatsapp: '79216060303',             // напр. '79280000000' (пусто = кнопка скрыта)
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
  const next = it.qty + delta;
  if (next < 1){ removeFromCart(key); return; }
  it.qty = next;
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

/* ---------- Данные мега-меню ---------- */
const MEGA_CATS = [
  {
    id: 'all',
    icon: '🌐',
    title: 'Весь каталог',
    sub: 'Все ароматы',
    href: 'catalog.html',
    brands: []
  },
  {
    id: 'original',
    icon: '💎',
    title: 'Оригинальная',
    sub: 'Селективная и нишевая',
    href: 'catalog.html?type=original',
    brands: [
      'Amouage','Bvlgari','Byredo','Chanel','Clive Christian',
      'Creed','De Marly','Dior','Dolce&Gabbana','Escentric Molecules',
      'Frederic Malle','Giorgio Armani','Guerlain','Initio','Kilian',
      'Maison Francis Kurkdjian','Montale','Parfums de Marly','Tom Ford','Versace',
      'Xerjoff','Yves Saint Laurent','Lattafa','Rasasi',
    ]
  },
  {
    id: 'oil',
    icon: '🧴',
    title: 'Масляная',
    sub: 'Концентраты, стойкость до 12ч',
    href: 'catalog.html?type=oil',
    brands: [
      'Al Haramain','Arabian Oud','Attar Collection','Ajmal',
      'Baccarat Rouge 540 (масло)','Black Orchid (масло)','BR540',
      'Creed Aventus (масло)','Oud Wood (масло)','Tobacco Oud (масло)',
    ]
  },
  {
    id: 'men',
    icon: '👔',
    title: 'Мужские',
    sub: 'Для него',
    href: 'catalog.html?gender=men',
    brands: [
      'Bleu de Chanel','Creed Aventus','Dior Sauvage','Dior Homme',
      'Giorgio Armani Acqua','Hugo Boss','Issey Miyake','JPG Le Male',
      'Paco Rabanne 1 Million','Tom Ford Tobacco Oud','Versace Eros','Xerjoff Naxos',
    ]
  },
  {
    id: 'women',
    icon: '🌸',
    title: 'Женские',
    sub: 'Для неё',
    href: 'catalog.html?gender=women',
    brands: [
      'Burberry Her','Byredo Bal d\'Afrique','Chanel No.5','Chanel Coco Mademoiselle',
      'Dior Miss Dior','Dior J\'adore','Guerlain Mon Guerlain','Kilian Good Girl Gone Bad',
      'MFK Baccarat Rouge 540','Paco Rabanne Olympéa','Tom Ford Rose Prick','YSL Black Opium',
    ]
  },
  {
    id: 'unisex',
    icon: '✨',
    title: 'Унисекс',
    sub: 'Для него и для неё',
    href: 'catalog.html?gender=unisex',
    brands: [
      'Byredo Gypsy Water','Clive Christian X','De Marly Layton','Escentric Molecules 01',
      'Frederic Malle Portrait of a Lady','Initio Oud for Greatness','Maison Margiela Replica',
      'Montale Black Aoud','Parfums de Marly Layton','Tom Ford Oud Wood',
      'Xerjoff Alexandria II','Amouage Reflection',
    ]
  },
  {
    id: 'wholesale',
    icon: '📦',
    title: 'Опт',
    sub: 'От 5000₽, прямые поставки',
    href: 'opt.html',
    brands: []
  },
];

/* ---------- Шапка и подвал (инъекция во все страницы) ---------- */
function renderHeader(active){
  const links = [
    { href: 'about.html',    label: 'О нас'    },
    { href: 'delivery.html', label: 'Доставка' },
    { href: 'contacts.html', label: 'Контакты' },
  ];

  const megaLeftItems = MEGA_CATS.map((c,i) => `
    <div class="mega-left-item${i===0?' active':''}" data-cat="${c.id}"
         onmouseenter="megaHover('${c.id}')" onclick="megaHover('${c.id}')">
      <div class="cat-icon"></div>
      <div class="cat-label">
        <div class="cat-title">${c.title}</div>
        ${c.sub ? `<div class="cat-sub">${c.sub}</div>` : ''}
      </div>
      ${c.brands.length || c.id==='all' || c.id==='wholesale' ? `
      <svg class="cat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg>` : ''}
    </div>`).join('');

  const megaRightPanels = MEGA_CATS.map((c,i) => {
    if (c.id === 'all') {
      return `<div class="mega-right-panel${i===0?' active':''}" data-panel="${c.id}">
        <span class="mega-section-title">Все категории</span>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem 1rem">
          ${MEGA_CATS.filter(x=>x.id!=='all').map(x=>`
            <a href="${x.href}" style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;text-decoration:none;color:var(--muted);font-size:.82rem;transition:color .2s" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--muted)'">
              <span>${x.title}</span>
            </a>`).join('')}
        </div>
      </div>`;
    }
    if (c.id === 'wholesale') {
      return `<div class="mega-right-panel" data-panel="${c.id}">
        <span class="mega-section-title">Оптовые закупки</span>
        <p style="font-size:.84rem;color:var(--muted);line-height:1.7;max-width:400px">
          Минимальный заказ — от 5000₽.<br>
          Прямые поставки из Турции и ОАЭ.<br>
          Индивидуальные условия для постоянных партнёров.
        </p>
        <a href="opt.html" class="mega-more">Подробнее об опте →</a>
      </div>`;
    }
    return `<div class="mega-right-panel" data-panel="${c.id}">
      <span class="mega-section-title">Популярные бренды</span>
      <ul class="mega-brands">
        ${c.brands.map(b=>`<li><a href="catalog.html?type=${c.id}&brand=${encodeURIComponent(b)}">${b}</a></li>`).join('')}
      </ul>
      <a href="${c.href}" class="mega-more">Смотреть всё →</a>
    </div>`;
  }).join('');

  return `
  <div class="hairline-b sticky top-0 z-50" style="background:rgba(15,13,11,.92);backdrop-filter:blur(12px);position:relative">

    <!-- Основная строка шапки -->
    <div class="max-w-7xl mx-auto px-5 h-[64px] flex items-center gap-4">

      <!-- Логотип -->
      <a href="index.html" class="flex items-center gap-2 flex-shrink-0">
        <img src="images/logo.png" alt="9.19 PERFUME" class="h-9 w-auto" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
        <span class="font-serif text-xl tracking-wide" style="display:none"><span class="text-gold">9.19</span> PERFUME</span>
      </a>

      <!-- Кнопка каталога -->
      <button id="catalog-toggle" class="catalog-btn" onclick="toggleMega()" aria-expanded="false">
        <svg id="catalog-x" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M18 6 6 18M6 6l12 12"/></svg>
        <svg id="catalog-bars" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
        Каталог
        <svg class="arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      <!-- Поиск -->
      <div class="header-search" style="flex:1;max-width:520px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="search" placeholder="Поиск аромата или бренда…" autocomplete="off"
          oninput="headerSearch(this.value)" onkeydown="if(event.key==='Enter')headerSearchGo(this.value)">
      </div>

      <!-- Правая часть -->
      <nav class="hidden md:flex items-center gap-6 text-sm ml-2" style="color:var(--muted)">
        ${links.map(l=>`<a href="${l.href}" class="hover:text-gold transition-colors whitespace-nowrap">${l.label}</a>`).join('')}
      </nav>

      <div class="flex items-center gap-2 ml-auto md:ml-0">
        <a href="https://t.me/${SITE.telegram}" target="_blank" rel="noopener" title="Telegram"
           class="p-2 hover:text-gold transition-colors" style="color:var(--muted)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </a>
        ${SITE.whatsapp ? `<a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener" title="WhatsApp"
           class="p-2 hover:text-gold transition-colors" style="color:var(--muted)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/></svg>
        </a>` : ''}
        <button onclick="openCart()" class="relative p-2 text-gold" aria-label="Корзина">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6 5 3H2"/>
          </svg>
          <span data-cart-count class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] items-center justify-center" style="background:var(--gold);color:var(--bg);display:none"></span>
        </button>
        <button onclick="toggleMobileNav()" class="md:hidden p-2 text-gold" aria-label="Меню">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>

    <!-- Мега-меню -->
    <div id="mega-menu" class="mega-menu" style="left:0;right:0">
      <div class="mega-left">${megaLeftItems}</div>
      <div class="mega-right">${megaRightPanels}</div>
    </div>

    <!-- Мобильная навигация -->
    <div id="mobile-nav" class="md:hidden hidden hairline-t">
      <div class="max-w-6xl mx-auto px-5 py-4 flex flex-col gap-3 text-sm">
        <a href="catalog.html" class="hover:text-gold flex items-center gap-2">Весь каталог</a>
        <a href="catalog.html?type=original" class="hover:text-gold flex items-center gap-2">Оригинальная</a>
        <a href="catalog.html?type=oil" class="hover:text-gold flex items-center gap-2">Масляная</a>
        <a href="catalog.html?gender=men" class="hover:text-gold flex items-center gap-2">Мужские</a>
        <a href="catalog.html?gender=women" class="hover:text-gold flex items-center gap-2">Женские</a>
        <a href="opt.html" class="hover:text-gold flex items-center gap-2">Опт</a>
        <hr style="border-color:var(--border)">
        <a href="about.html" class="hover:text-gold" style="color:var(--muted)">О нас</a>
        <a href="delivery.html" class="hover:text-gold" style="color:var(--muted)">Доставка</a>
        <a href="contacts.html" class="hover:text-gold" style="color:var(--muted)">Контакты</a>
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
        <div class="text-xs mt-1" style="color:var(--muted)">${i.volume}${i.type==='oil'?' · масло':''}</div>
        <div class="flex items-center gap-3 mt-2">
          <button type="button" data-cart-act="dec" data-cart-key="${key}" class="w-7 h-7 hairline text-gold" style="cursor:pointer">−</button>
          <span class="text-sm w-6 text-center">${i.qty}</span>
          <button type="button" data-cart-act="inc" data-cart-key="${key}" class="w-7 h-7 hairline text-gold" style="cursor:pointer">+</button>
        </div>
      </div>
      <div class="text-right">
        <div class="text-gold">${money(i.price * i.qty)}</div>
        <button type="button" data-cart-act="del" data-cart-key="${key}" class="text-xs mt-2 hover:text-gold" style="color:var(--muted);cursor:pointer">удалить</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('cart-foot').style.display = 'block';
  document.getElementById('cart-total').textContent = money(cartTotal());
}

function buildOrderMsg(){
  const cart = getCart();
  if (!cart.length) return null;
  if (!document.getElementById('cart-consent').checked){
    const w = document.getElementById('consent-warn'); if (w) w.style.display = 'block';
    return null;
  }
  const val = id => (document.getElementById(id)?.value || '').trim();
  const name = val('ord-name'), phone = val('ord-phone'), city = val('ord-city');
  const method = document.querySelector('input[name="ord-method"]:checked')?.value || 'Доставка';
  const lines = cart.map((i,idx) =>
    `${idx+1}. ${i.brand} ${i.name} — ${i.type==='oil'?'масло ':''}${i.volume} × ${i.qty} = ${money(i.price*i.qty)}`);
  let msg = `Здравствуйте! Хочу заказать в 9.19 PERFUME:\n\n${lines.join('\n')}\n\nИтого: ${money(cartTotal())}`;
  const info = [];
  if (name)  info.push(`Имя: ${name}`);
  if (phone) info.push(`Телефон: ${phone}`);
  info.push(`Способ: ${method}`);
  if (method !== 'Самовывоз' && city) info.push(`Город: ${city}`);
  msg += `\n\n${info.join('\n')}`;
  return msg;
}
function checkoutTelegram(){
  const msg = buildOrderMsg(); if (!msg) return;
  window.open(tgLink(msg), '_blank');
}
function checkoutWhatsApp(){
  const msg = buildOrderMsg(); if (!msg) return;
  if (!SITE.whatsapp) return;
  window.open(`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ---------- UI-хелперы ---------- */
function openCart(){ document.getElementById('cart-drawer')?.classList.add('open'); document.getElementById('overlay')?.classList.add('open'); }
function closeCart(){ document.getElementById('cart-drawer')?.classList.remove('open'); document.getElementById('overlay')?.classList.remove('open'); }
function toggleMobileNav(){ document.getElementById('mobile-nav')?.classList.toggle('hidden'); }

/* ---------- Мега-меню ---------- */
function toggleMega(){
  const menu = document.getElementById('mega-menu');
  const btn  = document.getElementById('catalog-toggle');
  const barsIcon = document.getElementById('catalog-bars');
  const xIcon    = document.getElementById('catalog-x');
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    btn.classList.remove('open');
    barsIcon.style.display = '';
    xIcon.style.display = 'none';
  } else {
    menu.classList.add('open');
    btn.classList.add('open');
    barsIcon.style.display = 'none';
    xIcon.style.display = '';
  }
}

function closeMega(){
  const menu = document.getElementById('mega-menu');
  const btn  = document.getElementById('catalog-toggle');
  const barsIcon = document.getElementById('catalog-bars');
  const xIcon    = document.getElementById('catalog-x');
  if (!menu) return;
  menu.classList.remove('open');
  btn && btn.classList.remove('open');
  if (barsIcon) barsIcon.style.display = '';
  if (xIcon) xIcon.style.display = 'none';
}

function megaHover(catId){
  document.querySelectorAll('.mega-left-item').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === catId);
  });
  document.querySelectorAll('.mega-right-panel').forEach(el => {
    el.classList.toggle('active', el.dataset.panel === catId);
  });
}

function headerSearch(q){
  if (!q.trim()) return;
}
function headerSearchGo(q){
  if (!q.trim()) return;
  window.location.href = 'catalog.html?q=' + encodeURIComponent(q.trim());
}

/* Закрытие мега-меню по клику вне */
document.addEventListener('click', e => {
  const menu   = document.getElementById('mega-menu');
  const toggle = document.getElementById('catalog-toggle');
  if (!menu || !menu.classList.contains('open')) return;
  if (!menu.contains(e.target) && !toggle.contains(e.target)) closeMega();
});

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
          <div class="flex flex-col gap-2 mb-3">
            <input id="ord-name" type="text" placeholder="Имя" class="cart-field">
            <input id="ord-phone" type="tel" placeholder="Телефон" class="cart-field">
            <div class="flex gap-3 text-xs py-1" style="color:var(--muted)">
              <label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="ord-method" value="Доставка" checked class="accent-[color:var(--gold)]">Доставка</label>
              <label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="ord-method" value="Самовывоз" class="accent-[color:var(--gold)]">Самовывоз</label>
            </div>
            <input id="ord-city" type="text" placeholder="Город (для доставки)" class="cart-field">
          </div>
          <label class="flex items-start gap-2 text-xs mb-1 cursor-pointer" style="color:var(--muted)">
            <input type="checkbox" id="cart-consent" class="mt-0.5 accent-[color:var(--gold)]">
            <span>Согласен на обработку персональных данных для оформления заказа</span>
          </label>
          <p id="consent-warn" class="text-xs mb-3" style="display:none;color:#c98">Отметьте согласие, чтобы продолжить</p>
          <button onclick="checkoutTelegram()" class="btn btn-solid w-full">Оформить в Telegram</button>
          ${SITE.whatsapp ? `<button onclick="checkoutWhatsApp()" class="btn w-full mt-2" style="border-color:#25D366;color:#25D366">Оформить в WhatsApp</button>` : ''}
        </div>
      </aside>`);
    // Делегированный обработчик кнопок корзины (+ / − / удалить)
    document.getElementById('cart-body').addEventListener('click', e => {
      const b = e.target.closest('[data-cart-act]');
      if (!b) return;
      const key = b.getAttribute('data-cart-key');
      const act = b.getAttribute('data-cart-act');
      if (act === 'inc') changeQty(key, 1);
      else if (act === 'dec') changeQty(key, -1);
      else if (act === 'del') removeFromCart(key);
    });
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
