"use client";

import {useId} from 'react';
import {cities, money, type CityKey} from '@/lib/pulse-data';
import {findExtendedFact} from '@/lib/extended-data';
import {observation} from '@/lib/real-data';
import ageSexDataset from '@/data/demography-age-sex.json';
import './city-portrait-previews.css';

export type CityPortraitPreviewProps = {
  city: CityKey;
  onNavigate?: () => void;
};

export type MiniBudgetProps = CityPortraitPreviewProps & {
  /** Monthly income after tax, supplied by the personal calculator. */
  net?: number | null;
  /** Complete monthly expense total; null while any expense is missing. */
  costs?: number | null;
  /** Optional calculator result. A complete result must equal net minus costs. */
  remainder?: number | null;
};

function PreviewLink({onNavigate, children}: {onNavigate?: () => void; children: string}) {
  return onNavigate
    ? <button type="button" className="city-mini__navigate" onClick={onNavigate}>{children}<span aria-hidden="true">↗</span></button>
    : null;
}

/** HH publisher medians only: offers and expectations, never actual wages. */
export function MiniWork({city, onNavigate}: CityPortraitPreviewProps) {
  const offered = findExtendedFact(city, 'offeredMedian');
  const expected = findExtendedFact(city, 'expectedMedian');
  const comparable = offered && expected
    && offered.value !== null && expected.value !== null
    && offered.value > 0 && expected.value > 0
    && offered.aggregation === 'publisher_median' && expected.aggregation === 'publisher_median'
    && offered.period === expected.period && offered.geo === expected.geo
    && offered.geoLevel === 'city' && expected.geoLevel === 'city'
    && offered.unit === expected.unit && offered.basis === expected.basis
    && offered.source === expected.source && offered.url === expected.url;

  if (!comparable) return null;
  const rows = [
    {label: 'Предлагают в вакансиях', fact: offered, kind: 'solid'},
    {label: 'Ожидают в резюме', fact: expected, kind: 'outline'},
  ];
  const maximum = Math.max(offered.value!, expected.value!);

  return <figure className="city-mini city-mini--work">
    <figcaption className="city-mini__caption">Медианы зарплат на HH</figcaption>
    <p className="city-mini__context">{offered.period} · {offered.geo}</p>
    <div className="city-mini__bars">
      {rows.map(({label, fact, kind}) => <div className="city-mini__bar-row" key={fact.id}>
        <div className="city-mini__bar-heading"><span>{label}</span><strong>{money(fact.value!, fact.decimals)}<small>{fact.unit}</small></strong></div>
        <div className="city-mini__track" aria-hidden="true"><span className={`city-mini__bar city-mini__bar--${kind}`} style={{width: `${fact.value! / maximum * 100}%`}}/></div>
      </div>)}
      <div className="city-mini__scale" aria-hidden="true"><span>0</span><span>{money(maximum, offered.decimals)} {offered.unit}</span></div>
    </div>
    <p className="city-mini__note">Только платформа HH. Это предложения и ожидания, а не выплаты. До или после налога — в сохранённом источнике не уточнено.</p>
    <div className="city-mini__footer"><a href={offered.url} target="_blank" rel="noreferrer">Источник: HH Статистика</a><PreviewLink onNavigate={onNavigate}>О работе</PreviewLink></div>
  </figure>;
}

/** Two published mean asking rents, with a common zero-based rouble scale. */
export function MiniHousing({city, onNavigate}: CityPortraitPreviewProps) {
  const one = observation(city, 'rent1');
  const two = observation(city, 'rent2');
  const comparable = one && two && one.value > 0 && two.value > 0
    && one.aggregation === 'mean' && two.aggregation === 'mean'
    && one.priceBasis === 'offer' && two.priceBasis === 'offer'
    && one.periodKey === two.periodKey && one.geo === two.geo
    && one.geoLevel === 'city' && two.geoLevel === 'city'
    && one.unit === two.unit && one.source === two.source && one.url === two.url;

  if (!comparable) return null;
  const maximum = Math.max(one.value, two.value);
  const rows = [{label: 'Однокомнатная', fact: one}, {label: 'Двухкомнатная', fact: two}];

  return <figure className="city-mini city-mini--housing">
    <figcaption className="city-mini__caption">Средняя аренда в объявлениях</figcaption>
    <p className="city-mini__context">{one.period} · {one.geo}</p>
    <div className="city-mini__bars">
      {rows.map(({label, fact}) => <div className="city-mini__bar-row" key={fact.id}>
        <div className="city-mini__bar-heading"><span>{label}</span><strong>{money(fact.value)}<small>{fact.unit}</small></strong></div>
        <div className="city-mini__track" aria-hidden="true"><span className="city-mini__bar city-mini__bar--solid" style={{width: `${fact.value / maximum * 100}%`}}/></div>
      </div>)}
      <div className="city-mini__scale" aria-hidden="true"><span>0</span><span>{money(maximum)} {one.unit}</span></div>
    </div>
    <p className="city-mini__note">Долгосрочная аренда без элитного сегмента. Среднее не равно медиане; это цены предложений, а не договоров.</p>
    <div className="city-mini__footer"><a href={one.url} target="_blank" rel="noreferrer">Источник: ЦИАН.Аналитика</a><PreviewLink onNavigate={onNavigate}>О жилье</PreviewLink></div>
  </figure>;
}

/** No example sums: only a complete personal scenario or an unnumbered formula. */
export function MiniBudget({city, net, costs, remainder, onNavigate}: MiniBudgetProps) {
  const complete = typeof net === 'number' && Number.isFinite(net) && net >= 0
    && typeof costs === 'number' && Number.isFinite(costs) && costs >= 0;
  const calculated = complete ? net! - costs! : null;
  const consistent = remainder == null || (Number.isFinite(remainder) && calculated !== null && Math.abs(remainder - calculated) < 0.01);
  const ready = complete && consistent;
  const deficit = ready && calculated! < 0;

  return <figure className={`city-mini city-mini--budget${ready ? ' city-mini--calculated' : ''}`}>
    <figcaption className="city-mini__caption">{ready ? 'Ваш результат за месяц' : 'Из города — к своему бюджету'}</figcaption>
    <p className="city-mini__context">Личный сценарий · {cities[city].name}</p>
    <div className="city-mini__equation" aria-label={ready ? `Доход на руки ${money(net!)} рублей минус расходы ${money(costs!)} рублей: ${deficit ? 'дефицит' : 'остаток'} ${money(Math.abs(calculated!))} рублей в месяц.` : 'Доход на руки минус расходы равняется остатку.'}>
      <div className="city-mini__term"><span>Доход на руки</span>{ready && <strong>{money(net!)}<small>₽/мес</small></strong>}</div>
      <span className="city-mini__operator" aria-hidden="true">−</span>
      <div className="city-mini__term"><span>Ваши расходы</span>{ready && <strong>{money(costs!)}<small>₽/мес</small></strong>}</div>
      <span className="city-mini__operator" aria-hidden="true">=</span>
      <div className={`city-mini__term city-mini__term--result${deficit ? ' city-mini__term--deficit' : ''}`}><span>{deficit ? 'Не хватает' : 'Остаток'}</span>{ready && <strong>{money(Math.abs(calculated!))}<small>₽/мес</small></strong>}</div>
    </div>
    <p className="city-mini__note">{ready ? 'По вашим введённым суммам. Городская статистика не определяет ваш личный бюджет.' : 'Введите свой доход и все статьи расходов. Калькулятор покажет остаток или дефицит без условных сумм.'}</p>
    <div className="city-mini__footer"><span>Суммы из личного калькулятора</span><PreviewLink onNavigate={onNavigate}>{ready ? 'Изменить суммы' : 'Рассчитать бюджет'}</PreviewLink></div>
  </figure>;
}

/** The same verified age/sex tables as the full population section. */
export function MiniPopulation({city, onNavigate}: CityPortraitPreviewProps) {
  const id = useId();
  // For Krasnodar use the settlement, never the municipality with rural residents.
  const table = ageSexDataset.tables.find(row => row.cityKey === city
    && row.geoLevel === (city === 'krd' ? 'settlement' : 'federal_subject'));
  if (!table) return null;
  const bins = [...table.bins].reverse();
  const maximum = Math.max(...bins.flatMap(bin => [bin.male, bin.female]));
  const description = bins.map(bin => `${bin.age.replace('-', '–')} лет: мужчины ${money(bin.male)}, женщины ${money(bin.female)} человек.`).join(' ');

  return <figure className="city-mini city-mini--population">
    <figcaption className="city-mini__caption">Население по полу и возрасту</figcaption>
    <p className="city-mini__context">{table.period} · {table.geo}</p>
    <div className="city-mini__pyramid-legend" aria-hidden="true"><span><i className="city-mini__male-key"/>Мужчины</span><span>лет</span><span>Женщины<i className="city-mini__female-key"/></span></div>
    <div className="city-mini__pyramid" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <span id={`${id}-title`} className="city-mini__sr-only">Половозрастная пирамида. Мужчины слева, женщины справа. Общая шкала численности в каждой группе.</span>
      <span id={`${id}-description`} className="city-mini__sr-only">{table.geo}. {table.period}. {description}</span>
      {bins.map(bin => <div className="city-mini__pyramid-row" key={bin.age} aria-hidden="true">
        <div className="city-mini__pyramid-side city-mini__pyramid-side--male" title={`Мужчины, ${bin.age.replace('-', '–')} лет: ${money(bin.male)} человек`}><span style={{width: `${bin.male / maximum * 100}%`}}/></div>
        <span className="city-mini__age">{bin.age.replace('-', '–')}</span>
        <div className="city-mini__pyramid-side city-mini__pyramid-side--female" title={`Женщины, ${bin.age.replace('-', '–')} лет: ${money(bin.female)} человек`}><span style={{width: `${bin.female / maximum * 100}%`}}/></div>
      </div>)}
      <div className="city-mini__pyramid-axis" aria-hidden="true"><span>{money(maximum)}</span><span>0</span><span>{money(maximum)}</span></div>
    </div>
    <p className="city-mini__note">Человек в группе. 70+ объединяет все старшие возраста. Это структура 2024 года.</p>
    <div className="city-mini__footer"><a href={table.url} target="_blank" rel="noreferrer">Источник: {table.source}</a><PreviewLink onNavigate={onNavigate}>О населении</PreviewLink></div>
  </figure>;
}
