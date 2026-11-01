import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root = process.cwd();
const media = JSON.parse(fs.readFileSync(path.join(root, 'data/portrait-media.json'), 'utf8'));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => new Intl.NumberFormat('ru-RU').format(value);
const humanDate = value => new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z')).replace(/\s*г\.$/, '');
const external = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noreferrer noopener">${esc(label)} ↗</a>`;

function verifiedAsset(record) {
  const bytes = fs.readFileSync(path.join(root, record.localFile));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== record.bytes || sha256 !== record.sha256) {
    throw new Error('Media registry does not match the local file: ' + record.localFile);
  }
  return bytes;
}

const cityNames = {spb:'Санкт-Петербург',krd:'Краснодар'};
const photos = [...Object.entries(media.photos).map(([city,photo])=>({...photo,city,id:city,role:'Обложка',buffer:verifiedAsset(photo)})),...Object.entries(media.chapterPhotos??{}).map(([city,photo])=>({...photo,city,id:city+'-life',role:'Фотографии глав',buffer:verifiedAsset(photo)})),...Object.entries(media.housingPhotos??{}).map(([city,photo])=>({...photo,city,id:city+'-housing',role:'Глава о жилье',buffer:verifiedAsset(photo)}))];
const fonts = media.fonts.map(font => ({
  ...font,
  buffer:verifiedAsset(font),
  license:fs.readFileSync(path.join(root, font.licenseFile), 'utf8'),
  licenseDownload:'fonts-' + font.family.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-license.txt',
}));

const fontFaces = fonts.map(font => `@font-face{font-family:'${esc(font.family)}';src:url(data:font/ttf;base64,${font.buffer.toString('base64')}) format('truetype');font-style:normal;font-weight:${font.family === 'Manrope' ? '200 800' : '400'};font-display:swap}`).join('\n');
const photoCards = photos.map(photo => `<article class="photo-card" id="photo-${esc(photo.id)}">
  <img src="data:image/jpeg;base64,${photo.buffer.toString('base64')}" alt="${esc(photo.alt)}">
  <div class="card-body">
    <p class="eyebrow">${esc(cityNames[photo.city])} · ${esc(photo.role)}</p>
    <h3>${esc(photo.title)}</h3>
    <p class="author">Фото: ${esc(photo.author)}</p>
    <dl>
      <div><dt>Дата съёмки</dt><dd>${esc(humanDate(photo.capturedAt))}</dd></div>
      <div><dt>Лицензия</dt><dd>${external(photo.licenseURL, photo.licenseName)}</dd></div>
      <div><dt>Адаптация</dt><dd>${esc(photo.adaptation)}</dd></div>
    </dl>
    <p>${external(photo.sourceURL, 'Страница фотографии на Wikimedia Commons')}</p>
    <details>
      <summary>Файл и контрольная сумма</summary>
      <dl>
        <div><dt>Локальный файл</dt><dd><code>${esc(photo.localFile)}</code></dd></div>
        <div><dt>Размер</dt><dd>${number(photo.bytes)} байт</dd></div>
        <div><dt>SHA-256</dt><dd><code>${esc(photo.sha256)}</code></dd></div>
      </dl>
      <p class="small">${external(photo.downloadURL, 'Исходный файл Wikimedia')}</p>
      <p class="url">${esc(photo.downloadURL)}</p>
    </details>
  </div>
</article>`).join('\n');

const fontCards = fonts.map(font => `<article class="font-card">
  <p class="eyebrow">${esc(font.family === 'Prata' ? 'Заголовки' : 'Текст и числа')}</p>
  <h3 style="font-family:'${esc(font.family)}',serif">${esc(font.family)}</h3>
  <p>${esc(font.license.split(/\r?\n/).find(line => line.trim()) ?? '')}</p>
  <p>SIL Open Font License 1.1 · ${esc(font.licenseName)}. ${external(font.sourceURL, 'Первоисточник: Google Fonts')}</p>
  <p><a href="${esc(font.licenseDownload)}" download>Скачать полный текст лицензии и сведения об авторстве</a></p>
  <details>
    <summary>Прочитать лицензию без интернета</summary>
    <pre>${esc(font.license)}</pre>
  </details>
  <details>
    <summary>Файл и контрольная сумма</summary>
    <dl>
      <div><dt>Локальный файл</dt><dd><code>${esc(font.localFile)}</code></dd></div>
      <div><dt>Размер</dt><dd>${number(font.bytes)} байт</dd></div>
      <div><dt>SHA-256</dt><dd><code>${esc(font.sha256)}</code></dd></div>
    </dl>
  </details>
</article>`).join('\n');

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Фотографии и шрифты — Житие</title>
  <style>
    ${fontFaces}
    *{box-sizing:border-box}
    body{margin:0;background:#faf7f2;color:#26313c;font-family:Manrope,Arial,sans-serif;font-size:16px;line-height:1.75}
    main{max-width:1080px;margin:auto;padding:38px 28px 56px}
    a{color:#81374c;text-decoration-thickness:1px;text-underline-offset:4px;overflow-wrap:anywhere}
    a:hover{color:#602439}
    a:focus-visible,summary:focus-visible{outline:2px solid #81374c;outline-offset:5px}
    h1,h2,h3{font-family:Prata,Georgia,serif;font-weight:400;line-height:1.3;letter-spacing:-.025em}
    h1{max-width:780px;font-size:clamp(33px,5vw,52px);margin:25px 0 18px}
    h2{font-size:31px;margin:0 0 22px}
    h3{font-size:24px;margin:8px 0 14px}
    p{margin:12px 0}
    .intro{max-width:75ch;color:#585c60}
    .eyebrow{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#81374c}
    .note{margin:25px 0 32px;padding:17px 20px;border-left:2px solid #81374c;background:#f1e5e1;color:#634c53;font-size:14px}
    nav{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:36px}
    nav a{display:inline-flex;align-items:center;min-height:44px;padding:7px 14px;border:1px solid #ddcec6;border-radius:6px;font-size:14px}
    section{margin-top:42px}
    .photo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
    .photo-card,.font-card{min-width:0;border:1px solid #e2d8ce;border-radius:12px;background:#fffdfa;overflow:hidden}
    .photo-card img{display:block;width:100%;height:auto;background:#eee7df}
    .card-body{padding:24px}
    .author{color:#585c60;font-size:14px}
    dl{margin:18px 0;font-size:14px}
    dl>div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;margin:11px 0}
    dt{color:#69615b}
    dd{margin:0;overflow-wrap:anywhere}
    details{margin-top:16px;padding-top:7px;border-top:1px solid #e5dcd3;color:#585c60;font-size:14px}
    summary{min-height:44px;padding:8px 0;cursor:pointer;color:#81374c;font-weight:500}
    .url,code{font-family:ui-monospace,Consolas,monospace;font-size:12px;overflow-wrap:anywhere}
    .small{font-size:13px}
    .font-card{padding:25px;margin-bottom:20px}
    .font-card h3{font-size:34px}
    .font-card p{font-size:14px}
    pre{padding:18px;background:#f4eee8;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65}
    footer{margin-top:40px;padding-top:23px;border-top:1px solid #dfd5cb;color:#69615b;font-size:13px}
    @media(max-width:680px){main{padding:24px 17px 40px}.photo-grid{grid-template-columns:minmax(0,1fr);gap:20px}.card-body,.font-card{padding:20px}h2{font-size:27px}h3{font-size:23px}dl>div{grid-template-columns:minmax(0,1fr);gap:3px}.note{padding:15px 17px}}
  </style>
</head>
<body><main>
  <a href="index.html">← Вернуться к «Житию»</a>
  <p class="eyebrow" style="margin-top:28px">Облик проекта</p>
  <h1>Фотографии и шрифты</h1>
  <p class="intro">Авторы, первоисточники и условия использования материалов в «Житии». Фотографии и шрифты сохранены локально; эта страница и полные тексты лицензий шрифтов читаются без интернета.</p>
  <div class="note"><strong>Архивные фотографии.</strong> Год съёмки указан у каждого снимка. Фотографии иллюстрируют город и не подтверждают текущие условия работы, расходы или состояние улиц. Материалы обложек получены ${esc(humanDate(media.retrievedAt))}, фотографии городской жизни — ${esc(humanDate(media.chapterPhotosCheckedAt??media.retrievedAt))}, материалы главы о жилье — ${esc(humanDate(media.housingPhotosCheckedAt??media.retrievedAt))}.</div>
  <nav aria-label="Разделы страницы"><a href="#photos">Фотографии</a><a href="#fonts">Шрифты и лицензии</a></nav>
  <section id="photos"><h2>Города в кадре</h2><div class="photo-grid">${photoCards}</div></section>
  <section id="fonts"><h2>Типографика</h2><p class="intro">Prata используется в заголовках, Manrope — в тексте и числах. Вместе со шрифтами сохранены исходные уведомления об авторских правах и полные тексты SIL Open Font License 1.1.</p>${fontCards}</section>
  <footer><p>Контрольные суммы и размеры сверены по локальным файлам при сборке этой страницы. Внешние ссылки ведут к первоисточникам и текстам лицензий; для их открытия нужно соединение с интернетом.</p><a href="index.html">Вернуться к «Житию»</a></footer>
</main></body></html>\n`;

for (const folder of ['docs', 'public']) {
  const directory = path.join(root, folder);
  fs.mkdirSync(directory, {recursive:true});
  fs.writeFileSync(path.join(directory, 'media-credits.html'), html);
  for (const font of fonts) {
    fs.copyFileSync(path.join(root, font.licenseFile), path.join(directory, font.licenseDownload));
  }
}
console.log(JSON.stringify({page:'media-credits.html',photos:photos.length,fonts:fonts.length,verifiedLocalAssets:photos.length+fonts.length,bytes:Buffer.byteLength(html)}));
