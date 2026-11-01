import {cities,money,type CityKey} from './pulse-data';
import {observation} from './real-data';
import {averageObservation} from './average-data';
import {findExtendedFact} from './extended-data';
import hhExcerpt from '../data/additional-hh-trends.json';
import hhArchive from '../data/evidence/hh-cities-snapshot.json';

export type TrendRow={
  id:string;
  label:string;
  valueText:string;
  changeText:string;
  period:string;
  geo:string;
  source:string;
  url:string;
  limitation:string;
};

type HhMetric='hhindex'|'averageCompensation';
type HhId='hhIndex'|'offeredMedian';
type HhPair={city:CityKey;id:HhId;metric:HhMetric;previous:number;current:number};
const areaIds={spb:'2',krd:'53'} as const;
const allowedMetrics:Record<HhId,HhMetric>={hhIndex:'hhindex',offeredMedian:'averageCompensation'};

/** Verify the excerpt against exact saved publisher cells; never fetch current data. */
export function verifyAdditionalHhTrends():HhPair[]{
  if(hhExcerpt.schemaVersion!==1 || hhExcerpt.updatePolicy!=='frozen'
    || hhExcerpt.previousPeriod!=='2025-09' || hhExcerpt.currentPeriod!=='2026-09'
    || hhExcerpt.source.url!==hhArchive.sourceURL
    || hhExcerpt.source.retrievedAt!==hhArchive.retrievedAt
    || hhExcerpt.source.sourceSha256!==hhArchive.sourceSha256
    || hhExcerpt.records.length!==4) throw new Error('Additional HH trend provenance does not match the saved archive.');
  const seen=new Set<string>();
  return hhExcerpt.records.map(record=>{
    if(record.cityKey!=='spb'&&record.cityKey!=='krd') throw new Error('Unknown city in additional HH trends.');
    const city=record.cityKey;
    if(record.id!=='hhIndex'&&record.id!=='offeredMedian') throw new Error('Unknown HH trend indicator.');
    const id=record.id,metric=allowedMetrics[id],key=`${city}/${id}`;
    if(seen.has(key)||record.areaId!==areaIds[city]||record.metric!==metric||record.monthIndex!==8)
      throw new Error(`Additional HH trend selection mismatch: ${key}`);
    seen.add(key);
    const area=hhArchive.cities[areaIds[city]];
    if(area.area.id!==record.areaId||area.area.name!==cities[city].name)
      throw new Error(`Additional HH trend geography mismatch: ${key}`);
    const series=area.metrics[metric];
    const header=series[0];
    if(JSON.stringify(header)!==JSON.stringify(['','2025','2026'])
      ||JSON.stringify(record.header)!==JSON.stringify(header))
      throw new Error(`Additional HH trend year header mismatch: ${key}`);
    const cells=series.slice(1).filter(row=>row[0]===record.monthIndex);
    if(cells.length!==1||cells[0][1]!==record.previousRaw||cells[0][2]!==record.currentRaw)
      throw new Error(`Additional HH trend source cells mismatch: ${key}`);
    if(!record.previousRaw.trim()||!record.currentRaw.trim())
      throw new Error(`Missing additional HH trend value: ${key}`);
    const previous=Number(record.previousRaw),current=Number(record.currentRaw);
    if(!Number.isFinite(previous)||!Number.isFinite(current)||previous<0||current<0)
      throw new Error(`Invalid additional HH trend value: ${key}`);
    return {city,id,metric,previous,current};
  });
}

const hhPairs=verifyAdditionalHhTrends();
const signed=(value:number,decimals=0)=>`${value>0?'+':''}${money(value,decimals)}`;

export function additionalTrends(city:CityKey):{rows:TrendRow[];summary:string}{
  const rows:TrendRow[]=[];
  const salary=averageObservation(city,'salary');
  if(city==='spb'&&salary?.change!=null&&salary.basis==='gross'&&salary.aggregation==='mean') rows.push({
    id:'salary',label:'Средняя начисленная зарплата',valueText:`${money(salary.value)} ₽/мес`,
    changeText:`${signed(salary.change,1)}% · ${salary.changeLabel?.toLocaleLowerCase('ru-RU')??'к сопоставимому периоду источника'}`,
    period:salary.period,geo:salary.geo,source:salary.source,url:salary.url,
    limitation:'Номинальная средняя зарплата работников организаций до удержания налога. Рост не равен увеличению покупательной способности или медианного дохода.',
  });

  for(const pair of hhPairs.filter(row=>row.city===city)){
    const index=pair.id==='hhIndex';
    const formatted=(n:number)=>money(n,index?1:0);
    const unit=index?'резюме/вакансию':'₽/мес';
    rows.push({
      id:pair.id,label:index?'Конкуренция за вакансии на HH':'Зарплата в вакансиях HH',
      valueText:`${formatted(pair.current)} ${unit}`,
      changeText:`${formatted(pair.previous)} → ${formatted(pair.current)} ${unit}`,
      period:'Сентябрь 2025 → сентябрь 2026',geo:cities[city].name,
      source:'HH Статистика · сохранённый срез',url:hhExcerpt.source.url,
      limitation:index
        ?'Число активных резюме на активную вакансию только на HH, все профессиональные области. Резюме не равно человеку; индекс не является уровнем безработицы.'
        :'Медиана предложений работодателей на HH, а не фактических выплат. До или после налога — в сохранённом источнике не уточнено; показаны номинальные суммы.',
    });
  }

  const rent=observation(city,'rent1');
  if(rent?.change!=null&&Number.isFinite(rent.change)) rows.push({
    id:'rent1',label:'Средняя аренда однокомнатной',valueText:`${money(rent.value)} ₽/мес`,
    changeText:`${signed(rent.change,1)}% к тому же срезу прошлого года`,period:rent.period,
    geo:rent.geo,source:rent.source,url:rent.url,
    limitation:'Средняя ставка в объявлениях о долгосрочной аренде без элитного сегмента. Это не медиана и не цена договора; изменение опубликовано источником.',
  });

  const population=findExtendedFact(city,city==='spb'?'populationChange':'populationCityChange');
  if(population?.value!=null&&population.geoLevel===(city==='spb'?'federal_subject':'city')) rows.push({
    id:population.id,label:city==='spb'?'Изменение численности населения':'Изменение опубликованной оценки населения',
    valueText:`${signed(population.value)} человек`,
    changeText:city==='spb'?'Официальное изменение за 2024 год':'Разность оценок на 1 января 2024 и 2025',
    period:population.period,geo:population.geo,source:population.source,url:population.url,
    limitation:city==='spb'
      ?'Вся административная территория Санкт-Петербурга. Рост численности сам по себе не измеряет благосостояние жителей.'
      :'Только город Краснодар без подчинённых сельских населённых пунктов. Расчётная разность опубликованных оценок; уточнения и возможные изменения границ не отделены от изменения численности. Это не миграционный или естественный прирост.',
  });

  const summaryParts:string[]=[];
  if(population?.value!=null&&rows.some(row=>row.id===population.id)){
    const direction=population.value>0?'увеличилась':population.value<0?'снизилась':'не изменилась';
    summaryParts.push(city==='spb'
      ?`Численность населения ${direction} за 2024 год.`
      :`Опубликованная оценка населения города ${direction} между 1 января 2024 и 2025 года.`);
  }
  const offered=hhPairs.find(row=>row.city===city&&row.id==='offeredMedian');
  const competition=hhPairs.find(row=>row.city===city&&row.id==='hhIndex');
  if(offered&&competition){
    const wageDirection=offered.current>offered.previous?'выросла':offered.current<offered.previous?'снизилась':'не изменилась';
    const indexDirection=competition.current>competition.previous?'стало больше':competition.current<competition.previous?'стало меньше':'осталось столько же';
    summaryParts.push(`В сентябре 2026 по сравнению с сентябрём 2025 медиана предлагаемых зарплат на HH ${wageDirection}; активных резюме на вакансию ${indexDirection}.`);
  }
  if(rent?.change!=null&&Number.isFinite(rent.change)){
    summaryParts.push(rent.change===0
      ?'Средняя аренда однокомнатной не изменилась в пределах точности опубликованного годового сравнения.'
      :`Средняя аренда однокомнатной в объявлениях ${rent.change<0?'ниже':'выше'} прошлогоднего среза.`);
  }
  summaryParts.push('Периоды различаются. Эти изменения сами по себе не определяют, как изменился реальный уровень жизни: для этого нужен сопоставимый ряд фактических доходов и полных расходов жителей.');
  return {rows,summary:summaryParts.join(' ')};
}
