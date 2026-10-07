import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const text = name => fs.readFileSync(path.join(root, name), 'utf8');
const checkedAt = '2026-10-07';
const acceptedCheckDates = new Set(['2026-10-06','2026-10-07']);
const sourceURL = 'https://stats.hh.ru/api/v1/data/RU';
const cityAreas = {spb: {id: '2', parent: '113', name: 'Санкт-Петербург'}, krd: {id: '53', parent: '1438', name: 'Краснодар'}};
const hhMetrics = {
  activeVacancies: {raw: 'numberVacancies', aggregation: 'daily_mean', basis: 'not_applicable', decimals: 0, unit: 'в среднем за день'},
  activeResumes: {raw: 'numberResumes', aggregation: 'daily_mean', basis: 'not_applicable', decimals: 0, unit: 'в среднем за день'},
  hhIndex: {raw: 'hhindex', aggregation: 'ratio_of_daily_means', basis: 'not_applicable', decimals: 1, unit: 'резюме/вакансию'},
  offeredMedian: {raw: 'averageCompensation', aggregation: 'publisher_median', basis: 'unspecified', decimals: 0, unit: '₽/мес'},
  expectedMedian: {raw: 'averageExpected', aggregation: 'publisher_median', basis: 'unspecified', decimals: 0, unit: '₽/мес'},
};
const contextFields = ['id', 'section', 'label', 'unit', 'period', 'geo', 'geoLevel', 'source', 'url', 'dateChecked', 'scope', 'description', 'basis', 'aggregation', 'locator', 'evidenceId'];
const validSections = new Set(['wages', 'vacancies', 'unemployment', 'demography']);
const validGeoLevels = new Set(['city', 'federal_subject', 'region', 'municipal']);
const validBases = new Set(['gross', 'net', 'unspecified', 'not_applicable']);
const keyFor = fact => `${fact.cityKey}:${fact.id}`;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const signedDemographicChange = fact => fact.section === 'demography'
  && /^(naturalChange|migrationChange|population.*Change)/.test(fact.id);
const settlementGeo = 'Город Краснодар — населённый пункт, без подчинённых сельских поселений';
const municipalGeo = 'Городской округ город Краснодар, включая сельские населённые пункты';
const acceptedAliases = {
  populationCity: 'population',
  unemploymentGeneral: 'unemploymentILO',
  unemploymentGeneralRegional: 'unemploymentILO',
  unemploymentRegistered: 'registeredUnemployment',
  unemploymentRegisteredRegional: 'registeredUnemployment',
  registeredUnemployedRegional: 'registeredUnemployed',
  vacanciesRegisteredRegional: 'vacanciesRegistered',
};
const baseURL = value => { const url = new URL(value); url.hash = ''; return url.href; };
const nearlyEqual = (actual, expected) => Number.isFinite(actual) && Number.isFinite(expected)
  && Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12);

function parseDate(value) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : dotted ? [Number(dotted[3]), Number(dotted[2]), Number(dotted[1])] : null;
  if (!parts) return null;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2] ? date : null;
}

function verifyContext(fact) {
  const key = keyFor(fact);
  assert(Object.hasOwn(cityAreas, fact.cityKey), `Unknown profile city: ${key}`);
  for (const field of contextFields) assert(nonempty(fact[field]), `Missing profile context ${field}: ${key}`);
  assert(validSections.has(fact.section), `Unknown section: ${key}`);
  assert(validGeoLevels.has(fact.geoLevel), `Unknown geography level: ${key}`);
  assert(validBases.has(fact.basis), `Unknown salary basis: ${key}`);
  assert(acceptedCheckDates.has(fact.dateChecked), `Unestablished profile check date: ${key}`);
  assert(Object.hasOwn(fact, 'published'), `Missing publication status: ${key}`);
  assert(fact.published === null || (parseDate(fact.published) && parseDate(fact.published) <= parseDate(checkedAt)), `Invalid or future publication date: ${key}`);
  const url = new URL(fact.url);
  assert(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, `Invalid source URL: ${key}`);
  assert(Number.isInteger(fact.decimals) && fact.decimals >= 0 && fact.decimals <= 8, `Invalid number precision: ${key}`);
  assert(Object.hasOwn(fact, 'value') && Object.hasOwn(fact, 'interval'), `Missing value or interval status: ${key}`);
  assert(fact.value === null || (Number.isFinite(fact.value) && (fact.value >= 0 || signedDemographicChange(fact))), `Invalid profile value: ${key}`);
  assert(fact.interval === null || (Array.isArray(fact.interval) && fact.interval.length === 2
    && fact.interval.every(value => Number.isFinite(value) && (value >= 0 || signedDemographicChange(fact)))
    && fact.interval[0] < fact.interval[1]), `Invalid profile interval: ${key}`);
  assert(fact.value !== null || fact.interval !== null, `No confirmed value: ${key}`);
  if (fact.value !== null && fact.interval !== null) assert(fact.value >= fact.interval[0] && fact.value <= fact.interval[1], `Point outside stated interval: ${key}`);
  assert(Object.hasOwn(fact, 'change') && Object.hasOwn(fact, 'changeLabel'), `Missing change status: ${key}`);
  assert(fact.change === null || Number.isFinite(fact.change), `Invalid change: ${key}`);
  assert(fact.change === null ? fact.changeLabel === null : nonempty(fact.changeLabel), `Missing change comparison: ${key}`);
  if (fact.geoLevel === 'region') {
    assert.equal(fact.cityKey, 'krd', `Unaccepted regional replacement: ${key}`);
    assert(/Краснодарский край/i.test(fact.geo), `Region must be explicitly identified: ${key}`);
  } else if (fact.geoLevel === 'municipal') {
    assert.equal(fact.cityKey, 'krd', `Unestablished municipality: ${key}`);
    assert.equal(fact.geo, municipalGeo, `Municipality must identify included rural settlements: ${key}`);
  } else if (fact.cityKey === 'spb') {
    assert(/^(г\.?\s*)?Санкт-Петербург$/i.test(fact.geo), `SPb cannot acquire another region: ${key}`);
  } else {
    assert.equal(fact.geoLevel, 'city', `Krasnodar region must use regional marking: ${key}`);
    assert(fact.geo === settlementGeo || /^(Краснодар|(?:город|г\.)\s+Краснодар|(?:Муниципальное образование\s+)?город Краснодар(?:\s*\(муниципальное образование\))?)$/i.test(fact.geo), `Region or municipality cannot masquerade as Krasnodar settlement: ${key}`);
  }
  if (fact.id === 'actualModalInterval') {
    assert.equal(fact.value, null, `Grouped modal interval cannot acquire an exact point: ${key}`);
    assert(fact.interval !== null && /density/i.test(fact.aggregation), `Modal interval requires density method: ${key}`);
  }
  if (fact.id === 'actualMode') {
    assert(fact.value !== null && /group/i.test(fact.aggregation) && /estimat|interpolat/i.test(fact.aggregation), `Point mode must be an explicit grouped estimate: ${key}`);
    assert(/оценк|интерпол/i.test(`${fact.label} ${fact.description}`), `Estimated mode must be described as an estimate: ${key}`);
  }
}

export function verifyProfile({
  dataset = read('data/verified-city-profile.json'),
  audit = read('data/evidence/city-profile-audit.json'),
  snapshot = read('data/evidence/hh-cities-snapshot.json'),
  loaderSource = text('lib/extended-data.ts'),
  componentSource = text('components/pulse-extended.tsx'),
  quiet = false,
} = {}) {
  assert.equal(dataset.checkedAt, checkedAt);
  assert.equal(dataset.updatePolicy, 'frozen');
  assert.equal(audit.checkedAt, checkedAt);
  assert(Array.isArray(dataset.facts) && Array.isArray(audit.facts), 'Profile facts must be arrays');
  const accepted = new Map();
  for (const fact of audit.facts) {
    const key = keyFor(fact);
    assert(!accepted.has(key), `Duplicate accepted profile fact: ${key}`);
    verifyContext(fact);
    accepted.set(key, fact);
  }
  const seen = new Map();
  for (const fact of dataset.facts) {
    const key = keyFor(fact);
    assert(!seen.has(key), `Duplicate profile fact: ${key}`);
    verifyContext(fact);
    assert(accepted.has(key), `Profile fact lacks saved accepted evidence: ${key}`);
    assert.deepEqual(fact, accepted.get(key), `Profile value or context differs from accepted evidence: ${key}`);
    seen.set(key, fact);
  }
  assert.equal(seen.size, accepted.size, 'Profile and accepted audit have different coverage');

  const proof = audit.hhProof;
  assert(proof && Array.isArray(proof.facts), 'HH publisher proof is required');
  assert.equal(proof.checkedAt, '2026-10-06');
  assert.equal(proof.status, 'verified_city_publisher_aggregates');
  assert.equal(proof.primarySource.url, sourceURL);
  assert.equal(proof.primarySource.httpStatus, 200);
  assert.equal(snapshot.sourceURL, sourceURL);
  assert.equal(snapshot.retrievedAt, proof.primarySource.retrievedAt);
  assert.equal(snapshot.sourceSha256, proof.primarySource.rawSha256);
  assert(/^[a-f0-9]{64}$/i.test(snapshot.sourceSha256), 'Missing HH response identity');
  assert(Number.isFinite(new Date(snapshot.retrievedAt).valueOf()), 'Invalid HH retrieval timestamp');
  assert.equal(new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Moscow'}).format(new Date(snapshot.retrievedAt)), '2026-10-06');
  assert.equal(proof.endpointDiscovery.pageURL, 'https://stats.hh.ru/');
  assert(/^https:\/\/stats\.hh\.ru\/assets\/.+\.js$/.test(proof.endpointDiscovery.assetURL), 'HH method must link its publisher script');
  assert(/^[a-f0-9]{64}$/i.test(proof.endpointDiscovery.assetSha256), 'Missing HH method script identity');
  assert(/all/.test(proof.endpointDiscovery.locator) && /getRegionsData/.test(proof.endpointDiscovery.locator), 'Unestablished all-profession publisher mapping');
  assert(/медиан/i.test(proof.endpointDiscovery.salarySemanticsLocator) && /offeredSalary/.test(proof.endpointDiscovery.salarySemanticsLocator), 'Publisher median must be explicitly established');
  assert(/медиан/i.test(proof.methodology.salaryAggregation), 'Mean cannot replace publisher median');
  assert.equal(proof.methodology.methodologyPage, 16);
  assert(nonempty(proof.methodology.primaryPDFURL) && nonempty(proof.methodology.paraphrase), 'Active record methodology missing');
  assert.equal(proof.salaryLimitations.salaryDisclosureShare, null, 'Unestablished HH salary disclosure coverage');
  assert.equal(proof.salaryLimitations.salarySampleSize, null, 'Unestablished HH salary sample size');

  const hhSeen = new Set();
  const proofSeen = new Set();
  for (const fact of proof.facts) {
    const key = `${fact.areaId}:${fact.metric}`;
    assert(!proofSeen.has(key), `Duplicate HH original aggregate: ${key}`);
    proofSeen.add(key);
  }
  for (const [cityKey, area] of Object.entries(cityAreas)) {
    const original = snapshot.cities[area.id];
    assert(original, `HH city excerpt absent: ${area.name}`);
    assert.equal(original.area.id, area.id);
    assert.equal(original.area.parent_id, area.parent);
    assert.equal(original.area.name, area.name);
    assert.deepEqual(original.area.areas, [], 'HH selected area must be a city leaf');
    for (const [id, metric] of Object.entries(hhMetrics)) {
      const key = `${cityKey}:${id}`;
      const fact = seen.get(key);
      assert(fact, `Mandatory HH city metric absent: ${key}`);
      hhSeen.add(key);
      const series = original.metrics[metric.raw];
      assert(Array.isArray(series), `HH metric series absent: ${key}`);
      assert.deepEqual(series[0], ['', '2025', '2026'], `HH year columns changed: ${key}`);
      const septemberRows = series.slice(1).filter(row => row[0] === 8);
      assert.equal(septemberRows.length, 1, `HH September row not unique: ${key}`);
      const raw = septemberRows[0][2];
      assert(typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw)) && Number(raw) > 0, `Invalid HH original September value: ${key}`);
      const saved = proof.facts.find(row => row.areaId === area.id && row.metric === metric.raw);
      assert(saved, `HH semantic evidence absent: ${key}`);
      assert.equal(saved.rawValue, raw);
      assert.equal(saved.value, Number(raw));
      assert.equal(saved.verification, 'direct_primary_publisher_aggregate');
      assert.equal(saved.period, '2026-09');
      assert.equal(saved.aggregation, metric.aggregation);
      assert.equal(saved.basis, metric.basis);
      assert.equal(saved.geo, area.name);
      assert.equal(saved.geoLevel, 'city');
      assert.equal(fact.value, Number(raw), `HH value differs from exact publisher aggregate: ${key}`);
      assert.equal(fact.interval, null);
      assert.equal(fact.section, 'vacancies');
      assert.equal(fact.evidenceId, `hh_city_${cityKey}`);
      assert.equal(fact.geo, area.name);
      assert.equal(fact.geoLevel, 'city');
      assert.equal(fact.aggregation, metric.aggregation);
      assert.equal(fact.basis, metric.basis, `Unverified HH gross/net basis: ${key}`);
      assert.equal(fact.decimals, metric.decimals);
      assert.equal(fact.unit, metric.unit);
      assert.equal(fact.period, 'Сентябрь 2026');
      assert.equal(fact.published, null, 'Retrieval date cannot replace publication date');
      assert.equal(fact.url, proof.primarySource.serviceURL);
      assert(/HeadHunter/.test(fact.source));
      assert(/все профессиональные области/i.test(fact.scope) && /платформ/i.test(fact.scope), `HH platform scope lost: ${key}`);
      assert.equal(fact.locator, saved.locator);
      assert.equal(fact.change, null);
      assert.equal(fact.changeLabel, null);
      if (id === 'activeVacancies' || id === 'activeResumes') assert(Number.isInteger(fact.value), `HH saved count precision changed: ${key}`);
      if (id === 'offeredMedian' || id === 'expectedMedian') assert(/медиан/i.test(fact.label), `HH salary median relabelled: ${key}`);
    }
    const vacancies = seen.get(`${cityKey}:activeVacancies`).value;
    const resumes = seen.get(`${cityKey}:activeResumes`).value;
    const index = seen.get(`${cityKey}:hhIndex`).value;
    assert(Math.abs(resumes / vacancies - index) <= 0.05 + 1e-6, `HH index disagrees with rounded ratio of daily means: ${cityKey}`);
    assert.equal(index, cityKey === 'spb' ? 10.3 : 13.1, `Frozen HH index changed: ${cityKey}`);
  }
  const platformFacts = dataset.facts.filter(fact => /^hh_city_/.test(fact.evidenceId) || new URL(fact.url).hostname === 'stats.hh.ru');
  assert.equal(platformFacts.length, 10, 'Frozen profile contains exactly ten accepted HH aggregates');
  assert.equal(proofSeen.size, 10, 'HH semantic proof must contain exactly ten original city aggregates');
  for (const fact of platformFacts) assert(hhSeen.has(keyFor(fact)), `Additional unestablished HH metric: ${keyFor(fact)}`);

  const officialFacts = dataset.facts.filter(fact => !hhSeen.has(keyFor(fact)));
  if (officialFacts.length) {
    assert(Array.isArray(audit.officialProof) && audit.officialProof.length > 0, 'Official profile facts lack original research evidence');
    const originalAccepted = new Map();
    for (const payload of audit.officialProof) {
      if (!Array.isArray(payload.accepted) || !Array.isArray(payload.sources)) continue;
      assert(acceptedCheckDates.has(payload.checkedAt), 'Original official research check date changed');
      const sources = new Map(payload.sources.map(source => [source.id, source]));
      for (const original of payload.accepted) {
        const id = acceptedAliases[original.id] ?? original.id;
        const key = `${original.cityKey}:${id}`;
        assert(!originalAccepted.has(key), `Duplicate original accepted official fact: ${key}`);
        const source = sources.get(original.sourceId);
        assert(source, `Original official source metadata absent: ${key}`);
        assert.equal(original.verification, 'direct_primary', `Original official fact not directly verified: ${key}`);
        assert.equal(source.verification, 'direct_primary', `Official source not directly verified: ${key}`);
        assert.equal(original.dateChecked, payload.checkedAt);
        assert.equal(source.checkedAt, payload.checkedAt);
        assert.equal(baseURL(original.url), baseURL(source.url));
        assert(/^[a-f0-9]{64}$/i.test(source.sha256) && Number.isFinite(source.bytes) && source.bytes > 0, `Official original file identity missing: ${key}`);
        if (source.httpStatus === 206) assert.equal(source.completeRangeVerified, true, `Partial official download not established as complete: ${key}`);
        const raw = original.raw;
        if (original.id === 'actualMedian' || original.id === 'actualModalInterval') {
          assert.equal(original.basis,'gross');
          assert.equal(original.period,'Апрель 2025');
        }
        if (original.id === 'actualModalInterval') {
          const distribution = payload.distributions.find(row=>row.cityKey===original.cityKey);
          assert(distribution && distribution.bins.length===33,'Full published wage distribution missing');
          assert(Math.abs(distribution.bins.reduce((sum,bin)=>sum+bin.count,0)-distribution.total)<=33/2,'Frequency total exceeds independent rounding tolerance');
          const finite=distribution.bins.filter(bin=>bin.lower!==null&&bin.upper!==null);
          for (const bin of finite) {
            assert(nearlyEqual(bin.width,bin.upper-bin.lower));
            assert(nearlyEqual(bin.density,bin.count/bin.width));
          }
          const peak=finite.reduce((a,b)=>a.density>b.density?a:b);
          assert.deepEqual(original.interval,[peak.lower,peak.upper]);
          assert.equal(original.value,null);
          assert.equal(original.aggregation,'modal_interval_density_derived');
        }
        if (raw && Number.isFinite(raw.value)) {
          const factor = raw.factor ?? 1;
          assert(Number.isFinite(factor) && factor > 0, `Invalid original unit factor: ${key}`);
          assert(nearlyEqual(original.value, raw.value * factor), `Official source unit conversion disagrees: ${key}`);
        } else if (raw && Number.isFinite(raw.total) && original.id.startsWith('population')) {
          assert(nearlyEqual(original.value, raw.total), `Official population row total disagrees: ${key}`);
          if (Number.isFinite(raw.urban) && Number.isFinite(raw.rural)) assert(nearlyEqual(raw.total, raw.urban + raw.rural), `Urban and rural population do not sum to total: ${key}`);
          if (original.geoLevel === 'settlement') {
            assert.equal(raw.rural, 0, `Settlement cannot include subordinate rural population: ${key}`);
            assert.equal(raw.urban, raw.total);
          }
        } else if (raw && Number.isFinite(raw.current) && Number.isFinite(raw.previous)) {
          assert.equal(original.derived, true, `Difference must be identified as a calculation: ${key}`);
          assert(nearlyEqual(original.value, raw.current - raw.previous), `Population difference formula disagrees: ${key}`);
          const previousSource = sources.get(raw.previousSourceId);
          assert(previousSource && previousSource.verification === 'direct_primary', `Previous published population source missing: ${key}`);
        } else if (raw && Number.isFinite(raw.unemployed) && Number.isFinite(raw.labourForce)) {
          assert.equal(original.derived, true, `Rate from rounded counts must be identified as a calculation: ${key}`);
          assert(raw.labourForce > 0 && raw.unemployed >= 0 && raw.unemployed <= raw.labourForce, `Invalid labour force ratio operands: ${key}`);
          assert(nearlyEqual(original.value, raw.unemployed / raw.labourForce * 100), `Unemployment calculation disagrees with original rounded counts: ${key}`);
        }
        originalAccepted.set(key, {original, source});
      }
    }
    for (const fact of officialFacts) {
      const key = keyFor(fact);
      const originalRecord = originalAccepted.get(key);
      if (originalRecord) {
        const {original, source} = originalRecord;
        assert.equal(fact.value, original.value, `Official profile value differs from original accepted row: ${key}`);
        assert.equal(fact.unit, original.unit, `Official profile unit differs from original accepted row: ${key}`);
        assert.equal(fact.period, original.period, `Official profile period differs from original accepted row: ${key}`);
        assert.equal(fact.evidenceId, original.sourceId);
        assert.equal(fact.locator, original.locator);
        assert.equal(fact.scope, original.scope);
        assert.equal(fact.dateChecked, original.dateChecked);
        if (original.basis) assert.equal(fact.basis, original.basis);
        if (original.aggregation) assert.equal(fact.aggregation, original.aggregation);
        assert.equal(fact.published, source.published ?? null);
        assert.equal(baseURL(fact.url), baseURL(original.url), `PDF page fragment must not change original document: ${key}`);
        const expectedLevel = original.geoLevel === 'region_proxy' ? 'region' : original.geoLevel === 'settlement' ? 'city' : original.geoLevel;
        const expectedGeo = original.geoLevel === 'region_proxy' ? 'Краснодарский край' : original.geo;
        assert.equal(fact.geoLevel, expectedLevel, `Official geographic level differs from original: ${key}`);
        assert.equal(fact.geo, expectedGeo, `Official geography differs from original: ${key}`);
        if (original.raw && Number.isFinite(original.raw.current) && Number.isFinite(original.raw.previous)) assert.equal(fact.aggregation, 'difference_of_published_estimates');
        if (original.raw && Number.isFinite(original.raw.unemployed) && Number.isFinite(original.raw.labourForce)) {
          assert.equal(fact.aggregation, 'derived_ratio_rounded_counts');
          assert.equal(fact.approximate, true, `Rate from rounded counts cannot be displayed as exact: ${key}`);
          assert.equal(fact.decimals, original.decimals);
        }
      } else {
        assert(audit.officialProof.some(item => JSON.stringify(item).includes(baseURL(fact.url))), `Official source URL absent from saved original research: ${key}`);
      }
    }
  }
  assert(loaderSource.includes('verified-city-profile.json'), 'Profile cards must read the verified profile dataset');
  assert(!/\b(netSalary|onUseSalary|setCustom|setIncome|configure_city_budget)\b/.test(componentSource), 'Extended facts must not automatically pass unestablished salaries to the budget');
  const ages=read('data/demography-age-sex.json');
  assert.equal(ages.checkedAt,'2026-10-06');
  assert.equal(ages.tables.length,3);
  const originalAges=audit.officialProof.flatMap(proof=>proof.ageSex??[]);
  for (const table of ages.tables) {
    const original=originalAges.find(row=>row.cityKey===table.cityKey&&row.geoLevel===table.geoLevel);
    assert(original,'Age/sex table has no original evidence');
    for (const key of ['geo','period','total','male','female','url','dateChecked']) assert.equal(table[key],original[key]);
    assert.equal(table.period,'На 1 января 2024');
    assert.equal(table.total,table.male+table.female);
    for (let i=0;i<table.bins.length;i++) for(const key of ['age','total','male','female','locator']) assert.deepEqual(table.bins[i][key],original.binsComparable[i][key]);
    assert.equal(table.bins.length,15);
    assert.equal(table.bins.at(-1).age,'70+');
    for (const bin of table.bins) assert.equal(bin.total,bin.male+bin.female);
    for (const key of ['total','male','female']) assert.equal(table.bins.reduce((sum,bin)=>sum+bin[key],0),table[key]);
  }
  if (!quiet) console.log(`Verified city profile: ${hhSeen.size} exact HH publisher aggregates and ${officialFacts.length} accepted official facts.`);
  return {hhFacts: hhSeen.size, officialFacts: officialFacts.length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) verifyProfile();
