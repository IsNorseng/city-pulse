import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const dataset = read('data/verified-observations.json');
const evidence = read('data/evidence/cian-direct-audit.json');
const accepted = new Map(evidence.facts.map(f => [`${f.cityKey}:${f.id}`,f]));
const sources = new Map(evidence.sources.map(s => [s.id,s]));
const seen = new Set();
const isoPublished = dotDate => dotDate.split('.').reverse().join('-');

for (const row of dataset.observations) {
  const key = `${row.cityKey}:${row.id}`;
  assert(!seen.has(key), `Duplicate observation: ${key}`);
  seen.add(key);
  const fact = accepted.get(key);
  const source = sources.get(row.evidenceId);
  assert(fact && source, `No primary evidence: ${key}`);
  assert(fact.status.startsWith('verified_direct_original'), `Unverified fact: ${key}`);
  assert(source.status.startsWith('verified_direct_original'), `Unverified source: ${key}`);
  assert.equal(row.verification,'direct_primary');
  assert.equal(row.value,fact.value);
  assert(Number.isFinite(row.value) && row.value > 0, `Invalid value: ${key}`);
  assert.equal(row.city,fact.city);
  assert.equal(row.geo,fact.city);
  assert.equal(row.geoLevel,'city');
  assert.equal(row.evidenceId,fact.source_id);
  assert.equal(row.url,source.URL);
  assert.equal(row.periodKey,fact.period);
  assert.equal(row.periodPrecision,'month');
  assert(!('date' in row), `Month must not masquerade as an exact day: ${key}`);
  assert.equal(isoPublished(row.published),fact.published);
  assert.equal(row.dateChecked,fact.verified_at);
  assert.equal(row.dateChecked,dataset.checkedAt);
  assert.equal(row.locator,fact.locator);
  assert.equal(row.aggregation,'mean');
  assert.equal(row.quality,'C');
  assert.equal(row.frequency,'publication_snapshot');
  assert.equal(row.sampleSize,null);
  const expectedUnit = row.id === 'sqm' ? '₽/м²' : row.id.startsWith('rent') ? '₽/мес' : '₽';
  assert.equal(row.unit,expectedUnit);
  const factor = fact.source_unit.includes('million') ? 1_000_000 : 1_000;
  assert.equal(Math.round(fact.source_value*factor),row.value);
  assert.equal(row.change,fact.change_yoy_percent ?? null);
  assert.equal(row.priceBasis,row.id === 'sale1' ? 'unspecified' : 'offer');
  assert.equal(row.rooms,row.id === 'sqm' ? null : Number(row.id.at(-1)));
  assert.equal(row.segment,['sqm','sale1'].includes(row.id) ? 'secondary' : 'all');
  const originalRow = source.exact_numeric_rows.find(r => r.city === row.city);
  const column = row.id === 'rent1' ? 'rent_1_thousand_RUB_month' : row.id === 'rent2' ? 'rent_2_thousand_RUB_month' : row.id === 'sqm' ? 'mean_price_thousand_RUB_sqm' : 'mean_sale_1_million_RUB_jan_2026';
  assert(originalRow, `Original city row missing: ${key}`);
  assert.equal(originalRow.row_numeric_cells[originalRow.columns.indexOf(column)],fact.source_value);
  if(row.change != null){
    const changeColumn = row.id === 'sqm' ? 'yoy_percent' : `${row.id === 'rent1' ? 'rent_1' : 'rent_2'}_yoy_percent`;
    assert.equal(originalRow.row_numeric_cells[originalRow.columns.indexOf(changeColumn)],row.change);
  }
}

assert.equal(seen.size,accepted.size,'Accepted observations and app data differ');
const loader = fs.readFileSync(path.join(root,'lib/real-data.ts'),'utf8');
assert(loader.includes('verified-observations.json'),'App must use the verified dataset');
assert(!/wagePoints|wageIndustries|115412|5652900|1154900|29346\.72|25976\.62/.test(loader),'Excluded statistics returned');

const averageDataset = read('data/verified-averages.json');
const averageEvidence = read('data/evidence/official-average-audit.json');
assert.equal(averageDataset.checkedAt,'2026-10-05');
assert.equal(averageEvidence.checkedAt,averageDataset.checkedAt);
assert.equal(averageDataset.updatePolicy,'frozen');

const officialSources = new Map();
const officialFacts = new Map();
const cityByGeo = new Map([
  ['Санкт-Петербург','spb'],
  ['Город Краснодар (муниципальное образование)','krd'],
]);
for(const source of averageEvidence.sources) {
  assert(!officialSources.has(source.id),`Duplicate official source: ${source.id}`);
  assert(/^verified_direct_primary_(pdf|html)$/.test(source.status),`Unverified official source: ${source.id}`);
  assert.equal(source.verifiedAt,averageDataset.checkedAt);
  officialSources.set(source.id,source);
  for(const fact of source.facts) {
    const cityKey = cityByGeo.get(fact.geo);
    assert(cityKey,`No accepted city geography: ${fact.geo}`);
    const key = `${cityKey}:${fact.id}`;
    assert(!officialFacts.has(key),`Duplicate official fact: ${key}`);
    officialFacts.set(key,{fact,source});
  }
}

const officialSeen = new Set();
const acceptedPeriods = new Map([
  ['январь–ноябрь','Январь–ноябрь'],
  ['цены декабря','Цены декабря'],
  ['полный год',null],
]);
for(const row of averageDataset.observations) {
  const key = `${row.cityKey}:${row.id}`;
  assert(!officialSeen.has(key),`Duplicate official observation: ${key}`);
  officialSeen.add(key);
  const accepted = officialFacts.get(key);
  assert(accepted,`No direct official evidence: ${key}`);
  const {fact,source} = accepted;
  assert.equal(row.evidenceId,source.id);
  assert.equal(officialSources.get(row.evidenceId),source);
  assert.equal(row.verification,'direct_primary');
  assert.equal(row.dateChecked,averageDataset.checkedAt);
  assert.equal(row.published,source.published);
  assert.equal(row.geo,fact.geo);
  assert.equal(row.geoLevel,row.cityKey==='spb'?'federal_subject':'city');
  assert(!/Краснодарский край|Ленинградская область/.test(row.geo),`Region cannot replace a city: ${key}`);
  assert.equal(row.unit,'₽/мес');
  assert(/месяц/.test(fact.rawUnit),`Monthly unit not established by evidence: ${key}`);
  assert(Number.isFinite(fact.rawValue) && fact.rawValue>0,`Invalid original value: ${key}`);
  assert(Number.isFinite(fact.factor) && fact.factor>0,`Invalid conversion: ${key}`);
  assert(Number.isFinite(row.value) && row.value>0,`Invalid official value: ${key}`);
  const decimals = row.id==='foodMinimum'?1:0;
  assert.equal(row.decimals,decimals);
  const converted = Number((fact.rawValue*fact.factor).toFixed(decimals));
  assert(Math.abs(row.value-converted)<=1e-8,`Official value disagrees with original units: ${key}`);
  assert.equal(row.basis,fact.basis);
  assert.equal(row.aggregation,fact.aggregation);
  assert.equal(fact.year,2025);
  assert(acceptedPeriods.has(fact.months),`Unestablished observation period: ${key}`);
  const prefix = acceptedPeriods.get(fact.months);
  assert.equal(row.period,prefix?`${prefix} ${fact.year}`:`${fact.year} год`);
  assert(!row.period.includes('2026'),`Publication year substituted for observation year: ${key}`);
  assert.equal(row.change,fact.change);
  if(fact.change===null) {
    assert.equal(row.changeLabel,null);
  } else {
    assert(Number.isFinite(row.change),`Invalid official change: ${key}`);
    const comparison = fact.changeComparison
      .replace('январь–ноябрь','январю–ноябрю')
      .replace(/^ноябрь /,'ноябрю ');
    assert.equal(row.changeLabel?.toLowerCase(),`к ${comparison}`);
  }
  const url = new URL(row.url);
  const sourceURL = new URL(source.url);
  assert.equal(url.origin+url.pathname+url.search,sourceURL.origin+sourceURL.pathname+sourceURL.search);
  if(fact.page) assert.equal(url.hash,`#page=${fact.page}`);
  assert(row.locator && row.scope && row.description && row.precisionNote,`Incomplete official context: ${key}`);
  if(row.id==='foodMinimum') {
    assert.equal(row.basis,'standard_basket');
    assert.equal(row.aggregation,'standard_cost');
    assert(/минимальн/i.test(row.label) && /минимальн/i.test(row.description),`Minimum basket cannot be relabelled as mean expenses: ${key}`);
    assert(/Только продукты питания/.test(row.scope),`Food-only scope lost: ${key}`);
    assert(/Жильё, ЖКХ, транспорт и связь.*не входят/.test(row.scope),`Basket scope must not include living costs: ${key}`);
  } else {
    assert.equal(row.id,'salary','No additional official metric has been accepted');
    assert.equal(row.aggregation,'mean');
    assert(/средн/i.test(row.description) && /не медиана/i.test(row.description));
    if(row.cityKey==='krd') {
      assert.equal(row.basis,'unspecified','Krasnodar cannot acquire an unverified gross/net basis');
      assert(/Только крупные и средние организации города/.test(row.scope));
      assert(/Малые организации.*не охвачены/.test(row.scope));
      assert.equal(fact.scope,'крупные и средние организации');
      assert(/округлено до 100/.test(row.precisionNote));
    } else {
      assert.equal(row.basis,'gross');
      assert(/Работники организаций/.test(row.scope));
      assert(/Полнота круга организаций.*не уточнена/.test(row.scope),'Unestablished SPb organisation coverage');
    }
  }
}
assert.equal(officialSeen.size,officialFacts.size,'Accepted official facts and app observations differ');
assert.equal(officialSeen.size,3,'Frozen official set contains exactly three accepted facts');
const averageLoader = fs.readFileSync(path.join(root,'lib/average-data.ts'),'utf8');
assert(averageLoader.includes('verified-averages.json'),'Official cards must use the accepted average dataset');

console.log(`Verified dataset: ${seen.size} observations match direct primary table evidence.`);
console.log(`Verified official references: ${officialSeen.size} observations match direct official evidence.`);
console.log('This checks saved evidence consistency; it does not refetch the sources or certify freshness.');
