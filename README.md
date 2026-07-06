# 9.19 PERFUME — сайт-каталог

Тёмная luxury-витрина парфюмерии. Статический сайт (HTML + Tailwind CDN + ванильный JS),
заказ оформляется через Telegram. Готов к деплою на GitHub Pages.

## Структура

```
index.html       — главная (hero, статистика, преимущества, хиты, CTA)
catalog.html     — каталог: фильтры, поиск, сортировка, модалка товара, корзина
about.html       — о магазине
contacts.html    — контакты
delivery.html    — доставка и оплата (черновик — заменить текст)
privacy.html     — политика конфиденциальности (заглушка)
data/products.json — БАЗА ТОВАРОВ (правится вручную)
js/site.js       — шапка/подвал/корзина/Telegram + конфиг SITE
js/catalog.js    — рендер каталога, фильтры, модалка
css/styles.css   — дизайн-система (цвета, шрифты, компоненты)
images/          — фото товаров (+ placeholder.svg)
serve.ps1        — локальный сервер для предпросмотра (не нужен на проде)
```

## Как добавить товар

Открой `data/products.json` и добавь объект. Обязательные поля:
`id, name, brand, type (original|oil), gender (male|female|unisex), notes,
description, badge (hit|new|null), in_stock (true|false), image_url, variants[]`.
Фото положи в `images/products/` и укажи путь в `image_url` (пусто = плейсхолдер).

## Контакты и настройки

Всё в одном месте — объект `SITE` в начале `js/site.js`:
Telegram, WhatsApp (пусто = кнопка скрыта), город, базовый URL для og/sitemap.

## Локальный запуск

Нет Node/Python — используется `serve.ps1` (встроенный .NET):
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Открой http://localhost:5199/

## Деплой на GitHub Pages

1. Создай репозиторий, залей содержимое папки.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Файл `.nojekyll` уже есть. При своём домене добавь `CNAME`.
4. Обнови `SITE.baseUrl`, `robots.txt` и `sitemap.xml` на реальный адрес.

## TODO перед запуском

- [ ] Заменить демо-товары в `products.json` на реальные + фото
- [ ] Указать номер WhatsApp в `SITE.whatsapp` (если нужен)
- [ ] Заполнить реальный текст в `delivery.html` и `privacy.html`
- [ ] Вставить реквизиты в подвале (`js/site.js`) вместо заглушки
- [ ] Логотип: текстовый уже стоит; при наличии картинки — заменить
