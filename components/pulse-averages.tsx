"use client";
import type {CityKey} from '@/lib/pulse-data';
import {averageObservations} from '@/lib/average-data';

function humanDate(value:string) {
  const parts = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split('-').map(Number)
    : value.split('.').reverse().map(Number);
  return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'})
    .format(new Date(parts[0],parts[1]-1,parts[2])).replace(/\.$/,'');
}

export function AverageSection({city,onUseSalary}:{city:CityKey;onUseSalary:(value:number)=>void}) {
  const rows=averageObservations[city];
  const hasFoodMinimum=rows.some(row=>row.id==='foodMinimum');
  if(!rows.length) return null;

  return <section className="panel average-section">
    <div className="section-heading">
      <div><p className="eyebrow">ОФИЦИАЛЬНЫЕ ОРИЕНТИРЫ</p><h2>Зарплата и расходы</h2></div>
    </div>
    <p className="section-copy">Средняя зарплата — ориентир, а не доход большинства.{hasFoodMinimum&&' Минимальный набор продуктов не равен фактическим расходам на питание.'}</p>
    <div className="average-grid">
      {rows.map(row=>{
        const isSalary=row.id==='salary';
        const isFoodMinimum=row.id==='foodMinimum';
        const number=new Intl.NumberFormat('ru-RU',{minimumFractionDigits:row.decimals,maximumFractionDigits:row.decimals}).format(row.value);
        return <article className="average-card" key={row.id}>
          <h3>{isFoodMinimum?'Минимальный набор продуктов':row.label}</h3>
          {isSalary&&<p className="average-note"><strong>{row.basis==='gross'?'До налога':'До или после налога — не уточнено'}</strong></p>}
          <div className="hero-number">{number}<span>{row.unit}</span></div>
          <p className="average-note"><strong>{row.period}</strong> · {row.geo}</p>
          {row.change!==null&&<p className="average-change">{row.change>0?'+':''}{new Intl.NumberFormat('ru-RU').format(row.change)}% · {row.changeLabel?.toLowerCase()}</p>}
          <p className="section-copy">{row.description}</p>
          {isSalary&&row.basis==='unspecified'&&<p className="average-note">Источник не уточняет, до или после налога указана сумма.</p>}
          {isFoodMinimum&&<p className="average-note">Это стоимость минимального набора продуктов, а не средние фактические траты на питание.</p>}
          <p className="average-note">{row.scope}</p>
          <a className="source-link" href={row.url} target="_blank" rel="noreferrer">Источник: {row.source}</a>
          <p className="average-note">{row.published&&<>Опубликовано {humanDate(row.published)}. </>}Проверено {humanDate(row.dateChecked)}.</p>
          {isSalary&&row.basis==='gross'&&<>
            <button type="button" className="outline-button" onClick={()=>onUseSalary(row.value)}>Подставить зарплату в бюджет</button>
            <p className="average-note">В поле дохода будет подставлена сумма до налога. Свои расходы укажите отдельно.</p>
          </>}
        </article>;
      })}
    </div>
    <p className="average-note">Официальные ориентиры относятся к 2025 году, цены жилья — к 2026 году. Расходы на жизнь указываются в личном бюджете ниже.</p>
  </section>;
}
