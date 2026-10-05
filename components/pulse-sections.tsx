"use client";
import {useState} from 'react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {money,type CityKey} from '@/lib/pulse-data';
import {observation} from '@/lib/real-data';
import {ObservationCard,RecordMeta} from './pulse-records';

export function HousingSection({city,net}:{city:CityKey;period?:string;net:number|null}) {
  const [market,setMarket]=useState('rent');
  const [room,setRoom]=useState('1');
  const availableRooms=market==='rent'?['1','2']:['1'];
  const data=observation(city,market==='rent'?'rent'+room:'sale1');
  const rent=observation(city,'rent1'),sqm=observation(city,'sqm'),sale=observation(city,'sale1');
  const scope=market==='rent'
    ? 'Средняя ставка в объявлениях о долгосрочной аренде. Элитные квартиры не учитываются.'
    : 'Средняя стоимость однокомнатной квартиры на вторичном рынке по расчёту ЦИАН. Источник не уточняет, взята ли цена из объявлений или состоявшихся продаж.';

  return <>
    <div className="section-kpis">
      <ObservationCard data={rent} label="Средняя аренда однокомнатной"/>
      <ObservationCard data={sqm} label="Средняя цена квадратного метра"/>
      <ObservationCard data={sale} label="Средняя стоимость однокомнатной"/>
    </div>
    <section className="panel">
      <div className="section-heading">
        <div><p className="eyebrow">ПО ДАННЫМ ЦИАН</p><h2>Аренда и покупка квартиры</h2></div>
        <Tabs value={market} onValueChange={value=>{setMarket(value);setRoom('1');}}>
          <TabsList className="mode-tabs"><TabsTrigger value="rent">Аренда</TabsTrigger><TabsTrigger value="sale">Покупка</TabsTrigger></TabsList>
        </Tabs>
      </div>
      <div className="chart-toolbar">
        {market==='rent'
          ? <div className="room-picker"><span>Комнат</span><Tabs value={room} onValueChange={setRoom}><TabsList className="period-tabs">{availableRooms.map(value=><TabsTrigger key={value} value={value}>{value}</TabsTrigger>)}</TabsList></Tabs></div>
          : <span className="panel-tag">Однокомнатная · вторичный рынок</span>}
        <span className="panel-tag">{market==='rent'?'Средняя аренда в объявлениях':'Средняя стоимость по расчёту ЦИАН'}</span>
      </div>
      {data&&<>
        <div className="hero-number">{money(data.value)}<span>{data.unit}</span></div>
        <p className="section-copy">{scope}</p>
        <RecordMeta data={data}/>
      </>}
      <Table className="metrics-table">
        <TableHeader><TableRow><TableHead>Квартира</TableHead><TableHead>{market==='rent'?'Средняя аренда, ₽/месяц':'Средняя стоимость, ₽'}</TableHead><TableHead>Период</TableHead></TableRow></TableHeader>
        <TableBody>{availableRooms.map(value=>{
          const row=observation(city,market==='rent'?'rent'+value:'sale1');
          return row&&<TableRow key={value}><TableCell>{value==='1'?'Однокомнатная':'Двухкомнатная'}</TableCell><TableCell>{money(row.value)}</TableCell><TableCell>{row.period}</TableCell></TableRow>;
        })}</TableBody>
      </Table>
      <p className="model-note">Это средние значения, а не медианы. Число объявлений в городских выборках источник не сообщает.</p>
    </section>
    <section className="panel">
      <h2>Сравните цены со своим доходом</h2>
      <p className="section-copy">Расчёт использует ваш доход после налога, введённый в Обзоре, и опубликованные средние цены.</p>
      <div className="stat-line"><span>Доля дохода на аренду однокомнатной</span><strong>{net&&rent?money(rent.value/net*100,1)+'%':'Введите доход в Обзоре'}</strong></div>
      <div className="stat-line"><span>Стоимость однокомнатной / годовой доход</span><strong>{net&&sale?money(sale.value/(net*12),1)+' ×':'Введите доход в Обзоре'}</strong></div>
      <div className="stat-line"><span>Квадратных метров на сумму годового дохода</span><strong>{net&&sqm?money(net*12/sqm.value,1)+' м²':'Введите доход в Обзоре'}</strong></div>
      <p className="model-note">Аренда и цена м² — сентябрь 2026, стоимость квартиры — январь 2026. Это разные срезы, а не текущие цены. Расчёт не показывает срок накопления: расходы на жизнь, ипотека, расходы на покупку и изменение цен не учтены.</p>
    </section>
  </>;
}
