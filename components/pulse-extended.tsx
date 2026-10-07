"use client";

import type {CityKey} from '@/lib/pulse-data';
import {AgeSexPyramid} from '@/components/pulse-demography';
import {
  extendedFacts, factsForCity, factsForSection, findExtendedFact, formatExtendedDate,
  formatExtendedValue, groupFactsBySection, isAgeGroupFact, type ExtendedFact,
} from '@/lib/extended-data';

const overviewIds = [
  'actualMedian', 'offeredMedian', 'activeVacancies', 'population',
  'unemploymentILO', 'registeredUnemployment',
];

function RegionalBadge({fact}: {fact: ExtendedFact}) {
  if (fact.geoLevel !== 'region') return null;
  return <span className="profile-region-badge">Региональный ориентир · {fact.geo}</span>;
}

function BasisNote({fact}: {fact: ExtendedFact}) {
  if (fact.basis === 'not_applicable') return null;
  const text = fact.basis === 'gross' ? 'До удержания налога'
    : fact.basis === 'net' ? 'На руки'
      : 'До или после налога — источник не уточняет';
  return <p className="profile-basis">{text}</p>;
}

function SourceDetails({fact,compact=false}: {fact: ExtendedFact;compact?:boolean}) {
  return <details className="profile-source-details">
    <summary>Как проверить показатель</summary>
    {compact&&<><p className="profile-description">{fact.description}</p><p className="profile-scope">{fact.scope}</p></>}
    <dl>
      <div><dt>Публикация</dt><dd>{fact.published ? formatExtendedDate(fact.published) : 'Дата публикации не указана'}</dd></div>
      <div><dt>Проверка</dt><dd>{formatExtendedDate(fact.dateChecked)}</dd></div>
      <div><dt>Где искать</dt><dd>{fact.locator}</dd></div>
    </dl>
  </details>;
}

export function ExtendedFactCard({fact,compact=false}: {fact: ExtendedFact;compact?:boolean}) {
  return <article className={`profile-card${compact?' profile-card-compact':''}`}>
    <RegionalBadge fact={fact}/>
    <h3>{fact.label}</h3>
    <BasisNote fact={fact}/>
    <p className="profile-number">{formatExtendedValue(fact)}<span>{fact.unit}</span></p>
    <p className="profile-period">{fact.period}</p>
    <p className="profile-geography">{fact.geo}</p>
    {!compact&&<p className="profile-description">{fact.description}</p>}
    {fact.id === 'actualModalInterval' && <p className="profile-method-note">Наибольшая плотность среди групп с известными границами. Открытые группы не сравнивались; точная наиболее частая зарплата по этим данным не определяется.</p>}
    {!compact&&<p className="profile-scope">{fact.scope}</p>}
    <a className="profile-source-link" href={fact.url} target="_blank" rel="noreferrer">Источник: {fact.source} ↗</a>
    <SourceDetails fact={fact} compact={compact}/>
  </article>;
}

export function ProfileOverview({city}: {city: CityKey}) {
  const rows = overviewIds.map(id => findExtendedFact(city, id)).filter((fact): fact is ExtendedFact => Boolean(fact));
  if (!rows.length) return null;
  return <section className="profile-overview" aria-label="Ключевые показатели города">
    <div className="section-heading"><h2>Основные ориентиры</h2></div>
    <div className="profile-grid profile-grid-overview">
      {rows.map(fact => <ExtendedFactCard key={fact.id} fact={fact} compact/>)}
    </div>
  </section>;
}

export function WorkSection({city}: {city: CityKey}) {
  const groups = groupFactsBySection(city);
  const sections = [
    {key: 'wages' as const, heading: 'Фактические зарплаты', explanation: 'Средняя и медианная зарплата описывают распределение по-разному. Медиана делит упорядоченные значения пополам; на среднее сильнее влияют очень высокие зарплаты.'},
    {key: 'vacancies' as const, heading: 'Вакансии и предложения зарплаты', explanation: 'HH показывает объявления и резюме своей платформы. Это часть рынка труда. Предлагаемая зарплата в вакансии не означает фактически выплаченную зарплату.'},
    {key: 'unemployment' as const, heading: 'Безработица', explanation: 'Безработица по обследованию населения и зарегистрированная безработица учитывают разные группы людей. Период, территория и охват указаны отдельно у каждого показателя.'},
  ];
  return <div className="profile-sections">
    {sections.map(section => groups[section.key].length > 0 && <section className="panel profile-section" key={section.key}>
      <div className="section-heading"><h2>{section.heading}</h2></div>
      <p className="profile-section-intro">{section.explanation}</p>
      <div className="profile-grid">{groups[section.key].map(fact => <ExtendedFactCard key={fact.id} fact={fact}/>)}</div>
    </section>)}
    {!factsForCity(city).some(fact => fact.section !== 'demography') && <section className="panel"><p className="profile-section-intro">Проверенные показатели рынка труда для этого города пока не включены.</p></section>}
  </div>;
}

export function PopulationSection({city}: {city: CityKey}) {
  const rows = factsForSection(city, 'demography');
  const ageGroups = rows.filter(isAgeGroupFact);
  const cards = rows.filter(fact => !isAgeGroupFact(fact));
  return <section className="panel profile-section">
    <div className="section-heading"><h2>Население</h2></div>
    {!rows.length ? <p className="profile-section-intro">Проверенные показатели населения для этого города пока не включены.</p> : <>
      <p className="profile-section-intro">Численность населения относится к дате или периоду в источнике. Население города и население края показаны с разными подписями.</p>
      {cards.length > 0 && <div className="profile-grid">{cards.map(fact => <ExtendedFactCard key={fact.id} fact={fact}/>)}</div>}
      {ageGroups.length > 0 && <div className="profile-age-groups">
        <h3>Возрастные группы</h3>
        <div className="profile-table-scroll"><table className="profile-table">
          <thead><tr><th scope="col">Группа</th><th scope="col">Значение</th><th scope="col">Период и территория</th><th scope="col">Источник</th></tr></thead>
          <tbody>{ageGroups.map(fact => <tr key={fact.id}>
            <th scope="row">{fact.label}</th>
            <td>{formatExtendedValue(fact)} {fact.unit}</td>
            <td><RegionalBadge fact={fact}/><span>{fact.period}</span><span className="profile-table-secondary">{fact.geo}</span></td>
            <td><a className="profile-source-link" href={fact.url} target="_blank" rel="noreferrer">{fact.source} ↗</a><p className="profile-table-secondary">{fact.scope}</p><SourceDetails fact={fact}/></td>
          </tr>)}</tbody>
        </table></div>
      </div>}
    </>}
    <AgeSexPyramid city={city}/>
  </section>;
}

export function SourcesProfile() {
  if (!extendedFacts.length) return null;
  return <section className="profile-sources">
    <h2>Зарплаты, рынок труда и население</h2>
    <p className="profile-section-intro">Период показателя, дата публикации и дата проверки обозначают разные вещи. Ниже сохранены ссылки и места в первоисточниках.</p>
    <div className="profile-table-scroll"><table className="profile-table profile-sources-table">
      <thead><tr><th scope="col">Показатель</th><th scope="col">Значение и период</th><th scope="col">Источник и пояснения</th></tr></thead>
      <tbody>{extendedFacts.map(fact => <tr key={`${fact.cityKey}-${fact.id}`}>
        <th scope="row"><RegionalBadge fact={fact}/>{fact.label}<span className="profile-table-secondary">{fact.geo}</span></th>
        <td>{formatExtendedValue(fact)} {fact.unit}<span className="profile-table-secondary">{fact.period}</span><BasisNote fact={fact}/></td>
        <td><a className="profile-source-link" href={fact.url} target="_blank" rel="noreferrer">{fact.source} ↗</a><p className="profile-description">{fact.description}</p><p className="profile-scope">{fact.scope}</p><SourceDetails fact={fact}/></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
