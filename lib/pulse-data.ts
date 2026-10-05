export type CityKey="spb"|"krd";
export function money(n:number,d=0){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:d}).format(n)}
export function netSalary(monthly:number){let annual=Math.max(0,monthly)*12,previous=0,tax=0;for(const [cap,rate] of [[2400000,.13],[5000000,.15],[20000000,.18],[50000000,.20],[Infinity,.22]]){tax+=Math.max(0,Math.min(annual,cap)-previous)*rate;previous=cap;}return monthly-tax/12;}
export const cities={spb:{name:"Санкт-Петербург",locative:"Петербурге",priceGeo:"Санкт-Петербург"},krd:{name:"Краснодар",locative:"Краснодаре",priceGeo:"Краснодарский край — региональный показатель"}};
