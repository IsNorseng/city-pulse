import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const context=read('data/additional-context.json');
const trafficProof=read('data/evidence/additional-traffic-audit.json');
const universities=read('data/additional-universities.json');
const universityProof=read('data/evidence/additional-universities-audit.json');
const hh=read('data/additional-hh-trends.json');
const archive=read('data/evidence/hh-cities-snapshot.json');
assert.equal(context.schemaVersion,2);
assert.equal(context.updatePolicy,'frozen');
assert.deepEqual(Object.keys(context.cities).sort(),['krd','spb']);
assert.equal(context.trafficCheckedAt,trafficProof.checkedAt);
assert.equal(trafficProof.source.publicationPeriod,'2025-03');
assert.equal(trafficProof.source.observationPeriod,null);
assert.equal(trafficProof.availabilitySearch.requestedYears.join(','),'2023,2024,2025,2026');
assert.equal(trafficProof.observations.length,2);
assert.equal(trafficProof.retrievedFiles.length,2);
for(const file of trafficProof.retrievedFiles){
  assert.match(file.sha256,/^[0-9a-f]{64}$/);
  assert(file.bytes>0);
  assert(file.url.startsWith('https://compass.2gis.ru/traffic/'));
}
for(const city of ['spb','krd']){
  const congestion=context.cities[city].transport.congestion;
  const original=trafficProof.observations.find(row=>row.city===city);
  assert(original);
  assert.deepEqual(congestion.peakWindow,{from:'17:00',to:'20:00'});
  assert.deepEqual(congestion.peakWindow,original.peakWindow);
  assert.equal(congestion.indicator,original.indicator);
  assert.equal(congestion.publicationPeriod,original.publicationPeriod);
  assert.equal(congestion.observationPeriod,null);
  assert.equal(original.observationPeriod,null);
  assert.equal(congestion.annualAverage,null);
  assert.equal(original.annualAverage,null);
  assert.equal(congestion.sourceId,original.sourceId);
  assert.equal(context.sources[congestion.sourceId].url,trafficProof.source.url);
  assert.match(congestion.limitation,/Период исходных наблюдений не раскрыт/);
  assert.match(congestion.currentStatus,/2023–2026/);
  assert(!('value' in congestion),'No unverified congestion average or obsolete 2013 score');
  assert.equal(context.cities[city].safety.period,'2025 год');
}
assert(!Object.keys(context.sources).some(id=>id.startsWith('yandex')));
assert.equal(context.cities.spb.safety.value,59000);
assert.equal(context.cities.spb.safety.approximate,true);
assert.equal(context.cities.spb.safety.change,-9.3);
assert.equal(context.cities.krd.safety.value,16263);
assert.equal(context.cities.krd.safety.change,-12.7);
for(const source of Object.values(context.sources)){
  assert(/^https:\/\//.test(source.url));
  for(const key of ['name','period','locator','note'])assert(source[key]?.trim(),`Source ${key} missing`);
}
assert.equal(universities.checkedAt,universityProof.checkedAt);
assert.equal(universities.rankings.length,3);
assert.equal(universities.universities.filter(row=>row.cityKey==='spb').length,10);
assert.equal(universities.universities.filter(row=>row.cityKey==='krd').length,6);
const universityIds=new Set();
for(const row of universities.universities){
  assert(!universityIds.has(row.id));universityIds.add(row.id);
  assert(['spb','krd'].includes(row.cityKey));
  const ranking=universities.rankings.find(item=>item.id===row.rankingId);
  const proof=universityProof.sources.find(item=>item.rankingId===row.rankingId);
  assert(ranking&&proof);
  assert.equal(ranking.sourceURL,proof.sourceURL);
  assert.equal(ranking.methodologyURL,proof.methodologyURL);
  const original=proof.extractedRows.find(item=>item.universityId===row.id);
  assert(original,`Missing primary university row: ${row.id}`);
  if(row.rankRange){
    assert.equal(row.rank,null);
    assert.deepEqual(row.rankRange,original.globalRankRange);
    assert.equal(row.rankingId,'three-missions-global-2025');
    assert.deepEqual(row.rankRange,[1751,2000]);
  }else{
    assert.equal(row.rankRange,null);
    assert(Number.isInteger(row.rank)&&row.rank>0);
    assert.equal(row.rank,original.rank);
  }
}
assert.equal(hh.source.url,archive.sourceURL);
assert.equal(hh.source.retrievedAt,archive.retrievedAt);
assert.equal(hh.source.sourceSha256,archive.sourceSha256);
assert.equal(hh.updatePolicy,'frozen');
assert.equal(hh.previousPeriod,'2025-09');
assert.equal(hh.currentPeriod,'2026-09');
assert.equal(hh.records.length,4);
const pairs=new Set();
for(const row of hh.records){
  assert.equal(row.areaId,({spb:'2',krd:'53'})[row.cityKey]);
  assert.equal(row.metric,({hhIndex:'hhindex',offeredMedian:'averageCompensation'})[row.id]);
  assert.equal(row.monthIndex,8);
  const data=archive.cities[row.areaId].metrics[row.metric];
  assert.deepEqual(data[0],['','2025','2026']);
  assert.deepEqual(row.header,data[0]);
  const cell=data.slice(1).filter(item=>item[0]===row.monthIndex);
  assert.equal(cell.length,1);
  assert.equal(row.previousRaw,cell[0][1]);assert.equal(row.currentRaw,cell[0][2]);
  for(const value of [row.previousRaw,row.currentRaw])assert(value.trim()&&Number.isFinite(Number(value))&&Number(value)>=0);
  const key=`${row.cityKey}/${row.id}`;assert(!pairs.has(key));pairs.add(key);
}
console.log('Verified additional context: 2 dated 2GIS evening profiles (published March 2025; observation dates and annual averages unavailable), 16 university positions across 3 separate rankings, and 4 exact HH year pairs. No live source refresh.');
