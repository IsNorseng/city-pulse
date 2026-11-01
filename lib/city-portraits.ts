import spbPhoto from '@/assets/photos/spb-neva.jpg';
import krdPhoto from '@/assets/photos/krd-park.jpg';
import spbLifePhoto from '@/assets/photos/spb-cafe-singer-2014.jpg';
import krdLifePhoto from '@/assets/photos/krd-krasnaya-2016.jpg';
import spbHousingPhoto from '@/assets/photos/spb-facade-2025.jpg';
import krdHousingPhoto from '@/assets/photos/krd-housing-2019.jpg';
import {cities,type CityKey} from './pulse-data';
import {findExtendedFact} from './extended-data';
import {observation} from './real-data';

/** Presentation settings only. Statistical values remain in the verified datasets. */
export const cityPortraits:Record<CityKey,{
  edition:string; titleLines:string[]; photo:string; lifePhoto:string; housingPhoto:string; photoPosition:string; photoCaption:string;
}>= {
  spb:{edition:'Ж / СПБ / 001',titleLines:['Санкт-','Петербург'],photo:spbPhoto,lifePhoto:spbLifePhoto,housingPhoto:spbHousingPhoto,photoPosition:'50% 43%',photoCaption:'Нева и исторический центр · снимок 2007 года'},
  krd:{edition:'Ж / КРД / 001',titleLines:['Краснодар'],photo:krdPhoto,lifePhoto:krdLifePhoto,housingPhoto:krdHousingPhoto,photoPosition:'50% 48%',photoCaption:'Парк «Краснодар» и стадион · снимок 2018 года'},
};

export type PortraitStat={
  key:string; label:string; value:number; unit:string; period:string; geo:string;
  note:string; source:string; url:string;
};

export function portraitStats(city:CityKey):PortraitStat[]{
  const population=findExtendedFact(city,'population');
  const salary=findExtendedFact(city,'offeredMedian');
  const rent=observation(city,'rent1');
  const square=observation(city,'sqm');
  const rows:PortraitStat[]=[];
  if(population?.value!=null && population.geoLevel===(city==='krd'?'city':'federal_subject')) rows.push({
    key:'population',label:'Население',value:population.value,unit:'человек',period:population.period,
    geo:population.geo,note:city==='krd'?'Сам населённый пункт, без подчинённых сельских поселений.':'Вся административная территория Санкт-Петербурга.',source:population.source,url:population.url,
  });
  if(salary?.value!=null && salary.geoLevel==='city') rows.push({
    key:'salary',label:'Медиана зарплат в вакансиях HH',value:salary.value,unit:'₽/мес',period:salary.period,
    geo:salary.geo,note:'Медиана HH. До или после налога — не уточнено.',source:'HH Статистика',url:salary.url,
  });
  if(rent) rows.push({key:'rent',label:'Средняя аренда 1-к',value:rent.value,unit:rent.unit,period:rent.period,geo:rent.geo,note:'Цены объявлений, без элитного сегмента.',source:'ЦИАН',url:rent.url});
  if(square) rows.push({key:'square',label:'Средняя цена м²',value:square.value,unit:square.unit,period:square.period,geo:square.geo,note:'Предложения на вторичном рынке.',source:'ЦИАН',url:square.url});
  return rows;
}

export function portraitName(city:CityKey){return cities[city].name;}
