"use client";
import {useEffect,useState} from 'react';
import {flushSync} from 'react-dom';
import {ArrowRight,Info,SlidersHorizontal} from 'lucide-react';
import {Tabs,TabsContent} from '@/components/ui/tabs';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {TooltipProvider} from '@/components/ui/tooltip';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {cities,money,netSalary,type CityKey} from '@/lib/pulse-data';
import {observation} from '@/lib/real-data';
import {averageObservation} from '@/lib/average-data';
import {AverageSection} from '@/components/pulse-averages';
import {WorkSection,PopulationSection} from '@/components/pulse-extended';
import {HousingSection} from '@/components/pulse-sections';
import {SourceContent} from '@/components/pulse-sources';
import {CityPublicationShell,CityPortraitOverview,CityMediaCredits} from '@/components/city-publication';
import {AdditionalSection,AdditionalSources} from '@/components/additional-section';

type BudgetDraft={custom:Record<string,number>;basis:string;salaryPreset:boolean};
const emptyDraft=():BudgetDraft=>({custom:{},basis:'net',salaryPreset:false});

export default function Home(){
  const [city,setCity]=useState<CityKey>('spb');
  const [view,setView]=useState('overview');
  const [sources,setSources]=useState(false);
  const [edit,setEdit]=useState(true);
  const [drafts,setDrafts]=useState<Record<CityKey,BudgetDraft>>({spb:emptyDraft(),krd:emptyDraft()});
  const {custom,basis,salaryPreset}=drafts[city];
  const updateDraft=(patch:Partial<BudgetDraft>)=>setDrafts(previous=>({...previous,[city]:{...previous[city],...patch}}));
  const go=(next:string,focusContent=true)=>{if(focusContent&&next==='budget')setEdit(true);setView(next);window.scrollTo({top:0,behavior:'instant'});if(focusContent)requestAnimationFrame(()=>document.querySelector<HTMLElement>('[data-state=active][role=tabpanel] h1')?.focus({preventScroll:true}));};
  const d=cities[city],averageSalary=averageObservation(city,'salary'),rentData=observation(city,'rent1');
  const income=custom.income;
  const net=income!=null&&income>0?(basis==='gross'?netSalary(income):income):null;
  const rent=custom.rent??rentData?.value;
  const fields=[{id:'rent',name:'Аренда',v:rent},{id:'utilities',name:'ЖКХ',v:custom.utilities},{id:'food',name:'Продукты',v:custom.food},{id:'transport',name:'Транспорт',v:custom.transport},{id:'connection',name:'Связь и интернет',v:custom.connection}];
  const ready=net!=null&&fields.every(field=>field.v!=null);
  const costs=ready?fields.reduce((sum,field)=>sum+field.v!,0):null;
  const left=ready?net!-costs!:null;
  const rankedExpenses=[...fields].sort((a,b)=>(b.v??0)-(a.v??0));
  const largest=rankedExpenses[0],expenseScale=Math.max(net??0,...fields.map(field=>field.v??0),1);
  const setAmount=(id:string,raw:string)=>updateDraft({custom:{...custom,[id]:raw===''?undefined as unknown as number:Math.max(0,Math.min(10000000,Number(raw)))},...(id==='income'?{salaryPreset:false}:{})});

  useEffect(()=>{
    type MC={registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown};
    const mc=(document as Document&{modelContext?:MC}).modelContext;
    if(!mc)return;
    const life=new AbortController();
    const tool={
      name:'configure_city_budget',title:'Рассчитать личный бюджет',
      description:'Выбрать город и рассчитать личный месячный бюджет из введённых сумм. Не меняет статистику города и не сохраняет данные вне страницы.',
      inputSchema:{type:'object',properties:{city:{type:'string',enum:['spb','krd']},basis:{type:'string',enum:['gross','net']},income:{type:'number',exclusiveMinimum:0,maximum:10000000},rent:{type:'number',minimum:0,maximum:10000000},utilities:{type:'number',minimum:0,maximum:10000000},food:{type:'number',minimum:0,maximum:10000000},transport:{type:'number',minimum:0,maximum:10000000},connection:{type:'number',minimum:0,maximum:10000000}},required:['city','basis','income','rent','utilities','food','transport','connection'],additionalProperties:false},
      annotations:{readOnlyHint:false},execute:(input:unknown)=>{
        const values=input as Record<string,unknown>,keys=['income','rent','utilities','food','transport','connection'];
        if(!values||!['spb','krd'].includes(String(values.city))||!['gross','net'].includes(String(values.basis))||!keys.every(key=>typeof values[key]==='number'&&Number.isFinite(values[key])&&(values[key] as number)>=0&&(values[key] as number)<=10000000)||(values.income as number)<=0||Object.keys(values).some(key=>!['city','basis',...keys].includes(key)))throw new Error('Некорректный сценарий');
        const custom=Object.fromEntries(keys.map(key=>[key,values[key] as number]));
        const net=values.basis==='gross'?netSalary(custom.income):custom.income;
        const costs=keys.filter(key=>key!=='income').reduce((sum,key)=>sum+custom[key],0),city=values.city as CityKey;
        flushSync(()=>{setCity(city);setDrafts(previous=>({...previous,[city]:{custom,basis:values.basis as string,salaryPreset:false}}));setView('budget');setEdit(true);});
        return{city:values.city,net_income:net,expenses:costs,remainder:net-costs,status:'user_scenario',quality:'D'};
      },
    };
    try{Promise.resolve(mc.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}
    return()=>life.abort();
  },[]);

  return <TooltipProvider delayDuration={200}><Tabs value={view} onValueChange={value=>go(value,false)} className="app-shell">
    <CityPublicationShell city={city} view={view} onCityChange={setCity} onNavigate={go}>
      <TabsContent value="overview"><CityPortraitOverview city={city} net={net} costs={costs} remainder={left} onNavigate={go}/></TabsContent>
        <TabsContent value="work"><div className="page-heading"><div><p className="eyebrow">{d.name} / РАБОТА</p><h1 tabIndex={-1}>Работа и зарплаты</h1><p className="subheading">Фактический заработок, предложения работодателей и безработица — отдельные срезы.</p></div></div><WorkSection city={city}/><AverageSection city={city} onUseSalary={value=>{updateDraft({custom:{...custom,income:value},basis:'gross',salaryPreset:true});setEdit(true);go('budget');}}/></TabsContent>
        <TabsContent value="housing"><div className="page-heading"><div><p className="eyebrow">{d.name} / ЖИЛЬЁ</p><h1 tabIndex={-1}>Сколько стоит жильё</h1><p className="subheading">Аренда, покупка и соотношение цен с вашим доходом.</p></div></div><HousingSection city={city} net={net} onBudget={()=>{setEdit(true);go('budget');}}/></TabsContent>
        <TabsContent value="budget">
          <div className="page-heading"><div><p className="eyebrow">{d.name} / ЛИЧНЫЙ СЦЕНАРИЙ</p><h1 tabIndex={-1}>Расходы и бюджет</h1><p className="subheading">Ваш доход. Ваши расходы. Понятный остаток.</p></div></div>
          <div className="budget-layout">
            <section id="personal-budget" className={`budget-outcome ${!ready?"budget-pending":""} ${ready&&left!<0?'budget-deficit':''}`} aria-label="Результат расчёта"><p className="eyebrow">{ready?(left!<0?'НЕ ХВАТАЕТ В МЕСЯЦ':'ОСТАЁТСЯ В МЕСЯЦ'):'ОСТАТОК ПОСЛЕ РАСХОДОВ'}</p><p className="budget-hero-value" aria-live="polite" aria-atomic="true">{ready?<><span className="visually-hidden">{left!<0?"Не хватает ":"Остаётся "}</span>{money(Math.abs(left!))}<span> ₽</span></>:'Пока не рассчитан'}</p><p className="budget-outcome-caption">{ready?(left!<0?'Указанные расходы превышают ваш доход.':'По введённым вами суммам. Это личный сценарий.'):'Введите доход и заполните расходы. Нулевые расходы укажите явно.'}</p>{ready&&<><div className="budget-totals"><div><span>Доход на руки</span><strong>{money(net!)} ₽</strong></div><div><span>Все расходы</span><strong>{money(costs!)} ₽</strong></div></div><p className="budget-share">{left!>=0?'Доля остатка':'Доля дефицита'} — {money(Math.abs(left!)/net!*100,1)}% от дохода на руки.</p></>}<p className="budget-privacy">Черновик отдельный для каждого города. Суммы хранятся только в памяти этой страницы и исчезнут при перезагрузке.</p></section>
            <section className="panel budget-editor-panel"><div className="section-heading"><div><p className="eyebrow">ЗА ОДИН МЕСЯЦ</p><h2>Ваши суммы</h2></div><button className="text-button" onClick={()=>setEdit(!edit)} aria-expanded={edit}><SlidersHorizontal size={16}/>{edit?'Свернуть':'Изменить'}</button></div>{edit&&<div className="scenario-editor"><label>Доход, ₽/мес<input type="number" inputMode="decimal" min="0" max="10000000" value={income??''} placeholder="Введите доход" onChange={event=>setAmount('income',event.target.value)}/></label><label>Доход указан<NativeSelect value={basis} onChange={event=>updateDraft({basis:event.target.value,salaryPreset:false})} aria-label="Доход до налога или на руки"><NativeSelectOption value="net">На руки</NativeSelectOption><NativeSelectOption value="gross">До налога</NativeSelectOption></NativeSelect></label>{fields.map(field=><label key={field.id}>{field.name}, ₽/мес<input type="number" inputMode="decimal" min="0" max="10000000" value={field.v??''} placeholder="Укажите сумму или 0" onChange={event=>setAmount(field.id,event.target.value)}/>{field.id==='rent'&&custom.rent===undefined&&rentData&&<small>Подставлена средняя аренда 1-к в объявлениях · {rentData.period}. Можно изменить.</small>}</label>)}<button className="text-button budget-reset" onClick={()=>updateDraft(emptyDraft())}>Сбросить введённые суммы</button></div>}{salaryPreset&&averageSalary&&<p className="budget-preset">Подставлена средняя начисленная зарплата: {averageSalary.period.toLowerCase()}, {averageSalary.geo}. Она не описывает доход типичного жителя. Расходы укажите самостоятельно.</p>}<details className="budget-assumptions"><summary>Что учтено в расчёте</summary><p>Остаток = доход на руки − сумма указанных расходов. Расчёт включает только пять статей, перечисленных в форме. Для дохода до налога предполагается одинаковая зарплата весь год; применяется сохранённая прогрессивная шкала НДФЛ без вычетов. Аренда из источника — средняя цена однокомнатной квартиры в объявлениях, а не ваш обязательный расход.</p><button className="text-button" onClick={()=>setSources(true)}>Источник налоговой модели <ArrowRight size={14}/></button></details></section>
          </div>
          {ready&&<section className="panel spending-panel"><div className="section-heading"><div><p className="eyebrow">ПО ВАШИМ ДАННЫМ</p><h2>Куда уходят деньги</h2></div><span className="panel-tag">₽/месяц · % от дохода на руки</span></div><div className="spending-axis"><span>0 ₽</span><span>{money(expenseScale)} ₽/месяц</span></div><div className="spending-chart">{rankedExpenses.map(field=><div className="spending-row" key={field.id}><div className="spending-label"><span>{field.name}</span><strong>{money(field.v!)} ₽ <small>· {money(field.v!/net!*100,1)}%</small></strong></div><div className="spending-track"><span style={{width:`${field.v!/expenseScale*100}%`}}/></div></div>)}</div><p className="spending-caption">{largest.v!>0?<>Самая большая из указанных статей — {largest.name.toLowerCase()}: {money(largest.v!/net!*100,1)}% вашего дохода на руки.</>:'Все указанные расходы равны нулю.'} Все полосы используют единую шкалу в рублях. Проценты рассчитаны от дохода на руки.</p></section>}
        </TabsContent>
        <TabsContent value="population"><div className="page-heading"><div><p className="eyebrow">{d.name} / ЛЮДИ</p><h1 tabIndex={-1}>Население</h1><p className="subheading">Сколько людей живёт в городе и как устроена его возрастная структура.</p></div></div><PopulationSection city={city}/></TabsContent>
        <TabsContent value="additional"><div className="page-heading"><div><p className="eyebrow">{d.name} / УСЛОВИЯ ЖИЗНИ</p><h1 tabIndex={-1}>Дополнительно</h1><p className="subheading">Транспорт, районы, образование, культура и наблюдаемые изменения.</p></div></div><AdditionalSection city={city}/></TabsContent>
        <TabsContent value="sources"><div className="page-heading"><div><p className="eyebrow">ПРОВЕРЯЕМЫЕ ДАННЫЕ</p><h1 tabIndex={-1}>Источники и методика</h1><p className="subheading">Что измерено, где опубликовано и как проверить каждое число.</p></div></div><div className="panel sources-page"><SourceContent/><AdditionalSources/><CityMediaCredits city={city}/></div></TabsContent>
    </CityPublicationShell>
    <Sheet open={sources} onOpenChange={setSources}><SheetContent className="source-sheet"><SheetHeader><SheetTitle>Как читать данные</SheetTitle><SheetDescription>Источники, периоды и ограничения показателей</SheetDescription></SheetHeader><SourceContent/></SheetContent></Sheet>
  </Tabs></TooltipProvider>;
}
