/* ================= 9.19 PERFUME — логика каталога ================= */

let ALL = [];
const state = { type:'all', gender:'all', brand:'all', whole:false, q:'', sort:'default' };

const priceFrom = p => Math.min(...p.variants.map(v => v.price));
const wholeFrom = p => Math.min(...p.variants.map(v => v.price_wholesale));

async function loadCatalog(){
  try{
    const res = await fetch('data/products.json', { cache:'no-store' });
    ALL = await res.json();
  }catch(e){
    document.getElementById('grid').innerHTML =
      `<p class="col-span-full text-center py-16" style="color:var(--muted)">Не удалось загрузить каталог.</p>`;
    return;
  }
  applyUrlParams();
  buildBrandFilter();
  bindControls();
  render();
}

function applyUrlParams(){
  const p = new URLSearchParams(location.search);
  if (p.get('type'))   state.type   = p.get('type');
  if (p.get('gender')) state.gender = p.get('gender');
  if (p.get('whole'))  state.whole  = p.get('whole') === '1';
  syncChips();
  if (state.whole) document.getElementById('whole-note')?.classList.remove('hidden');
}

function buildBrandFilter(){
  const brands = [...new Set(ALL.map(p=>p.brand))].sort();
  const sel = document.getElementById('brand-filter');
  if (!sel) return;
  sel.innerHTML = `<option value="all">Все бренды</option>` +
    brands.map(b=>`<option value="${b}">${b}</option>`).join('');
}

function bindControls(){
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const [group, val] = btn.dataset.filter.split(':');
      state[group] = val;
      syncChips();
      render();
    });
  });
  document.getElementById('search')?.addEventListener('input', e=>{ state.q = e.target.value.trim().toLowerCase(); render(); });
  document.getElementById('brand-filter')?.addEventListener('change', e=>{ state.brand = e.target.value; render(); });
  document.getElementById('sort')?.addEventListener('change', e=>{ state.sort = e.target.value; render(); });
}

function syncChips(){
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    const [group, val] = btn.dataset.filter.split(':');
    btn.classList.toggle('active', state[group] === val);
  });
}

function filtered(){
  let list = ALL.filter(p=>{
    if (state.type   !== 'all' && p.type   !== state.type)   return false;
    if (state.gender !== 'all' && p.gender !== state.gender) return false;
    if (state.brand  !== 'all' && p.brand  !== state.brand)  return false;
    if (state.whole  && !p.variants.some(v=>v.price_wholesale)) return false;
    if (state.q){
      const hay = (p.name + ' ' + p.brand).toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  });
  if (state.sort === 'price-asc')  list.sort((a,b)=>priceFrom(a)-priceFrom(b));
  if (state.sort === 'price-desc') list.sort((a,b)=>priceFrom(b)-priceFrom(a));
  if (state.sort === 'new')        list.sort((a,b)=> (b.badge==='new') - (a.badge==='new'));
  return list;
}

function cardHtml(p){
  const img = p.image_url || 'images/placeholder.svg';
  const badge = p.badge==='hit' ? `<span class="badge">Хит</span>`
              : p.badge==='new' ? `<span class="badge new">Новинка</span>` : '';
  const out = !p.in_stock ? `<span class="badge out" style="left:auto;right:.75rem">Нет в наличии</span>` : '';
  const multi = p.variants.length > 1;
  return `
  <article class="card reveal in" onclick='openProduct("${p.id}")' style="cursor:pointer">
    <div class="relative">
      ${badge}${out}
      <img src="${img}" alt="${p.brand} ${p.name}" class="card-img" loading="lazy">
    </div>
    <div class="p-4 flex flex-col flex-1">
      <div class="text-xs tracking-luxe mb-1" style="color:var(--muted)">${p.brand}</div>
      <h3 class="font-serif text-xl leading-tight">${p.name}</h3>
      <div class="text-xs mt-1" style="color:var(--muted)">${p.type==='oil'?'Масляная':'Оригинал'} · ${genderLabel(p.gender)}</div>
      <div class="mt-auto pt-4 flex items-end justify-between">
        <div>
          <div class="text-gold">${multi?'от ':''}${money(priceFrom(p))}</div>
          <div class="text-[11px]" style="color:var(--muted)">опт от ${money(wholeFrom(p))}</div>
        </div>
        <span class="text-xs text-gold">Подробнее →</span>
      </div>
    </div>
  </article>`;
}

const genderLabel = g => ({male:'Мужской',female:'Женский',unisex:'Унисекс'}[g] || '');

function render(){
  const list = filtered();
  document.getElementById('count').textContent = `${list.length} ${plural(list.length,'аромат','аромата','ароматов')}`;
  const grid = document.getElementById('grid');
  grid.innerHTML = list.length
    ? list.map(cardHtml).join('')
    : `<p class="col-span-full text-center py-16" style="color:var(--muted)">Ничего не найдено. Измените фильтры или запрос.</p>`;
}

function plural(n,one,few,many){
  const m10=n%10,m100=n%100;
  if (m10===1&&m100!==11) return one;
  if (m10>=2&&m10<=4&&(m100<10||m100>=20)) return few;
  return many;
}

/* ---------- Модалка товара ---------- */
let currentProduct = null, currentVariant = 0;

function openProduct(id){
  const p = ALL.find(x=>x.id===id); if(!p) return;
  currentProduct = p; currentVariant = 0;
  const img = p.image_url || 'images/placeholder.svg';
  const variants = p.variants.map((v,i)=>
    `<button data-var="${i}" onclick="selectVariant(${i})" class="chip ${i===0?'active':''}">${v.volume}</button>`).join('');

  document.getElementById('modal-box').innerHTML = `
    <div class="grid md:grid-cols-2">
      <img src="${img}" alt="${p.brand} ${p.name}" class="w-full aspect-square object-cover" style="background:var(--bg)">
      <div class="p-6 md:p-8 flex flex-col">
        <div class="flex items-start justify-between">
          <div class="text-xs tracking-luxe" style="color:var(--muted)">${p.brand}</div>
          <button onclick="closeProduct()" class="text-gold text-2xl leading-none">×</button>
        </div>
        <h2 class="font-serif text-3xl mt-1">${p.name}</h2>
        <div class="text-sm mt-2" style="color:var(--muted)">${p.type==='oil'?'Масляная парфюмерия':'Оригинал'} · ${genderLabel(p.gender)}${p.in_stock?'':' · <span style="color:#c98">нет в наличии</span>'}</div>
        <p class="text-sm mt-4 leading-relaxed">${p.description||''}</p>
        <div class="mt-4 text-sm leading-relaxed hairline-t pt-4" style="color:var(--muted)"><span class="text-gold">Ноты:</span> ${p.notes||'—'}</div>
        <div class="mt-5">
          <div class="text-xs tracking-luxe mb-2" style="color:var(--muted)">ОБЪЁМ</div>
          <div class="flex flex-wrap gap-2">${variants}</div>
        </div>
        <div class="mt-5 flex items-end justify-between">
          <div>
            <div id="pv-price" class="text-gold text-2xl font-serif">${money(p.variants[0].price)}</div>
            <div id="pv-whole" class="text-xs" style="color:var(--muted)">опт ${money(p.variants[0].price_wholesale)}</div>
          </div>
        </div>
        <button onclick="addCurrentToCart()" class="btn btn-solid w-full mt-6" ${p.in_stock?'':'disabled style=\"opacity:.4;cursor:not-allowed\"'}>${p.in_stock?'В корзину':'Нет в наличии'}</button>
      </div>
    </div>`;
  document.getElementById('product-modal').classList.add('open');
}

function selectVariant(i){
  currentVariant = i;
  const v = currentProduct.variants[i];
  document.getElementById('pv-price').textContent = money(v.price);
  document.getElementById('pv-whole').textContent = 'опт ' + money(v.price_wholesale);
  document.querySelectorAll('[data-var]').forEach(b=>b.classList.toggle('active', +b.dataset.var===i));
}
function addCurrentToCart(){
  if (!currentProduct || !currentProduct.in_stock) return;
  const v = currentProduct.variants[currentVariant];
  addToCart({ id:currentProduct.id, name:currentProduct.name, brand:currentProduct.brand,
              type:currentProduct.type, volume:v.volume, price:v.price });
  closeProduct();
}
function closeProduct(){ document.getElementById('product-modal').classList.remove('open'); }

document.addEventListener('DOMContentLoaded', loadCatalog);
