"use client";
import {Tooltip,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
import {Info} from 'lucide-react';
import {money} from '@/lib/pulse-data';
import type {Observation} from '@/lib/real-data';

function humanDate(value:string) {
  const parts = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split('-').map(Number)
    : value.split('.').reverse().map(Number);
  return new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long',year:'numeric'})
    .format(new Date(parts[0], parts[1]-1, parts[2]));
}

export function RecordMeta({data}:{data:Observation}) {
  return <div className="data-meta">
    <span>{data.period}</span>
    <a className="source-link" href={data.url} target="_blank" rel="noreferrer">Источник: ЦИАН</a>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="info-button" aria-label={`Подробнее о показателе: ${data.label}`}><Info size={14}/></button>
      </TooltipTrigger>
      <TooltipContent className="metric-tooltip">
        {data.source} · {data.geo}<br/>
        Опубликовано: {humanDate(data.published)}<br/>
        Проверено: {humanDate(data.dateChecked)}<br/>
        {data.scope}
      </TooltipContent>
    </Tooltip>
  </div>;
}

export function ObservationCard({data,label,reason}:{data?:Observation;label?:string;reason?:string}) {
  const change = data?.change;
  return <article className="kpi">
    <div className="kpi-label">{label??data?.label}</div>
    <div className={`kpi-value ${data?'':'missing-value'}`}>
      {data?money(data.value,data.unit.includes('%')?2:0):'Нет данных'}
      {data&&<span>{data.unit}</span>}
    </div>
    <p className="kpi-change">{change!=null
      ? `${change>0?'+':''}${money(change,1)}% к тому же месяцу прошлого года`
      : 'Изменение в источнике не указано'}</p>
    <p className="kpi-meta">{data?data.geo:reason??'Проверенный показатель отсутствует'}</p>
    {data?<RecordMeta data={data}/>:<div className="data-meta">Источник значения отсутствует</div>}
  </article>;
}
