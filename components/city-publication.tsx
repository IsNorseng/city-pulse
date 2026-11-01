"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowRight,ArrowUpRight,BookOpen,Briefcase,Building2,CirclePlus,House,Menu,Search,ShoppingCart,Users,Wallet,X} from 'lucide-react';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {cities,money,type CityKey} from '@/lib/pulse-data';
import {observation} from '@/lib/real-data';
import {cityPortraits,portraitStats} from '@/lib/city-portraits';
import media from '@/data/portrait-media.json';
import {MiniWork,MiniHousing,MiniBudget,MiniPopulation} from './city-portrait-previews';
import './city-publication.css';

const sections=[
  {id:'overview',name:'Обзор',icon:House,terms:'главная город портрет пульс'},
  {id:'work',name:'Работа',icon:Briefcase,terms:'зарплата зарплаты зп заработок вакансии hh хх безработица отрасли'},
  {id:'housing',name:'Жильё',icon:Building2,terms:'квартира квартиры аренда покупка цена метр недвижимость'},
  {id:'budget',name:'Расходы',icon:ShoppingCart,terms:'бюджет калькулятор деньги доход продукты жкх транспорт связь остаток'},
  {id:'population',name:'Население',icon:Users,terms:'люди демография возраст мужчины женщины миграция'},
  {id:'additional',name:'Дополнительно',icon:CirclePlus,terms:'ещё транспорт пробки яндекс медицина клиники врачи образование вузы университет рейтинг культура общение безопасность преступность районы условия перспективы изменения тренд'},
  {id:'sources',name:'Источники',icon:BookOpen,terms:'методика методология проверка данные ссылки фото лицензии'},
];

function Wordmark({onHome}:{onHome:()=>void}){
  return <a href="#" className="publication-wordmark" aria-label="Житие — главная" onClick={event=>{event.preventDefault();onHome();}}><strong>житие<span aria-hidden="true">.</span></strong><span className="publication-descriptor">Документальные<br/>портреты городов<br/>в цифрах</span></a>;
}

function CitySelect({city,onChange,id}:{city:CityKey;onChange:(city:CityKey)=>void;id:string}){
  return <label className="publication-city-select" htmlFor={id}><span className="visually-hidden">Город</span><select id={id} value={city} onChange={event=>onChange(event.target.value as CityKey)}>{Object.entries(cities).map(([key,place])=><option key={key} value={key}>{place.name}</option>)}</select></label>;
}

function CityList({city,onChange}:{city:CityKey;onChange:(city:CityKey)=>void}){
  return <div className="publication-city-list" role="group" aria-label="Выбрать город"><p>Выбрать город</p>{Object.entries(cities).map(([key,place])=><button key={key} type="button" aria-pressed={city===key} onClick={()=>onChange(key as CityKey)}><span aria-hidden="true"/>{place.name}</button>)}</div>;
}

export function CityMediaCredits({city}:{city:CityKey}){
  const photo=media.photos[city],life=media.chapterPhotos[city],housing=media.housingPhotos[city];
  return <section className="publication-credits"><h2>Фотография и шрифты</h2><p><a href={photo.sourceURL} target="_blank" rel="noreferrer">{photo.title}</a> · {photo.author}. Год съёмки: {photo.capturedAt.slice(0,4)}. <a href={photo.licenseURL} target="_blank" rel="noreferrer">{photo.licenseName}</a>. Кадрирование в интерфейсе.</p><p><a href={life.sourceURL} target="_blank" rel="noreferrer">{life.title}</a> · {life.author}. Снимок {life.capturedAt.slice(0,4)} года. <a href={life.licenseURL} target="_blank" rel="noreferrer">{life.licenseName}</a>. Уменьшение и кадрирование; архивная иллюстрация.</p><p><a href={housing.sourceURL} target="_blank" rel="noreferrer">{housing.title}</a> · {housing.author}. Снимок {housing.capturedAt.slice(0,4)} года. <a href={housing.licenseURL} target="_blank" rel="noreferrer">{housing.licenseName}</a>. Адаптированное изображение сохраняет эту лицензию.</p><p>Шрифты Prata и Manrope встроены локально. <a href="media-credits.html" target="_blank" rel="noreferrer">Происхождение фотографий и полные лицензии ↗</a></p></section>;
}

function EditionPassport({city,onSources}:{city:CityKey;onSources:()=>void}){
  return <div className="publication-passport-body"><p className="publication-kicker">{cityPortraits[city].edition}</p><p>Сохранённый выпуск о {city==='spb'?'Санкт-Петербурге':'Краснодаре'}. Основные показатели относятся к 2024–2026 годам; исторические материалы датированы отдельно. Дата выпуска не заменяет период наблюдения.</p><dl>{portraitStats(city).map(stat=><div key={stat.key}><dt>{stat.label}</dt><dd><strong>{money(stat.value)} {stat.unit}</strong><span>{stat.period} · {stat.geo}</span><span>{stat.note}</span><a href={stat.url} target="_blank" rel="noreferrer">{stat.source} ↗</a></dd></div>)}</dl><p>Основные показатели проверены 4–7 октября 2026 года; отраслевые зарплаты Петербурга повторно сверены с архивным XLSX 26 октября. Источники и новые выписки дополнительного раздела проверены 29 октября; транспортная справка и фотографии глав — 30 октября. Фотографии главы о жилье проверены 1 ноября. Прежние даты наблюдений сохранены. Автообновления нет.</p><button className="primary-button" onClick={onSources}>Все показатели и методика <ArrowRight size={16}/></button><CityMediaCredits city={city}/></div>;
}

export function CityPublicationShell({city,view,onCityChange,onNavigate,children}:{city:CityKey;view:string;onCityChange:(city:CityKey)=>void;onNavigate:(view:string)=>void;children:ReactNode}){
  const [query,setQuery]=useState('');
  const [mobileSearch,setMobileSearch]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [passport,setPassport]=useState(false);
  const [notice,setNotice]=useState(false);
  const previousCity=useRef(city);
  useEffect(()=>{if(previousCity.current!==city){previousCity.current=city;setNotice(true);setQuery('');}},[city]);
  const hits=query.trim()?sections.filter(section=>`${section.name} ${section.terms}`.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))):[];
  const go=(next:string)=>{setQuery('');setMobileSearch(false);setMobileMenu(false);onNavigate(next);};
  return <div className="city-publication">
    <a href="#publication-content" className="publication-skip">Перейти к содержанию</a>
    <header className="publication-mobilebar"><Wordmark onHome={()=>go('overview')}/><CitySelect city={city} onChange={onCityChange} id="mobile-city"/><button className="publication-search-toggle" onClick={()=>{setMobileSearch(!mobileSearch);setMobileMenu(false);}} aria-expanded={mobileSearch} aria-label="Поиск раздела"><Search size={19}/></button><button className="publication-menu-toggle" onClick={()=>{setMobileMenu(!mobileMenu);setMobileSearch(false);}} aria-expanded={mobileMenu} aria-controls="publication-navigation"><Menu size={18}/><span>Разделы</span><strong>{sections.find(section=>section.id===view)?.name}</strong><ArrowDown size={15}/></button>{mobileSearch&&<div className="publication-mobile-search"><input autoFocus aria-label="Найти раздел на телефоне" placeholder="Найти раздел…" type="search" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setQuery('');setMobileSearch(false);}}}/>{query.trim()&&<div className="publication-search-results">{hits.length?hits.slice(0,5).map(hit=><button key={hit.id} onClick={()=>go(hit.id)}>{hit.name}<ArrowUpRight size={15}/></button>):<p>Раздел не найден.</p>}</div>}</div>}</header>
    <aside className={`publication-rail${mobileMenu?' publication-rail--open':''}`} aria-label="Города и разделы">
      <div className="publication-identity"><Wordmark onHome={()=>go('overview')}/></div>
      <TabsList id="publication-navigation" className="publication-navigation" aria-label="Разделы издания">{sections.map(section=><TabsTrigger key={section.id} value={section.id} aria-label={section.name} onClick={()=>{if(mobileMenu)go(section.id);}} className="publication-nav-item"><section.icon size={21}/><span>{section.name}</span></TabsTrigger>)}</TabsList>
      <div className="publication-rail-tools"><CityList city={city} onChange={onCityChange}/><div className="publication-search"><Search size={17}/><input aria-label="Найти раздел" placeholder="Найти раздел…" type="search" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setQuery('');}} aria-controls="publication-search-results"/></div>{query.trim()&&<div className="publication-search-results" id="publication-search-results" role="region" aria-label="Результаты поиска">{hits.length?hits.slice(0,5).map(hit=><button key={hit.id} onClick={()=>go(hit.id)}>{hit.name}<ArrowUpRight size={15}/></button>):<p>Раздел не найден. Попробуйте «аренда» или «зарплата».</p>}</div>}<p className="publication-rail-motto">Город из людей,<br/>улиц и повседневных<br/>решений.</p><p className="publication-rail-note">Сохранённый выпуск<br/>Ж / 2026</p></div>
    </aside>
    <main className={`publication-main${view==='overview'?' publication-main--cover':''}`} id="publication-content" tabIndex={-1}>
      {notice&&<div className="publication-city-notice" role="status"><p>Выбран {cities[city].name}. Городские показатели изменились; средняя аренда 1-к по источнику — {money(observation(city,'rent1')!.value)} ₽/мес ({observation(city,'rent1')!.period}; <a href={observation(city,'rent1')!.url} target="_blank" rel="noreferrer">ЦИАН ↗</a>). Черновики бюджета каждого города сохранены.</p><button onClick={()=>setNotice(false)} aria-label="Скрыть сообщение о смене города"><X size={17}/></button></div>}
      <div className="publication-content">{children}</div>
      {view==='overview'?<footer className="publication-editorial-footer"><div className="publication-editorial-note" style={{backgroundImage:`linear-gradient(90deg,#202126e8,#202126b8),url(${cityPortraits[city].photo})`}}><h2>Город в цифрах.<br/>Жизнь в деталях.</h2><p>Проверяемые данные и понятный контекст. Решение остаётся за вами.</p><span>{cityPortraits[city].edition}</span></div><button className="publication-passport-button" onClick={()=>setPassport(true)}><span className="publication-passport-action">Паспорт выпуска <ArrowRight size={22}/></span><strong>{cities[city].name}</strong><span className="publication-passport-contents">Периоды наблюдений<br/>Территория и определения<br/>Источники и методика</span><small>Сохранённый выпуск · 2026</small></button><div className="publication-footer-photo"><img src={cityPortraits[city].photo} alt="" loading="lazy"/></div></footer>:<footer className="publication-simple-footer"><span>Житие · {cityPortraits[city].edition}</span><button className="text-button" onClick={()=>setPassport(true)}>Паспорт выпуска <ArrowUpRight size={16}/></button><a href="methodology.html" target="_blank" rel="noreferrer">Методика и источники ↗</a></footer>}
    </main>
    <Sheet open={passport} onOpenChange={setPassport}><SheetContent className="source-sheet"><SheetHeader><SheetTitle>Паспорт выпуска</SheetTitle><SheetDescription>{cities[city].name} · периоды, территории и происхождение</SheetDescription></SheetHeader><EditionPassport city={city} onSources={()=>{setPassport(false);go('sources');}}/></SheetContent></Sheet>
  </div>;
}

export function CityPortraitOverview({city,net,costs,remainder,onNavigate}:{city:CityKey;net:number|null;costs:number|null;remainder:number|null;onNavigate:(view:string)=>void}){
  const portrait=cityPortraits[city],photo=media.photos[city],life=media.chapterPhotos[city],housing=media.housingPhotos[city];
  const [allSections,setAllSections]=useState(false);
  const topics=[
    {id:'work',number:'01',label:'Работа',heading:'Сколько платят за работу?',description:city==='spb'?'Зарплаты по отраслям, рынок труда и предложения работодателей.':'Зарплатные ориентиры, предложения работодателей и ожидания соискателей.',position:'15% 50%'},
    {id:'housing',number:'02',label:'Жильё',heading:'Почём свой угол?',description:'Аренда и покупка. Цены, динамика и ваш доход.',position:'80% 48%'},
    {id:'budget',number:'03',label:'Расходы',heading:'Сколько стоит здесь жить?',description:'Продукты, транспорт и личный калькулятор бюджета.',position:'40% 78%'},
    {id:'population',number:'04',label:'Население',heading:'Кто живёт в городе?',description:'Численность, возрастная структура и изменение населения.',position:'60% 50%'},
  ];
  const statIcons:Record<string,typeof Users>={population:Users,salary:Wallet,rent:House,square:Building2};
  return <>
    <section className={`portrait-cover portrait-cover--${city}`} aria-labelledby="portrait-title">
      <figure className="portrait-panorama"><img src={portrait.photo} alt={photo.alt} style={{objectPosition:portrait.photoPosition}} fetchPriority="high"/><figcaption>{portrait.photoCaption} · <a href={photo.sourceURL} target="_blank" rel="noreferrer">Фото: {photo.author}</a> · <a href={photo.licenseURL} target="_blank" rel="noreferrer">{photo.licenseName}</a></figcaption></figure>
      <div className="portrait-cover-heading"><div className="portrait-edition-line"><p>Выпуск <span>{portrait.edition}</span></p><p>Данные относятся<br/>к разным периодам</p><span className="portrait-edition-city">{cities[city].name}</span></div><h1 id="portrait-title" aria-label={cities[city].name} tabIndex={-1}>{portrait.titleLines.map(line=><span key={line}>{line}</span>)}</h1><p className="portrait-deck">Город, в котором живут.<br/>В цифрах и деталях.</p><a className="portrait-explore" href="#city-facts"><span className="portrait-explore-arrow"><ArrowDown size={24}/></span><span className="portrait-explore-label">Смотреть полный обзор <ArrowRight size={17}/></span></a></div>
    </section>
    <section className="portrait-fact-strip" id="city-facts" aria-label="Четыре показателя города"><dl className="portrait-facts">{portraitStats(city).map(stat=>{const Icon=statIcons[stat.key]??House;return <div className="portrait-fact" key={stat.key}><dt><Icon size={21} aria-hidden="true"/><span>{stat.label}</span></dt><dd><strong>{money(stat.value)}</strong><span className="portrait-fact-unit">{stat.unit}</span><span className="portrait-fact-meta">{stat.period} · <a href={stat.url} target="_blank" rel="noreferrer">{stat.source} ↗</a></span><span className="portrait-fact-note">{stat.note}</span><details><summary>Территория</summary><p>{stat.geo}</p></details></dd></div>;})}</dl></section>
    <section className="portrait-chapters" id="city-stories" aria-labelledby="city-stories-title"><div className="portrait-chapters-heading"><h2 id="city-stories-title">Исследовать город</h2><button type="button" onClick={()=>setAllSections(!allSections)} aria-expanded={allSections} aria-controls="portrait-all-sections">Все разделы <ArrowRight size={18}/></button></div>{allSections&&<nav className="portrait-all-sections" id="portrait-all-sections" aria-label="Все разделы города">{sections.filter(section=>section.id!=='overview').map(section=><button key={section.id} onClick={()=>{setAllSections(false);onNavigate(section.id);}}><section.icon size={18}/>{section.name}<ArrowUpRight size={16}/></button>)}</nav>}
      <div className="portrait-stories">{topics.map(topic=><article className={`portrait-story portrait-story--${topic.id}`} key={topic.id}><a className="portrait-story-link" href="#publication-content" onClick={event=>{event.preventDefault();onNavigate(topic.id);}} aria-label={`${topic.label}: ${topic.heading}`}><div className="portrait-story-top"><span>{topic.number}</span><p>{topic.label}</p><span className="portrait-story-arrow" aria-hidden="true"><ArrowUpRight size={17}/></span></div><h3>{topic.heading}</h3><p className="portrait-story-description">{topic.description}</p><img className="portrait-chapter-photo" src={topic.id==='housing'?portrait.housingPhoto:topic.id==='population'?portrait.photo:portrait.lifePhoto} alt="" loading="lazy" style={{objectPosition:topic.id==='housing'?'50% 45%':topic.id==='budget'?'30% 72%':topic.position}}/></a><details className="portrait-preview"><summary>Коротко в цифрах</summary>{topic.id==='work'?<MiniWork city={city} onNavigate={()=>onNavigate('work')}/>:topic.id==='housing'?<MiniHousing city={city} onNavigate={()=>onNavigate('housing')}/>:topic.id==='budget'?<MiniBudget city={city} net={net} costs={costs} remainder={remainder} onNavigate={()=>onNavigate('budget')}/>:<MiniPopulation city={city} onNavigate={()=>onNavigate('population')}/>}</details></article>)}</div>
    </section>
    <p className="portrait-photo-note">Фото глав: <a href={life.sourceURL} target="_blank" rel="noreferrer">{life.author} · {life.capturedAt.slice(0,4)}</a> · <a href={life.licenseURL} target="_blank" rel="noreferrer">{life.licenseName}</a>.  Снимок жилья: <a href={housing.sourceURL} target="_blank" rel="noreferrer">{housing.author} · {housing.capturedAt.slice(0,4)}</a> · <a href={housing.licenseURL} target="_blank" rel="noreferrer">{housing.licenseName}</a>. Масштабирование и кадрирование. <a href="media-credits.html" target="_blank" rel="noreferrer">Все фотографии и лицензии ↗</a></p><p className="portrait-reading-note">Зарплата в вакансии — предложение работодателя; цена объявления — предложение собственника. Периоды показателей различаются. Личный бюджет рассчитывается по вашим суммам. <a href="methodology.html" target="_blank" rel="noreferrer">Как читать данные ↗</a></p>
  </>;
}
