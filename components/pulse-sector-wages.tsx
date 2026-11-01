"use client";

import {useId, useState} from 'react';
import type {CityKey} from '@/lib/pulse-data';
import {money} from '@/lib/pulse-data';
import {sectorSourceDate, sectorWageDatasets, sectorWagesForCity, type SectorWagesDataset} from '@/lib/sector-wages';
import './pulse-sector-wages.css';

function SectorSource({data}: {data: SectorWagesDataset}) {
  return <div className="sector-source">
    <p><a href={data.source.url} target="_blank" rel="noreferrer">Петростат · «{data.source.publication}» ↗</a></p>
    <p>Таблица {data.source.sheet}. Метод: лист «{data.source.methodologySheet}», ячейки {data.source.methodologyCells.join(', ')}.</p>
    <p>Файл получен {sectorSourceDate(data.source.retrievedAt)} (МСК), сохранённая копия сверена {sectorSourceDate(data.checkedAt)}. Автоматического обновления нет.</p>
    <a href="methodology.html#sectors" target="_blank" rel="noreferrer">Как проверены отраслевые зарплаты ↗</a>
  </div>;
}

export function SectorWagesSection({city}: {city: CityKey}) {
  const data = sectorWagesForCity(city);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('highest');
  const id = useId();
  if (!data) return null;

  const search = query.trim().toLocaleLowerCase('ru-RU');
  const selected = data.sectors.filter(row => `Раздел ${row.section} ${row.name} ${row.shortName}`.toLocaleLowerCase('ru-RU').includes(search));
  const rows = [...selected].sort((a, b) => sort === 'code'
    ? a.section.localeCompare(b.section, 'en')
    : sort === 'lowest' ? a.value - b.value : b.value - a.value);
  // The same zero-based scale is retained when the reader filters or sorts rows.
  const ceiling = Math.ceil(Math.max(...data.sectors.map(row => row.value)) / 100_000) * 100_000;
  const ticks = [0, .25, .5, .75, 1];
  const referencePosition = data.overall.value / ceiling * 100;

  return <section id="sector-wages" className="panel sector-panel" aria-labelledby={`${id}-title`}>
    <header className="sector-heading">
      <div>
        <p className="sector-eyebrow">{data.source.name.toLocaleUpperCase('ru-RU')} · {data.geo.toLocaleUpperCase('ru-RU')} · ПОЛНЫЙ {data.period.toLocaleUpperCase('ru-RU')}</p>
        <h2 id={`${id}-title`}>Сколько начисляют в разных отраслях</h2>
        <p className="sector-subtitle">Среднемесячная зарплата работников организаций, до НДФЛ. Номинальные суммы, ₽/мес.</p>
      </div>
      <div className="sector-reference"><span>Общая средняя · {data.periodKey}</span><strong>{money(data.overall.value)} ₽</strong><small>Все виды деятельности</small></div>
    </header>

    <p className="sector-explanation">Это средние начисления за месяц по итогам года, а не зарплата конкретного специалиста. Отрасль определяется деятельностью организации: например, её бухгалтер и программист учитываются вместе с другими работниками.</p>

    <div className="sector-controls">
      <label htmlFor={`${id}-filter`}>Найти отрасль
        <input id={`${id}-filter`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Например, образование или раздел P"/>
      </label>
      <label htmlFor={`${id}-sort`}>Порядок
        <select id={`${id}-sort`} value={sort} onChange={event => setSort(event.target.value)}>
          <option value="highest">Сначала выше зарплата</option>
          <option value="lowest">Сначала ниже зарплата</option>
          <option value="code">По разделам ОКВЭД 2</option>
        </select>
      </label>
      {query && <button type="button" onClick={() => setQuery('')}>Сбросить поиск</button>}
    </div>

    <p className="sector-count" role="status" aria-live="polite">Показано {rows.length} из {data.sectors.length} отраслей · шкала начинается с нуля и сохраняется при поиске</p>

    {rows.length ? <div className="sector-chart" aria-label={`${data.indicator} · ${data.geo} · ${data.period}`}>
      <div className="sector-axis" aria-hidden="true">{ticks.map(tick => <span key={tick}>{money(ceiling * tick)}</span>)}</div>
      <ul className="sector-bars">
        {rows.map(row => <li key={row.section}>
          <div className="sector-row-label"><span><span className="sector-code">{row.section}</span>{row.shortName}</span><strong>{money(row.value)} ₽</strong></div>
          <div className="sector-track" aria-hidden="true">
            <span className="sector-bar" style={{width: `${row.value / ceiling * 100}%`}}/>
            <span className="sector-mean-marker" style={{left: `${referencePosition}%`}}/>
          </div>
        </li>)}
      </ul>
      <p className="sector-chart-key"><span aria-hidden="true"/>Черта на полосах — общая средняя {money(data.overall.value)} ₽ из источника. Это не простое среднее отраслевых значений.</p>
    </div> : <p className="sector-empty">Такой отрасли в списке не найдено. Измените запрос или сбросьте поиск.</p>}

    <details className="sector-details">
      <summary>Полные названия отраслей и значения для проверки</summary>
      <div className="sector-table-scroll"><table>
        <caption>Разделы {data.classification} · {data.geo} · {data.period} · начислено до НДФЛ, {data.unit}</caption>
        <thead><tr><th scope="col">Раздел</th><th scope="col">Название в источнике</th><th scope="col">Зарплата</th><th scope="col">Ячейки</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.section}><th scope="row">{row.section}</th><td>{row.name}</td><td>{money(row.value)} ₽</td><td>{row.locator}</td></tr>)}</tbody>
      </table></div>
    </details>

    <aside className="sector-context"><strong>Как сопоставлять с другими зарплатами</strong><p>Медиана и модальный интервал ниже относятся к отдельному обследованию; его период и охват указаны в карточках. HH описывает вакансии и резюме по профессиональным областям. Эти категории не совпадают с отраслями организаций; общегородской hh.индекс не является индексом каждой отрасли.</p></aside>
    <SectorSource data={data}/>
  </section>;
}

export function SectorWagesSources() {
  return <>{sectorWageDatasets.map(data => <section className="sector-source-card" key={data.cityKey}>
    <h2>Средняя зарплата по отраслям · {data.geo}</h2>
    <p>{data.period} · {data.sectors.length} разделов ОКВЭД 2 · средние начисления до НДФЛ, ₽/мес.</p>
    <p>{data.scope}</p>
    <p>Буквы A–S обозначают разделы классификатора, а не профессии. Суммы взяты из столбца B; столбцы C и D содержат темпы роста.</p>
    <SectorSource data={data}/>
    <p><a href="methodology.html#sectors" target="_blank" rel="noreferrer">Все значения и выгрузка набора ↗</a></p>
  </section>)}</>;
}
