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
console.log(`Verified dataset: ${seen.size} observations match direct primary table evidence.`);
console.log('This checks saved evidence consistency; it does not refetch the sources or certify freshness.');
