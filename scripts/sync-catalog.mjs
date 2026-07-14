/*
  Синхронизация каталога сайта из Google-таблицы (прайса).
  - Читает "сырой" CSV одной вкладки прайса.
  - Бренды идут секциями: строка-заголовок содержит "НАЗВАНИЯ БРЕНДОВ" во 2-й колонке,
    а бренд — в 1-й колонке (после "№").
  - Собирает ароматы (бренд, название, пол, наличие) БЕЗ цен.
  - Добавляет в data/products.json только НОВЫЕ позиции (по бренд+название),
    существующие не трогает. Цены на сайт не попадают.

  Режимы:
    PREVIEW (по умолчанию) — только пишет data/_sync_preview.json и data/_sync_summary.txt,
                             products.json НЕ меняет.
    WRITE=1               — добавляет новые позиции прямо в data/products.json.
*/

import fs from 'node:fs/promises';

const SHEET_ID = '1niSpFZM3N_-jh4rlo79fgrCUeRqFP9x9Qux8CPPG5mk';
const GID = '632257939';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const WRITE = process.env.WRITE === '1';

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

const norm = s => (s || '').toString().toLowerCase()
  .replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

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

function isBrandHeader(r){
  return /названия\s*брендов/i.test((r[1] || ''));
}

function parsePrice(cell){
  return /названия\s*брендов/i.test(cell); // не используется, оставлено для ясности
}

async function main(){
  const res = await fetch(CSV_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
  const csv = await res.text();
  const rows = parseCSV(csv);

  let brand = null;
  const brandsFound = [];
  const parsed = [];

  for (const r of rows){
    const c0 = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    const vid  = (r[2] || '').trim();

    if (isBrandHeader(r)){
      brand = c0.replace(/^№/i, '').trim() || (r[0] || '').trim();
      if (brand) brandsFound.push(brand);
      continue;
    }
    if (!brand) continue;            // служебный блок сверху — до первого бренда
    if (!name) continue;             // пустая строка
    if (/^\s*$/.test(name)) continue;

    let clean = name;
    let inStock = true;
    if (/нет\s*в\s*наличии/i.test(clean)){
      inStock = false;
      clean = clean.replace(/\(?\s*нет\s*в\s*наличии\s*\)?/i, '').trim();
    }
    if (!clean) continue;

    parsed.push({
      brand,
      name: clean,
      gender: GENDER[vid.toUpperCase()] || 'unisex',
      in_stock: inStock,
    });
  }

  const existingRaw = await fs.readFile('data/products.json', 'utf8');
  const existing = JSON.parse(existingRaw);
  const seen = new Set(existing.map(p => norm(p.brand) + '|' + norm(p.name)));

  const toAdd = [];
  const addedKeys = new Set();
  for (const p of parsed){
    const key = norm(p.brand) + '|' + norm(p.name);
    if (seen.has(key) || addedKeys.has(key)) continue;
    addedKeys.add(key);
    toAdd.push({
      id: slug(p.brand + ' ' + p.name),
      name: p.name,
      brand: p.brand,
      type: 'oil',
      gender: p.gender,
      notes_top: '', notes_heart: '', notes_base: '', notes: '',
      description: '',
      badge: null,
      in_stock: p.in_stock,
      image_url: null,
      variants: [],          // без цены — цена только в прайсе
    });
  }

  const uniqueBrands = [...new Set(brandsFound)];
  const summary =
    `Дата (UTC-независимо от Action)\n` +
    `Позиций в прайсе разобрано: ${parsed.length}\n` +
    `Брендов-секций найдено: ${uniqueBrands.length}\n` +
    `Товаров на сайте сейчас: ${existing.length}\n` +
    `НОВЫХ к добавлению: ${toAdd.length}\n\n` +
    `Первые бренды: ${uniqueBrands.slice(0, 20).join(' | ')}\n\n` +
    `Примеры новых позиций (до 40):\n` +
    toAdd.slice(0, 40).map(p => `  + [${p.brand}] ${p.name} (${p.gender})${p.in_stock ? '' : ' — нет в наличии'}`).join('\n');

  console.log(summary);

  await fs.writeFile('data/_sync_summary.txt', summary + '\n');
  await fs.writeFile('data/_sync_preview.json', JSON.stringify(toAdd, null, 2) + '\n');

  if (WRITE && toAdd.length){
    const merged = existing.concat(toAdd);
    await fs.writeFile('data/products.json', JSON.stringify(merged, null, 4) + '\n');
    console.log(`ЗАПИСАНО: +${toAdd.length} в data/products.json (итого ${merged.length}).`);
  } else {
    console.log('PREVIEW: products.json НЕ изменён.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
