await import('./build-media-credits.mjs');
await import('./build-additional.mjs');
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const housing=read('data/verified-observations.json').observations;
const averages=read('data/verified-averages.json').observations;
const profile=read('data/verified-city-profile.json').facts;
const ages=read('data/demography-age-sex.json').tables;
const proof=read('data/evidence/city-profile-audit.json');
const sectorWages=read('data/sector-wages.json');
const sectorProof=read('data/evidence/sector-wages-source.json');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const num=(value,decimals=0)=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);
const sectorRows=[
  {...sectorWages.overall,id:'sectorWagesOverall',label:'Средняя зарплата по всем видам деятельности за 2025 год',kind:'Официальный годовой итог'},
  ...sectorWages.sectors.map(row=>({...row,id:'sectorWage'+row.section,label:'Средняя зарплата · ОКВЭД 2 '+row.section+' · '+row.name,kind:'Официальная средняя зарплата по отрасли'})),
].map(row=>({...row,cityKey:sectorWages.cityKey,geo:sectorWages.geo,geoLevel:sectorWages.geoLevel,value:row.value,interval:null,decimals:0,unit:sectorWages.unit,period:sectorWages.period,aggregation:sectorWages.aggregation,basis:sectorWages.basis,source:sectorWages.source.name+' · '+sectorWages.source.publication,url:sectorWages.source.url,published:sectorWages.source.published,dateChecked:sectorWages.checkedAt,scope:sectorWages.scope+' Номинальные начисления до удержания НДФЛ за полный 2025 год. Метод: лист «'+sectorWages.source.methodologySheet+'», '+sectorWages.source.methodologyCells.join(', ')+'.'}));
const rows=[...housing.map(row=>({...row,interval:null,decimals:0,description:row.scope,kind:'Аналитика Циан'})),...averages.map(row=>({...row,kind:row.id==='foodMinimum'?'Официальный условный набор':'Официальная средняя зарплата'})),...profile.map(row=>({...row,kind:/derived|difference/.test(row.aggregation)?'Расчёт по опубликованным данным':row.evidenceId.startsWith('hh_city_')?'Агрегат HH':'Официальный показатель'})),...sectorRows];
const value=row=>row.interval?row.interval.map(n=>num(n,row.decimals)).join('–'):(row.approximate?'≈ ':'')+num(row.value,row.decimals);
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)} ↗</a>`;
const title=row=>`${row.label} · ${row.geo}`;
const cellTable=(headers,body)=>`<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
const factRows=rows.map(row=>`<tr><th scope="row">${esc(row.label)}<span class="secondary">${esc(row.geo)}</span><span class="tag">${esc(row.kind)}</span></th><td><strong>${esc(value(row))}</strong> ${esc(row.unit)}<span class="secondary">${esc(row.period)}</span>${row.basis==='gross'?'<span class="secondary">До удержания налога</span>':row.basis==='unspecified'?'<span class="secondary">До или после налога — не уточнено</span>':''}</td><td>${link(row.url,row.source)}<span class="secondary">Проверено: ${esc(row.dateChecked)}. Публикация: ${esc(row.published??'дата не указана')}.</span><details><summary>Где искать и что учтено</summary><p>${esc(row.locator??'Городская строка таблицы источника')}</p><p>${esc(row.scope)}</p>${row.description&&row.description!==row.scope?`<p>${esc(row.description)}</p>`:''}</details></td></tr>`).join('');
const distributions=proof.officialProof.flatMap(item=>item.distributions??[]);
const wageTables=distributions.map(table=>`<section><h3>${esc(table.geo)} · апрель 2025</h3><p>Численность в опубликованном распределении: ${num(table.total)}. ${esc(table.roundingNote)} Расхождение суммы частот и итога: ${num(table.roundingDifference)}.</p>${cellTable(['Диапазон зарплаты, ₽','Численность в таблице','Ширина диапазона, ₽','Частота / ширина'],table.bins.map(bin=>`<tr${bin.lower===table.peak.lower?' class="peak"':''}><th scope="row">${esc(bin.label)}</th><td>${num(bin.count)}</td><td>${bin.width===null?'Открытая группа':num(bin.width,1)}</td><td>${bin.density===null?'Не сравнивалась':num(bin.density,5)}</td></tr>`).join(''))}<p>Выделен максимум среди групп с известной шириной. Это расчёт по группировке, не точная мода микроданных. ${link('https://www.rosstat.gov.ru/storage/mediabank/Bul_zp_2025.rar','Первичный архив Росстата')}; таблица tab_11.xls, строка ${table.distributionRow}.</p></section>`).join('');
const hhRows=profile.filter(row=>row.evidenceId.startsWith('hh_city_')).map(row=>`<tr><th scope="row">${esc(title(row))}</th><td>${esc(value(row))} ${esc(row.unit)}</td><td>${esc(row.period)}</td><td>${esc(row.id)}</td></tr>`).join('');
const ageTables=ages.map(table=>`<section><h3>${esc(table.geo)} · ${esc(table.period)}</h3><p>Всего ${num(table.total)} жителей; мужчины ${num(table.male)}, женщины ${num(table.female)}. Доли на дашборде делятся на этот итог 2024 года, а не на численность другого года.</p>${cellTable(['Возраст','Мужчины','Женщины','Всего','Место в источнике'],table.bins.map(bin=>`<tr><th scope="row">${esc(bin.age)}</th><td>${num(bin.male)}</td><td>${num(bin.female)}</td><td>${num(bin.total)}</td><td>${esc(bin.locator)}</td></tr>`).join(''))}<p>${link(table.url,table.source)}. Проверено ${esc(table.dateChecked)}. ${esc(table.scope)}</p></section>`).join('');
const sectorRetrievedMoscow=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(sectorWages.source.retrievedAt));
const sectorTable=cellTable(['Раздел ОКВЭД 2','Вид экономической деятельности','Средняя начисленная зарплата, ₽/мес','Ячейки листа 4.4'],sectorWages.sectors.map(row=>`<tr><th scope="row">${esc(row.section)}</th><td>${esc(row.name)}</td><td>${num(row.value)}</td><td>${esc(row.locator)}</td></tr>`).join(''));
const sectorChapter=`<section id="sectors"><h2>Зарплаты по отраслям</h2>
<p><strong>${esc(sectorWages.geo)} · ${esc(sectorWages.period)} · средняя начисленная зарплата до удержания налога.</strong> Здесь сохранены ${sectorWages.sectors.length} отраслевых значений в номинальных рублях за месяц и отдельный официальный итог по всем видам деятельности. Охват — работники организаций всех видов экономической деятельности и форм собственности. Это не доход всех жителей и не зарплата конкретной профессии.</p>
<p><strong>ОКВЭД 2 — классификация видов экономической деятельности организаций.</strong> В этой таблице используются буквенные разделы A–S, а не числовые коды профессий. Например, раздел J «Информация и связь» объединяет деятельность организаций; он не означает зарплату каждого программиста. ${link(sectorWages.source.classificationURL,'Классификация Росстата')}.</p>
<p><strong>${esc(sectorWages.overall.label)}: ${num(sectorWages.overall.value)} ₽/мес.</strong> Это опубликованный годовой итог, ${esc(sectorWages.overall.locator)}, а не простое среднее ${sectorWages.sectors.length} отраслевых средних. Он показан отдельно от сохранённой средней за январь–ноябрь 2025 года: периоды различаются и значения не складываются.</p>
${sectorTable}
<p><strong>Что означает средняя.</strong> Среднемесячная начисленная зарплата определяется из фонда начисленной заработной платы, среднесписочной численности работников и числа месяцев периода. Фонд включает НДФЛ, поэтому показаны начисления до налога; оценки зарплаты «на руки» по отраслям не рассчитываются. Определение и налоговая база: лист «${esc(sectorProof.methodology.sheet)}», ячейки ${esc(sectorProof.methodology.definitionCell)} и ${esc(sectorProof.methodology.grossBasisCell)}.</p>
<p><strong>Как проверить.</strong> ${link(sectorWages.source.url,sectorWages.source.name+' · '+sectorWages.source.publication)}; лист «${esc(sectorProof.sheet)}», заголовок — ${esc(sectorProof.title)}. Единица: ${esc(sectorProof.unitCell.cell)} = «${esc(sectorProof.unitCell.value)}». Общий итог: ${esc(sectorProof.overall.labelCell)} — название, ${esc(sectorProof.overall.valueCell)} — значение. Отраслевые названия и значения: A8:A26 и B8:B26; точная пара ячеек приведена в каждой строке. Столбцы C и D содержат темпы роста и не используются как суммы зарплат. Дата публикации не установлена; будущие пересмотры возможны.</p>
<p><strong>Сохранённый источник.</strong> Книга получена ${esc(sectorRetrievedMoscow)} (МСК); исходная метка времени: <code>${esc(sectorWages.source.retrievedAt)}</code>. 26 октября 2026 года повторно прочитана сохранённая полная копия XLSX и сверена её контрольная сумма. Повторная загрузка текущего оригинала не заявляется; автоматического обновления нет. SHA-256: <code>${esc(sectorWages.source.sha256)}</code>.</p>
<p><strong>С чем сравнивать осторожно.</strong> Медиана и модальный интервал Росстата относятся к обследованию за апрель 2025 года с другим охватом, без малого предпринимательства. Они не являются медианой или модой этих годовых отраслевых средних. Профессиональные области HH и разделы ОКВЭД 2 не сопоставлены; отраслевые индексы HH из этой таблицы не рассчитываются.</p>
<p><a href="sector-wages.json" download>Скачать полный набор отраслевых зарплат (JSON)</a>: все ${sectorWages.sectors.length} отраслей, отдельный общий итог, периоды, охват, источник, ячейки и контрольная сумма. Файл доступен прямо с этой страницы без GitHub.</p></section>`;
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Как читать и проверить данные — Житие</title><style>
:root{color-scheme:light;--paper:#faf7f2;--ink:#26313c;--muted:#5e6873;--rose:#a55468;--rose-deep:#84384c;--line:#e3d9d1;--surface:#fffdfa;--rose-wash:#f7eef0}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1110px;margin:auto;padding:46px 30px 76px;min-width:0}
a{color:var(--rose);text-decoration-thickness:1px;text-underline-offset:4px;overflow-wrap:anywhere}
a:hover{color:var(--rose-deep);text-decoration-thickness:2px}
a:visited{color:#884458}
a:focus-visible,summary:focus-visible{outline:2px solid var(--rose);outline-offset:4px;border-radius:3px}
main>a:first-child{display:inline-block;min-height:44px;padding:8px 0;font-size:14px;font-weight:600;letter-spacing:.015em}
h1,h2,h3{color:var(--ink);font-family:Georgia,"Times New Roman",serif;font-weight:400;letter-spacing:-.025em}
h1{max-width:850px;margin:23px 0 18px;font-size:clamp(36px,4.6vw,53px);line-height:1.16}
h2{margin:0 0 18px;font-size:clamp(27px,3vw,34px);line-height:1.27}
h3{margin:0 0 14px;font-size:24px;line-height:1.35}
p{margin:12px 0 18px}
main>h1+p{max-width:77ch;color:var(--muted);font-size:18px;line-height:1.8}
strong{font-weight:650}
section{margin:30px 0;padding:30px;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 8px 30px #26313c05;scroll-margin-top:24px;min-width:0}
section>p:last-child{margin-bottom:0}
section section{margin:25px 0 0;padding:24px;background:#fbf8f4;border-radius:14px;box-shadow:none}
nav{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0 34px}
nav a{display:flex;align-items:center;min-height:44px;padding:9px 15px;border:1px solid #e8d7dc;border-radius:999px;background:var(--rose-wash);font-size:14px;line-height:1.5;text-decoration:none;font-weight:500}
nav a:hover{border-color:#cba6b0;background:#f3e5e9}
li{margin:12px 0;padding-left:3px}
ol,ul{padding-left:23px}
.note{margin:26px 0;padding:20px 24px;background:var(--rose-wash);border:1px solid #e8d7dc;border-left:3px solid var(--rose);border-radius:12px;font-size:15px;line-height:1.8}
.secondary{display:block;color:var(--muted);font-size:13px;line-height:1.7;margin-top:8px;font-weight:400}
.tag{display:inline-block;margin-top:9px;padding:3px 8px;background:var(--rose-wash);border:1px solid #ebdde1;border-radius:5px;color:#884458;font-size:12px;line-height:1.65;font-weight:500}
details{margin-top:13px;font-size:14px;line-height:1.8}
summary{cursor:pointer;color:var(--rose);min-height:44px;padding:8px 0;font-weight:600;line-height:1.65}
summary:hover{color:var(--rose-deep)}
details[open]{padding-bottom:6px}
details p{margin:10px 0 13px}
.table-scroll{max-width:100%;overflow:auto;border:1px solid var(--line);border-radius:12px;overscroll-behavior-x:contain;scrollbar-color:#c7adb5 #f3ece7}
table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.7;font-variant-numeric:tabular-nums}
th,td{text-align:left;vertical-align:top;padding:17px 15px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
th{font-weight:600}
thead th{background:#f2ece6;color:#4f5b66;font-size:12px;line-height:1.65;letter-spacing:.02em}
tbody tr:last-child>th,tbody tr:last-child>td{border-bottom:0}
#catalog table{min-width:740px}
#catalog th{width:28%}
#catalog td:nth-child(2){width:24%}
.peak,.peak>th,.peak>td{background:var(--rose-wash)}
.peak>th{box-shadow:inset 3px 0 var(--rose)}
code{padding:2px 5px;background:#f1ece6;border-radius:4px;overflow-wrap:anywhere;font-size:13px}
footer{margin-top:42px;padding-top:24px;border-top:1px solid var(--line);font-size:13px;line-height:1.8;color:var(--muted)}
@media(max-width:640px){
body{font-size:16px;line-height:1.75}
main{padding:26px 16px 48px}
h1{margin:19px 0 16px;font-size:35px;line-height:1.2}
h2{font-size:28px;line-height:1.3}
h3{font-size:23px}
main>h1+p{font-size:17px}
section{margin:23px 0;padding:23px 18px;border-radius:16px;box-shadow:none}
section section{padding:19px 15px;border-radius:12px}
.note{padding:18px;font-size:14px}
nav{gap:8px;margin:23px 0 28px}
nav a{padding:8px 13px;font-size:13px}
th,td{padding:14px 12px}
table{min-width:540px;font-size:14px}
#catalog table{min-width:680px}
footer{margin-top:30px;padding-top:20px}
}
@media(max-width:380px){main{padding-left:12px;padding-right:12px}h1{font-size:32px}section{padding:21px 14px}nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}nav a{justify-content:center;text-align:center;border-radius:12px}}
@media print{body{background:#fff;color:var(--ink);font-size:11px}main{max-width:none;padding:0}nav{display:none}section,section section{padding:16px;margin:18px 0;background:#fff;box-shadow:none;border-radius:0}.table-scroll{overflow:visible;border-radius:0}table,#catalog table{min-width:0;font-size:10px}th,td{padding:9px 7px}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:31px}h2{font-size:24px}h3{font-size:19px}.secondary{font-size:10px}.tag{font-size:10px}.note{font-size:11px}a{color:var(--rose-deep)}}
</style></head><body><main>
<a href="index.html">← Открыть дашборд</a><h1>Как читать и проверить данные</h1><p>«Житие» — публичный аналитический дашборд. Он описывает сохранённые показатели и объясняет их простым языком. Числа и ссылки ниже совпадают с дашбордом.</p>
<div class="note"><strong>Статус публикации.</strong> Проект не проходил независимое научное рецензирование. Здесь выполнена проверка происхождения, значений, единиц, периодов и территорий. Это не новая перепись и не доказательство полноты всех городских данных.</div>
<p><a href="media-credits.html">Фотографии, авторство и лицензии шрифтов ↗</a></p><nav aria-label="Разделы методики"><a href="#read">Как читать</a><a href="#limits">Ограничения</a><a href="#catalog">Все показатели</a><a href="#sectors">Зарплаты по отраслям</a><a href="#hh">Данные HH</a><a href="#mode">Модальный интервал</a><a href="#age">Возраст и пол</a><a href="#files">Файлы проверки</a></nav>
<section id="read"><h2>Как проверить одно число</h2><ol><li>Посмотрите название, единицу, период и территорию. Например, зарплата за апрель 2025 и вакансии за сентябрь 2026 относятся к разным периодам.</li><li>Найдите показатель в таблице ниже. Откройте первоисточник и «Где искать и что учтено»: там указаны страница, таблица, строка или выбранный город.</li><li>Для расчётного показателя проверьте исходные значения и формулу. Сохранённые выписки помогают повторить расчёт, но не заменяют первоисточник.</li></ol><p><a href="verified-data.csv" download>Скачать все основные наблюдения в таблице CSV (${rows.length})</a>. Код и вход в GitHub для чтения этой страницы не нужны.</p></section>
<section id="limits"><h2>Что можно и чего нельзя заключить</h2><ul><li><strong>Официальные обследования.</strong> Зарплаты описывают работников указанного круга организаций. Малое предпринимательство в апрельском обследовании исключено; это не доход всех жителей.</li><li><strong>Данные платформ.</strong> HH и Циан описывают свои данные. Их числа не объявляются репрезентативными оценками всего рынка города. Для медиан HH налоговая база и полная обработка зарплатных вилок не раскрыты; для Циан не раскрыты размеры городских выборок.</li><li><strong>Территории.</strong> Город Краснодар, муниципалитет с сельскими поселениями и Краснодарский край имеют разные границы. Краевые ориентиры подписаны отдельно.</li><li><strong>Периоды.</strong> Данные 2024–2026 годов не образуют единую текущую оценку. Возрастная структура не пересчитывается к численности другого года; разные месяцы не превращаются в выдуманную динамику.</li><li><strong>Неопределённость.</strong> Доверительные интервалы и неизвестные размеры выборок не рассчитывались и не заявляются. Точность показанного числа определяется публикацией или явно указанным округлением.</li><li><strong>Ваш бюджет.</strong> Это расчёт на введённых суммах. Он не называется бюджетом типичного жителя. Для дохода до налога предполагается одинаковая зарплата весь год; применяется сохранённая прогрессивная шкала НДФЛ без вычетов. ${link('https://www.nalog.gov.ru/rn78/news/activities_fts/15766617/','ФНС — основание налоговой модели')}.</li></ul><p>Язык публикации доступный; происхождение, ограничения и расчётные допущения остаются видимыми. Принципы открытого описания и повторного использования данных — ориентир работы, а не заявленный сертификат соответствия. ${link('https://www.nature.com/articles/sdata201618','Первичная публикация принципов FAIR')}.</p></section>
<section id="catalog"><h2>Все основные наблюдения (${rows.length}): значение, период, источник</h2><p>Одинаковый показатель в двух городах занимает две строки. ${sectorWages.sectors.length} отраслевых средних и один официальный годовой итог Петербурга учитываются отдельными наблюдениями. «Расчёт» означает результат из опубликованных входных значений. При неизвестной дате публикации это прямо указано.</p>${cellTable(['Показатель и территория','Значение и период','Источник и проверка'],factRows)}</section>
${sectorChapter}
<section id="hh"><h2>Как сверить агрегаты HH</h2><p>Сохранённые строки относятся к сентябрю 2026, всем профессиональным областям: Санкт-Петербург — город 2, Краснодар — город 53. Вакансии и резюме — дневные средние активных записей; отношение резюме к вакансиям не является безработицей. Зарплата предложения и ожидание в резюме не являются выплатой работнику.</p>${cellTable(['Показатель и город','Значение','Период','Поле сохранённого набора'],hhRows)}<p>${link('https://stats.hh.ru/','Интерфейс hh Статистики')} · ${link('https://stats.hh.ru/api/v1/data/RU','Первичный агрегат издателя')} · ${link('https://hhcdn.ru/file/18460655.pdf#page=16','Методика дневных средних, страница 16')} · ${link('https://github.com/IsNorseng/city-pulse/blob/main/data/evidence/hh-cities-snapshot.json','Сохранённая выписка')}.</p><p>Независимый пересчёт медиан из микроданных по этому агрегату невозможен. Показаны именно медианы издателя; неизвестные налоговые и выборочные параметры не выдумываются.</p></section>
<section id="mode"><h2>Как получен модальный интервал</h2><p>Для группы с известными границами: <strong>плотность = опубликованная частота / (верхняя граница − нижняя граница)</strong>. Выбирается наибольшая плотность среди этих групп. Открытые крайние группы не имеют конечной ширины и не сравниваются; их ширину нельзя назначать произвольно. При другом разбиении пик может измениться. Точная наиболее частая зарплата в микроданных здесь не определяется.</p>${wageTables}</section>
<section id="age"><h2>Возраст и пол: сохранённые таблицы</h2><p>Мужчины + женщины = всего в каждой строке; суммы возрастных групп совпадают с итогами. 70+ — открытая верхняя группа. Для процентов используется только население выбранной территории на ту же дату.</p>${ageTables}</section>
<section id="files"><h2>Что сохранено для проверки</h2><p>Сохранены рабочие значения, выбранные строки, описания методов, ссылки, места в документах и контрольные суммы исходных файлов. Полные исходные документы всех издателей в проекте не перепубликуются. Некоторые оригинальные адреса могут менять содержание; контрольная сумма позволяет различить версии файла, но сама по себе не доказывает правильность или полноту источника.</p><ul><li><a href="sector-wages.json" download>Полный набор отраслевых зарплат (JSON, без входа в GitHub)</a></li><li>${link('https://github.com/IsNorseng/city-pulse/blob/main/docs/data-audit.md','Описание проверки')}</li><li>${link('https://github.com/IsNorseng/city-pulse/blob/main/data/evidence/city-profile-audit.json','Выписки и исходные значения для расчётов')}</li><li>${link('https://github.com/IsNorseng/city-pulse/blob/main/docs/snapshot-sha256.json','Контрольные суммы сохранённых файлов')}</li><li>${link('https://github.com/IsNorseng/city-pulse','Проект и исходный код')}</li></ul><p>Ранее сохранённые показатели проверены 4–7 октября 2026 и зафиксированы. Отраслевой срез Петербурга повторно проверен по архивной копии 26 октября 2026; даты старых наблюдений не изменены. Автоматического обновления нет.</p></section><footer><a href="index.html">Вернуться к «Житию»</a> · Фиксированные данные, понятные пояснения, проверяемые источники.</footer></main></body></html>\n`;
const csvCell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const csv='\ufeff'+[['Показатель','Территория','Тип','Значение как показано','Исходное число','Границы интервала','Единица','Период','Источник','Ссылка','Дата публикации','Дата проверки','Где искать','Охват и ограничения'],...rows.map(row=>[row.label,row.geo,row.kind,value(row),row.value,row.interval?.join(' | '),row.unit,row.period,row.source,row.url,row.published??'Не указана',row.dateChecked,row.locator,row.scope])].map(row=>row.map(csvCell).join(';')).join('\n')+'\n';
for(const folder of ['docs','public']){fs.mkdirSync(path.join(root,folder),{recursive:true});fs.writeFileSync(path.join(root,folder,'methodology.html'),html);fs.writeFileSync(path.join(root,folder,'verified-data.csv'),csv);fs.copyFileSync(path.join(root,'data','sector-wages.json'),path.join(root,folder,'sector-wages.json'));}
console.log(`Readable methodology: ${rows.length} indicators, ${distributions.length} full wage distributions, ${ages.length} age/sex tables.`);
