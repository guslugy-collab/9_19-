/*
  Синхронизация каталога сайта из Google-таблицы (оптового прайса).

  - Читает CSV вкладки прайса. Таблица: после строки-шапки «НАЗВАНИЯ БРЕНДОВ»
    идут секции: строка бренда (бренд в 1-й колонке, остальное пусто),
    затем строки ароматов: №, название, вид, производитель, цена за 1 гр, качество.
  - Сопоставляет позиции прайса с data/products.json (бренд + название,
    с учётом годов, «(акция)», опечаток и дублей от разных заводов).
  - У найденных обновляет: цену, производителя, качество, наличие, пол.
    Ноты, описания, фото, id и название на сайте не трогает.
  - Новые позиции добавляет (без нот и фото).
  - Позиции, которых больше нет в прайсе, НЕ удаляет — ставит «нет в наличии».

  Режимы:
    PREVIEW (по умолчанию) — пишет только data/_sync_summary.txt и data/_sync_preview.json.
    WRITE=1               — обновляет data/products.json и встроенные копии
                            каталога (PRODUCTS_INLINE) в js/catalog.js и product.html.
    CSV_FILE=путь         — взять прайс из локального CSV вместо скачивания.
*/

import fs from 'node:fs/promises';

const SHEET_ID = '1niSpFZM3N_-jh4rlo79fgrCUeRqFP9x9Qux8CPPG5mk';
const GID = '632257939';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const WRITE = process.env.WRITE === '1';
const FUZZY_MIN = 0.85;

const GENDER = { 'УНИ': 'unisex', 'УНИСЕКС': 'unisex', 'МУЖ': 'male', 'ЖЕН': 'female' };

const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
};

function slug(s){
  return s.toLowerCase().split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// Кириллица, похожая на латиницу (ТОР, ОАЭ набранные вперемешку)
const LOOKALIKE = { 'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X' };
const latinize = s => s.replace(/[АВЕКМНОРСТХ]/g, ch => LOOKALIKE[ch]);

// Ключ сравнения: регистр, ё, &/and, пунктуация, пробелы
function key(s){
  return (s || '').toString().toLowerCase().replace(/ё/g, 'е')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
    .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
// Мягкий ключ: дополнительно без годов, «акция», «усил версия», «нет в наличии»
function softKey(s){
  return key((s || '').replace(/•[^•]*•/g, ' ').replace(/\(([^)]*)\)/g, (m, inner) =>
      /акци|усил|наличи/i.test(inner) ? ' ' : m))
    .replace(/\b20\d\d\b/g, ' ').replace(/\bакция\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function bigrams(s){
  const t = s.replace(/\s+/g, '');
  const out = new Map();
  for (let i = 0; i < t.length - 1; i++){
    const b = t.slice(i, i + 2);
    out.set(b, (out.get(b) || 0) + 1);
  }
  return out;
}
function similarity(a, b){
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A){ inter += Math.min(n, B.get(g) || 0); total += n; }
  for (const n of B.values()) total += n;
  return total ? 2 * inter / total : 0;
}

function normQuality(q){
  const t = latinize((q || '').trim().toUpperCase()).replace(/\s+/g, '');
  if (!t || /^[.\-‐]+$/.test(t)) return '';
  if (t === 'DELUX' || t === 'DELUXE') return 'DE LUX';
  if (t === 'SUPERLUX') return 'SUPER LUX';
  if (['TOP', 'LUX', 'PREMIUM', 'ST', 'ECO'].includes(t)) return t;
  return (q || '').trim();
}

function normProducer(p){
  const t = (p || '').trim();
  if (!t || /^[.\-‐–—]+$/.test(t) || /гр/i.test(t)) return '';
  const u = latinize(t.toUpperCase());
  if (u === 'OAЭ' || u === 'OAE' || u === 'UAE' || t === 'ОАЭ') return 'ОАЭ';
  if (u === 'EPS') return 'EPS';
  if (u === 'SPAIN') return 'Spain';
  if (u === 'ESMEGA') return 'Esmega';
  return t;
}

// --- разбор CSV (кавычки, запятые и переводы строк внутри ячеек) ---
function parseCSV(text){
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (inQ){
      if (c === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n'){ row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r'){ /* пропускаем */ }
      else cell += c;
    }
  }
  if (cell.length || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

function parsePrice(rows){
  let started = false, brand = null;
  const items = [];
  for (const r of rows){
    const c0 = (r[0] || '').trim();
    const name = (r[1] || '').replace(/\s+/g, ' ').trim();
    if (/названия\s*брендов/i.test(name)){ started = true; continue; }
    if (!started) continue;
    if (c0 && !name && !/^\d+$/.test(c0)){
      brand = c0.replace(/\((скидка[^)]*)\)/i, '').replace(/\s+/g, ' ').trim();
      continue;
    }
    if (!brand || !name) continue;

    const inStock = !/нет\s*в\s*наличии/i.test(name);
    const clean = name.replace(/\(?\s*нет\s*в\s*наличии\s*\)?/i, '').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    const m = (r[4] || '').match(/\d+/);
    items.push({
      brand, name: clean,
      gender: GENDER[(r[2] || '').trim().toUpperCase()] || null,
      producer: normProducer(r[3]),
      price: m ? Number(m[0]) : null,
      quality: normQuality(r[5]),
      in_stock: inStock,
    });
  }
  return items;
}

// Бренд прайса → бренд сайта (на сайте названия брендов уже «чистые»)
function makeBrandResolver(siteBrands){
  const byKey = new Map(siteBrands.map(b => [key(b), b]));
  return function resolve(priceBrand){
    const k = key(priceBrand);
    if (byKey.has(k)) return byKey.get(k);
    // «& GABBANA» → «DOLCE & GABBANA» (часть названия потерялась в таблице)
    const tail = siteBrands.filter(b => key(b).endsWith(' ' + k) || key(b).startsWith(k + ' '));
    if (tail.length === 1) return tail[0];
    let best = null, bestS = 0;
    for (const b of siteBrands){
      const s = similarity(k, key(b));
      if (s > bestS){ best = b; bestS = s; }
    }
    return bestS >= 0.75 ? best : priceBrand;
  };
}

// Внутри бренда: пары (позиция прайса, товар сайта)
function matchBrand(priceItems, siteItems){
  const pairs = [];
  const freeP = new Set(priceItems.map((_, i) => i));
  const freeS = new Set(siteItems.map((_, i) => i));
  const siteName = s => s.name;
  const v0 = s => (s.variants && s.variants[0]) || {};

  // Совпадение по ключу; среди дублей сначала пары с тем же заводом и ценой,
  // потом только с заводом, только с ценой, потом по порядку
  const sameProducer = (p, s) => (s.producer || '') === p.producer;
  const samePrice = (p, s) => v0(s).price === p.price;
  const TIERS = [
    (p, s) => sameProducer(p, s) && samePrice(p, s),
    sameProducer,
    samePrice,
    () => true,
  ];
  function passByKey(kf, how){
    for (const ok of TIERS){
      for (const pi of [...freeP]){
        const p = priceItems[pi];
        const pick = [...freeS].find(si =>
          kf(siteName(siteItems[si])) === kf(p.name) && ok(p, siteItems[si]));
        if (pick === undefined) continue;
        pairs.push({ p, s: siteItems[pick], how });
        freeP.delete(pi); freeS.delete(pick);
      }
    }
  }
  passByKey(key, 'exact');
  passByKey(softKey, 'soft');

  // Обрезанное название: «TOBACCO, VETIVER» ↔ «TOBACCO, VETIVER & AMBER»
  for (const pi of [...freeP]){
    const pk = softKey(priceItems[pi].name);
    const cands = [...freeS].filter(si => {
      const sk = softKey(siteName(siteItems[si]));
      return pk.length >= 6 && sk.length >= 6 && (sk.startsWith(pk + ' ') || pk.startsWith(sk + ' '));
    });
    if (cands.length !== 1) continue;
    pairs.push({ p: priceItems[pi], s: siteItems[cands[0]], how: 'prefix' });
    freeP.delete(pi); freeS.delete(cands[0]);
  }

  // Нечёткое: жадно лучшие пары
  const cand = [];
  for (const pi of freeP) for (const si of freeS){
    const sc = similarity(softKey(priceItems[pi].name), softKey(siteName(siteItems[si])));
    if (sc >= FUZZY_MIN) cand.push({ pi, si, sc });
  }
  cand.sort((a, b) => b.sc - a.sc);
  for (const c of cand){
    if (!freeP.has(c.pi) || !freeS.has(c.si)) continue;
    pairs.push({ p: priceItems[c.pi], s: siteItems[c.si], how: 'fuzzy ' + c.sc.toFixed(2) });
    freeP.delete(c.pi); freeS.delete(c.si);
  }
  return {
    pairs,
    newItems: [...freeP].map(i => priceItems[i]),
    gone: [...freeS].map(i => siteItems[i]),
  };
}

// products.json исторически в формате PowerShell ConvertTo-Json
// (два пробела после двоеточия, вложенность от скобки, ' и & как \u0027 / \u0026) —
// сохраняем его, чтобы в истории git были видны только реальные правки.
function psJson(v, col = 0){
  const pad = n => ' '.repeat(n);
  if (Array.isArray(v)){
    if (!v.length) return '[\n\n' + pad(col) + ']';
    return '[\n' + v.map(x => pad(col + 4) + psJson(x, col + 4)).join(',\n') + '\n' + pad(col) + ']';
  }
  if (v && typeof v === 'object'){
    const lines = Object.entries(v).map(([k, x]) => {
      const head = pad(col + 4) + JSON.stringify(k) + ':  ';
      return head + psJson(x, head.length);
    });
    return '{\n' + lines.join(',\n') + '\n' + pad(col) + '}';
  }
  return JSON.stringify(v).replace(/'/g, '\\u0027').replace(/&/g, '\\u0026');
}

function inlineBlock(products){
  return products.map(p => '  ' + JSON.stringify(p)).join(',\n');
}

async function replaceInline(file, products){
  const src = await fs.readFile(file, 'utf8');
  const re = /(const PRODUCTS_INLINE = \[\r?\n)[\s\S]*?(\r?\n\];)/;
  if (!re.test(src)) throw new Error('PRODUCTS_INLINE не найден в ' + file);
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const out = src.replace(re, (_, a, b) => a + inlineBlock(products).replace(/\n/g, nl) + b);
  await fs.writeFile(file, out);
}

async function main(){
  const csv = process.env.CSV_FILE
    ? await fs.readFile(process.env.CSV_FILE, 'utf8')
    : await (async () => {
        const res = await fetch(CSV_URL, { redirect: 'follow' });
        if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
        return res.text();
      })();
  const priceItems = parsePrice(parseCSV(csv));
  if (priceItems.length < 100) throw new Error(`В прайсе найдено всего ${priceItems.length} позиций — формат таблицы изменился?`);

  const existing = JSON.parse((await fs.readFile('data/products.json', 'utf8')).replace(/^﻿/, ''));
  const siteBrands = [...new Set(existing.map(p => p.brand))];
  const resolve = makeBrandResolver(siteBrands);

  const priceByBrand = new Map();
  for (const it of priceItems){
    it.siteBrand = resolve(it.brand);
    if (!priceByBrand.has(it.siteBrand)) priceByBrand.set(it.siteBrand, []);
    priceByBrand.get(it.siteBrand).push(it);
  }
  const siteByBrand = new Map();
  for (const p of existing){
    if (!siteByBrand.has(p.brand)) siteByBrand.set(p.brand, []);
    siteByBrand.get(p.brand).push(p);
  }

  const changes = [], fuzzy = [], added = [], removed = [];
  const ids = new Set(existing.map(p => p.id));

  for (const brand of new Set([...priceByBrand.keys(), ...siteByBrand.keys()])){
    const { pairs, newItems, gone } = matchBrand(priceByBrand.get(brand) || [], siteByBrand.get(brand) || []);

    for (const { p, s, how } of pairs){
      if (how !== 'exact' && key(p.name) !== key(s.name)){
        fuzzy.push(`  [${brand}] «${p.name}» → «${s.name}» (${how})`);
      }
      const diff = [];
      const show = v => v === true ? 'есть' : v === false ? 'нет' : (v || '—');
      const set = (field, val, cur) => { if (cur !== val){ diff.push(`${field}: ${show(cur)} → ${show(val)}`); return true; } return false; };

      if (p.price != null){
        if (!s.variants || !s.variants.length) s.variants = [{ price: null, volume: '1 гр', price_wholesale: null }];
        const v = s.variants[0];
        if (set('цена', p.price, v.price)){ v.price = p.price; }
        v.price_wholesale = p.price;
      }
      if (set('завод', p.producer, s.producer || '')){
        if (p.producer) s.producer = p.producer; else delete s.producer;
      }
      if (set('качество', p.quality, s.quality || '')){
        if (p.quality) s.quality = p.quality; else delete s.quality;
      }
      if (set('наличие', p.in_stock, s.in_stock)) s.in_stock = p.in_stock;
      if (p.gender && set('пол', p.gender, s.gender)) s.gender = p.gender;
      if (diff.length) changes.push(`  [${brand}] ${s.name}: ${diff.join('; ')}`);
    }

    for (const p of newItems){
      let id = slug(brand + ' ' + p.name) || 'item', n = 2;
      while (ids.has(id)) id = slug(brand + ' ' + p.name) + '-' + n++;
      ids.add(id);
      const item = {
        id, name: p.name, brand,
        ...(p.producer ? { producer: p.producer } : {}),
        ...(p.quality ? { quality: p.quality } : {}),
        type: 'oil',
        gender: p.gender || 'unisex',
        notes_top: '', notes_heart: '', notes_base: '', notes: '',
        description: '',
        badge: null,
        in_stock: p.in_stock,
        image_url: null,
        variants: p.price != null ? [{ price: p.price, volume: '1 гр', price_wholesale: p.price }] : [],
      };
      existing.push(item);
      added.push(item);
    }

    for (const s of gone){
      if (s.in_stock){
        s.in_stock = false;
        removed.push(`  [${brand}] ${s.name}`);
      }
    }
  }

  const summary =
    `Позиций в прайсе: ${priceItems.length}\n` +
    `Товаров на сайте после синхронизации: ${existing.length}\n` +
    `Изменено: ${changes.length}\n` +
    `Новых: ${added.length}\n` +
    `Нет в прайсе (сняты с наличия): ${removed.length}\n` +
    `Сопоставлено по похожему названию: ${fuzzy.length}\n\n` +
    `== Изменения ==\n${changes.join('\n')}\n\n` +
    `== Новые ==\n${added.map(p => `  + [${p.brand}] ${p.name} — ${p.producer || '—'}, ${p.variants[0]?.price ?? '—'}р`).join('\n')}\n\n` +
    `== Нет в прайсе ==\n${removed.join('\n')}\n\n` +
    `== Похожие названия (проверить) ==\n${fuzzy.join('\n')}\n`;

  await fs.writeFile('data/_sync_summary.txt', summary);
  await fs.writeFile('data/_sync_preview.json', JSON.stringify(added, null, 2) + '\n');
  console.log(summary.split('\n\n')[0]);

  if (WRITE){
    await fs.writeFile('data/products.json', psJson(existing) + '\n');
    await replaceInline('js/catalog.js', existing);
    await replaceInline('product.html', existing);
    console.log('ЗАПИСАНО: data/products.json, js/catalog.js, product.html');
  } else {
    console.log('PREVIEW: products.json НЕ изменён. Подробности — data/_sync_summary.txt');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
