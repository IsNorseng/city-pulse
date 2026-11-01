import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {verifySectorWages} from './verify-sector-wages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const verifierURL = new URL('./verify-sector-wages.mjs', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const original = {
  dataset: read('data/sector-wages.json'),
  evidence: read('data/evidence/sector-wages-source.json'),
};

test('accepts the reviewed 19-section source without mutating its inputs', () => {
  const input = structuredClone(original);
  const before = JSON.stringify(input);
  assert.deepEqual(verifySectorWages(input), {cityKey: 'spb', periodKey: '2025', sectors: 19, overall: 123341});
  assert.equal(JSON.stringify(input), before);
});

test('matches by section code rather than display order', () => {
  const input = structuredClone(original);
  input.dataset.sectors.reverse();
  input.evidence.rows.reverse();
  assert.equal(verifySectorWages(input).sectors, 19);
});

const invalidCases = [
  ['median substituted for mean', ({dataset}) => { dataset.aggregation = 'median'; }, /must remain a mean/],
  ['net substituted for gross', ({dataset}) => { dataset.basis = 'net'; }, /before personal income tax/],
  ['real substituted for nominal pay', ({dataset}) => { dataset.nominal = false; }, /nominal, not inflation-adjusted/],
  ['Krasnodar substituted for Saint Petersburg', ({dataset}) => { dataset.cityKey = 'krd'; dataset.geo = 'Краснодар'; }, /not Krasnodar/],
  ['Leningrad region substituted for the federal city', ({dataset}) => { dataset.geo = 'Ленинградская область'; }, /geography must remain Saint Petersburg/],
  ['2026 publication year substituted for 2025 observations', ({dataset}) => { dataset.periodKey = '2026'; dataset.period = '2026 год'; }, /complete year 2025/],
  ['annual frame replaced by one monthly observation', ({dataset}) => { dataset.frequency = 'monthly'; }, /annual observations/],
  ['salary money scale changed to thousands', ({dataset}) => { dataset.unit = 'тыс. ₽/мес'; dataset.sectors.forEach(row => { row.value /= 1000; }); }, /money scale is rubles per month/],
  ['monthly wage replaced by annual amount', ({dataset}) => { dataset.unit = '₽/год'; dataset.sectors.forEach(row => { row.value *= 12; }); }, /not thousands, indexes or annual pay/],
  ['sector values scaled without changing their ruble label', ({dataset}) => { dataset.sectors.forEach(row => { row.value *= 1000; }); }, /Original salary value differs/],
  ['duplicate sector letter and missing section', ({dataset}) => { dataset.sectors.at(-1).section = 'R'; }, /duplicate section R/],
  ['Cyrillic lookalike used as an OKVED letter', ({dataset}) => { dataset.sectors[0].section = 'А'; }, /Latin letter A–S/],
  ['one of the 19 sectors omitted', ({dataset}) => { dataset.sectors.pop(); }, /exactly 19 sections/],
  ['C and D section values swapped', ({dataset}) => {
    const manufacturing = dataset.sectors.find(row => row.section === 'C');
    const utilities = dataset.sectors.find(row => row.section === 'D');
    [manufacturing.value, utilities.value] = [utilities.value, manufacturing.value];
  }, /Original salary value differs for C/],
  ['original industry name replaced by an occupation', ({dataset}) => { dataset.sectors.find(row => row.section === 'J').name = 'Программисты'; }, /Original sector name differs for J/],
  ['salary locator points at the growth-index column', ({dataset}) => { dataset.sectors[0].locator = '4.4!A8:C8'; }, /salaries must come from column B/],
  ['source valueCell C used as money', ({evidence}) => { evidence.rows[0].valueCell = 'C8'; }, /C\/D are growth indexes/],
  ['source valueCell D used as money', ({evidence}) => { evidence.rows[0].valueCell = 'D8'; }, /C\/D are growth indexes/],
  ['source label cell points at a different row', ({evidence}) => { evidence.rows[0].labelCell = 'A9'; }, /Original label cell differs for A/],
  ['original B4 unit changed', ({evidence}) => { evidence.unitCell.value = 'Тысяч рублей'; }, /Original B4 unit must remain rubles/],
  ['unknown sample size replaced with an invented count', ({dataset}) => { dataset.sampleSize = 100; }, /unreported sector sample size must remain null/],
  ['one row overrides the shared gross basis', ({dataset}) => { dataset.sectors[0].basis = 'net'; }, /must not override shared basis/],
  ['source hash replaced with another valid hex digest', ({dataset}) => { dataset.source.sha256 = 'a'.repeat(64); }, /SHA256 differs from the reviewed original/],
  ['both source hashes replaced together', ({dataset, evidence}) => { dataset.source.sha256 = evidence.sourceSha256 = 'b'.repeat(64); }, /SHA256 differs from the reviewed original/],
  ['workbook byte count changed', ({evidence}) => { evidence.sourceBytes += 1; }, /workbook byte count changed/],
  ['gross claimed without its original methodology', ({evidence}) => { evidence.methodology.salaryFundIncludesPersonalIncomeTax = false; }, /Gross basis requires/],
  ['gross methodology moved to an unrelated footnote', ({evidence}) => { evidence.methodology.grossBasisCell = 'A1'; }, /methodology cell A15/],
  ['organisation coverage changed to all residents', ({dataset}) => { dataset.scope = 'Все жители Санкт-Петербурга'; }, /reviewed organisation coverage/],
  ['review date substituted for archive retrieval', ({dataset, evidence}) => { dataset.source.retrievedAt = evidence.retrievedAt = '2026-10-26T12:00:00Z'; }, /retrieval timestamp must not become/],
  ['review date invented as a publication date', ({dataset}) => { dataset.source.published = '2026-10-26'; }, /Unknown publication date must not be invented/],
  ['overall wage recomputed as an unweighted mean', ({dataset}) => { dataset.overall.value = Math.round(dataset.sectors.reduce((sum, row) => sum + row.value, 0) / dataset.sectors.length); }, /Overall wage must use original B6/],
  ['same original wage changed in both JSON files', ({dataset, evidence}) => { dataset.sectors[0].value += 1; evidence.rows[0].value += 1; }, /Reviewed source claims changed/],
  ['coordinated thousandfold rescaling of both excerpts', ({dataset, evidence}) => { dataset.sectors.forEach(row => { row.value *= 1000; }); evidence.rows.forEach(row => { row.value *= 1000; }); }, /Reviewed source claims changed/],
];

for (const [name, mutate, message] of invalidCases) {
  test(`rejects ${name}`, () => {
    const input = structuredClone(original);
    mutate(input);
    assert.throws(() => verifySectorWages(input), message);
  });
}

test('importing the verifier does not read or verify datasets', () => {
  const script = `
    import fs from 'node:fs';
    const readFileSync = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      if (/sector-wages(?:-source)?\\.json$/.test(String(file))) throw new Error('Unexpected dataset read during import');
      return readFileSync.call(this, file, ...args);
    };
    await import(${JSON.stringify(verifierURL.href)});
    process.stdout.write('import-only');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {cwd: root, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'import-only');
});

test('standalone CLI resolves the dataset from its project root', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(verifierURL)], {cwd: path.join(root, 'scripts'), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /19 OKVED2 sections, Saint Petersburg, 2025/);
});
