import fs from 'node:fs';
import path from 'node:path';

export function writeLocalGuide(output) {
  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Начните здесь — Житие</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#faf7f2;color:#26313c;font:16px/1.75 Arial,Helvetica,sans-serif}
main{max-width:850px;margin:auto;padding:45px 24px 60px}h1,h2{font-family:Georgia,'Times New Roman',serif;font-weight:400;line-height:1.2}
h1{font-size:56px;letter-spacing:-1.5px;margin:15px 0 20px}h2{font-size:29px;margin:0 0 18px}p{margin:14px 0}
.eyebrow{font-size:11px;letter-spacing:1.3px;color:#853f50}.lead{font-size:20px;line-height:1.6}.button{display:inline-block;background:#a55468;color:white;padding:13px 22px;border-radius:5px;text-decoration:none;margin:12px 0}
section{padding:27px;background:#fffdfa;border:1px solid #ded7d0;border-radius:6px;margin:28px 0}li{padding:6px 0}ol,ul{padding-left:22px}
a{color:#853f50;text-underline-offset:4px}a:focus-visible{outline:3px solid #a55468;outline-offset:4px}.note,footer{color:#59606c;font-size:14px}.note{border-left:3px solid #a55468;padding-left:17px}
@media(max-width:600px){main{padding:25px 18px 40px}h1{font-size:45px}.lead{font-size:18px}section{padding:22px 18px}h2{font-size:26px}.button{width:100%;text-align:center}}
</style></head><body><main>
<p class="eyebrow">ЛОКАЛЬНЫЙ ВЫПУСК · БЕЗ АВТООБНОВЛЕНИЯ</p>
<h1>Житие</h1><p class="lead">Работа, жильё и личный бюджет. Проверяемые ориентиры, чтобы составить своё представление о городе.</p>
<a class="button" href="Житие.html">Открыть дашборд →</a>
<p class="note">Дашборд открывается в браузере. Установка программ, регистрация и запуск сервера не требуются. Для перехода к внешним первоисточникам нужен интернет.</p>
<section><h2>Три простых шага</h2><ol>
<li>Распакуйте весь архив в одну папку. Сохраняйте файлы рядом друг с другом.</li>
<li>Откройте «Житие.html» двойным щелчком. Выберите Санкт-Петербург или Краснодар и нужную вкладку.</li>
<li>Во вкладке «Расходы» укажите доход и расходы. Нулевые расходы заполните явно. Результат появится сразу; для каждого города хранится отдельный черновик до перезагрузки страницы.</li>
</ol></section>
<section><h2>Как читать числа</h2><p>Основные показатели относятся к 2024–2026 годам; исторические материалы датированы отдельно. Период, территория и источник подписаны у каждого значения.</p>
<p>Начисленная зарплата, предложения работодателей и ожидания соискателей — разные показатели. Краснодарский край и город Краснодар показаны с разными подписями. Личный бюджет рассчитывается на ваших суммах.</p>
<p>В Петербурге доступны средние зарплаты по 19 отраслям за 2025 год. Индексы HH в этом выпуске — общегородские. Это отдельные проверенные срезы, а не полная статистика городской экономики.</p>
<a href="methodology.html">Открыть методику и первоисточники →</a><p><a href="additional-context.html">Источники «Дополнительно» →</a></p><p><a href="media-credits.html">Фотографии, авторство и лицензии шрифтов →</a></p></section>
<section><h2>Для проверки и повторного использования</h2><ul>
<li><a href="verified-data.csv">Таблица значений и источников (CSV)</a> — 65 основных наблюдений.</li>
<li><a href="sector-wages.json">Отраслевые зарплаты Петербурга (JSON)</a> — значения, определения и места в исходном документе.</li>
<li>«Контрольные суммы SHA256.txt» — проверка целостности файлов этого архива.</li>
</ul></section>
<footer>Житие · сохранённый аналитический выпуск. Решения о работе, переезде и расходах остаются за вами.</footer>
</main></body></html>`;
  fs.writeFileSync(path.join(output, 'Начните здесь.html'), html);
  fs.writeFileSync(path.join(output, 'Прочитайте меня.txt'), [
    'ЖИТИЕ — ЛОКАЛЬНЫЙ ВЫПУСК', '',
    '1. Распакуйте весь архив в одну папку.',
    '2. Откройте «Начните здесь.html» или «Житие.html» двойным щелчком.',
    '3. Для чтения внешних первоисточников требуется интернет.', '',
    'Данные фиксированы; автоматического обновления нет.',
    'Даты и территории указаны у показателей.',
    'Введённый бюджет хранится в памяти страницы и исчезнет при перезагрузке.',
  ].join('\r\n') + '\r\n');
}
