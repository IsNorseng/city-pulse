"use client";
import {useId,useState} from 'react';
import type {CityKey} from '@/lib/pulse-data';
import dataset from '@/data/demography-age-sex.json';

type AgeBin={age:string;total:number;male:number;female:number;locator:string};
type AgeTable={cityKey:CityKey;geo:string;geoLevel:'settlement'|'municipal'|'federal_subject';period:string;source:string;url:string;published:string|null;dateChecked:string;total:number;male:number;female:number;bins:AgeBin[];scope:string};
type DisplayUnit='people'|'percent';
const tables=dataset.tables as AgeTable[];
const count=new Intl.NumberFormat('ru-RU');
const percent=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
const day=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'});
function humanDate(value:string){return day.format(new Date(`${value}T00:00:00`));}

export function AgeSexPyramid({city}:{city:CityKey}){
  const id=useId();
  const [territory,setTerritory]=useState<'settlement'|'municipal'>('settlement');
  const [unit,setUnit]=useState<DisplayUnit>('people');
  const available=tables.filter(table=>table.cityKey===city);
  const table=available.find(table=>table.geoLevel===territory)??available.find(table=>table.geoLevel==='settlement')??available[0];
  if(!table)return null;
  const bins=[...table.bins].reverse();
  const value=(n:number)=>unit==='people'?n:n/table.total*100;
  const maxValue=Math.max(...bins.flatMap(bin=>[value(bin.male),value(bin.female)]));
  const scaleStep=unit==='people'?10**Math.floor(Math.log10(maxValue)):1;
  const maximum=Math.ceil(maxValue/scaleStep)*scaleStep;
  const scaleLabel=(n:number)=>unit==='people'?count.format(n):percent.format(n)+'%';
  const description=(sex:string,age:string,n:number)=>`${sex}, ${age.replace('-','–')} лет: ${count.format(n)} человек; ${percent.format(n/table.total*100)}% населения. ${table.period}, ${table.geo}.`;

  return <section className="panel demography-panel" aria-labelledby={`${id}-heading`}>
    <div className="demography-heading"><p className="eyebrow">НАСЕЛЕНИЕ ПО ПОЛУ И ВОЗРАСТУ</p><h2 id={`${id}-heading`}>Возрастная пирамида</h2><p className="demography-period">{table.period} · {table.geo}</p></div>
    <div className="demography-controls">
      {city==='krd'&&<label className="demography-selector" htmlFor={`${id}-territory`}>Территория<select id={`${id}-territory`} value={territory} onChange={event=>setTerritory(event.target.value as 'settlement'|'municipal')}><option value="settlement">Сам город Краснодар</option><option value="municipal">Муниципалитет с сельскими поселениями</option></select></label>}
      <div className="demography-units" role="group" aria-label="Единица измерения"><button type="button" aria-pressed={unit==='people'} onClick={()=>setUnit('people')}>Человек</button><button type="button" aria-pressed={unit==='percent'} onClick={()=>setUnit('percent')}>% населения</button></div>
    </div>
    <div className="demography-totals"><span>Мужчины <strong>{count.format(table.male)}</strong></span><span>Женщины <strong>{count.format(table.female)}</strong></span><span>Всего <strong>{count.format(table.total)}</strong></span></div>
    <figure className="demography-figure">
      <div className="demography-legend"><span><i className="demography-male-key"/>Мужчины</span><span>Возраст</span><span>Женщины<i className="demography-female-key"/></span></div>
      <div className="demography-chart" role="img" aria-label={`Возрастная пирамида: ${table.geo}, ${table.period}. Мужчины слева, женщины справа, общий масштаб. Точные числа доступны в таблице ниже.`}>
        {bins.map(bin=><div className="demography-row" key={bin.age}>
          <div className="demography-side demography-male-side" title={description('Мужчины',bin.age,bin.male)}><span className="demography-bar demography-male-bar" style={{width:`${value(bin.male)/maximum*100}%`}}/></div>
          <span className="demography-age">{bin.age.replace('-','–')}</span>
          <div className="demography-side demography-female-side" title={description('Женщины',bin.age,bin.female)}><span className="demography-bar demography-female-bar" style={{width:`${value(bin.female)/maximum*100}%`}}/></div>
        </div>)}
        <div className="demography-axis"><div><span>{scaleLabel(maximum)}</span><span>{scaleLabel(maximum/2)}</span><span>{scaleLabel(0)}</span></div><span/><div><span>{scaleLabel(0)}</span><span>{scaleLabel(maximum/2)}</span><span>{scaleLabel(maximum)}</span></div></div>
      </div>
      <figcaption>Одна шкала для мужчин и женщин. 70+ — все жители от 70 лет, без верхней границы. Доли рассчитаны от населения этого набора на 1 января 2024 года и округлены до двух знаков; структура не пересчитывается к численности 2025 года.</figcaption>
    </figure>
    <div className="demography-source"><a href={table.url} target="_blank" rel="noreferrer">Источник: {table.source}</a><span>Проверено {humanDate(table.dateChecked)}</span></div>
    <details className="demography-details"><summary>Таблица и пояснения к источнику</summary><p>{table.scope}</p><p>География: {table.geo}. Период: {table.period}. {table.published?`Опубликовано ${humanDate(table.published)}.`:'Дата публикации в наборе не установлена.'}</p><p>В каждой строке доля мужчин и доля женщин рассчитаны от всех {count.format(table.total)} жителей выбранной территории на ту же дату.</p><div className="demography-table-wrap"><table><caption>Точные численности по полу и возрасту · {table.period}</caption><thead><tr><th scope="col">Возраст</th><th scope="col">Мужчины</th><th scope="col">Женщины</th><th scope="col">Всего</th><th scope="col">Мужчины, %</th><th scope="col">Женщины, %</th><th scope="col">Место в первоисточнике</th></tr></thead><tbody>{bins.map(bin=><tr key={bin.age}><th scope="row">{bin.age.replace('-','–')}</th><td>{count.format(bin.male)}</td><td>{count.format(bin.female)}</td><td>{count.format(bin.total)}</td><td>{percent.format(bin.male/table.total*100)}</td><td>{percent.format(bin.female/table.total*100)}</td><td>{bin.locator}</td></tr>)}</tbody><tfoot><tr><th scope="row">Всего</th><td>{count.format(table.male)}</td><td>{count.format(table.female)}</td><td>{count.format(table.total)}</td><td>{percent.format(table.male/table.total*100)}</td><td>{percent.format(table.female/table.total*100)}</td><td>Сумма всех непересекающихся возрастных групп</td></tr></tfoot></table></div></details>
  </section>;
}
