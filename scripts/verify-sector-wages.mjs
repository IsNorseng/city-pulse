import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const sections = Array.from({length: 19}, (_, index) => String.fromCharCode(65 + index));
const sourceURL = 'https://78.rosstat.gov.ru/storage/mediabank/%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%20%D0%B2%20%D1%86%D0%B8%D1%84%D1%80%D0%B0%D1%85%202025.xlsx';
const sourceSha256 = '0fb133c3a00b4498579bbcf190fc76f0df9fdf66b4069bbc9b8c8a79dc9c84d9';
const sourceBytes = 273468;
const retrievedAt = '2026-10-07T21:22:04.872696+00:00';
const checkedAt = '2026-10-26';
const sourceTitle = '4.4. Среднемесячная начисленная заработная плата работников организаций по видам экономической деятельности в 2025 году';
const classificationURL = 'https://ps.rosstat.gov.ru/accounts';

// Pin the reviewed table claims as well as the original workbook identity.
// This detects coordinated edits to both JSON files without duplicating all
// original wages here. It checks the saved excerpt, not a fresh download.
const reviewedClaimsSha256 = 'ea2b0ee03e28067a58c53cf1d215fa20df42a21bb4661d60811e95a0b48a9a02';

function sourceClaims(evidence) {
  return {
    sheet: evidence.sheet,
    title: evidence.title,
    unitCell: {cell: evidence.unitCell.cell, value: evidence.unitCell.value},
    overall: {
      labelCell: evidence.overall.labelCell, valueCell: evidence.overall.valueCell,
      label: evidence.overall.label, value: evidence.overall.value,
    },
    rows: evidence.rows.slice().sort((a, b) => a.section.localeCompare(b.section)).map(row => ({
      section: row.section, labelCell: row.labelCell, valueCell: row.valueCell,
      label: row.label, value: row.value,
    })),
    classification: {
      name: evidence.classification.name, level: evidence.classification.level,
      url: evidence.classification.url, sections: evidence.classification.sections,
    },
    methodology: {
      sheet: evidence.methodology.sheet, definitionCell: evidence.methodology.definitionCell,
      grossBasisCell: evidence.methodology.grossBasisCell, coverage: evidence.methodology.coverage,
      salaryFundIncludesPersonalIncomeTax: evidence.methodology.salaryFundIncludesPersonalIncomeTax,
    },
  };
}

function sectionMap(rows, kind) {
  assert(Array.isArray(rows) && rows.length === sections.length, `${kind}: exactly 19 sections A–S are required`);
  const result = new Map();
  for (const row of rows) {
    assert(row && /^[A-S]$/.test(row.section), `${kind}: section must be a Latin letter A–S`);
    assert(!result.has(row.section), `${kind}: duplicate section ${row.section}`);
    result.set(row.section, row);
  }
  assert.deepEqual([...result.keys()].sort(), sections, `${kind}: complete sections A–S are required`);
  return result;
}

function positiveRubles(value, label) {
  assert(Number.isSafeInteger(value) && value > 0, `${label}: original positive whole-ruble amount required`);
}

export function verifySectorWages({
  dataset = read('data/sector-wages.json'),
  evidence = read('data/evidence/sector-wages-source.json'),
} = {}) {
  assert.equal(dataset.schemaVersion, 1, 'Unknown sector dataset schema');
  assert.equal(evidence.schemaVersion, 1, 'Unknown sector evidence schema');
  assert.equal(dataset.updatePolicy, 'frozen', 'Sector wages must remain a frozen snapshot');
  assert.equal(dataset.checkedAt, checkedAt, 'Sector review date changed');
  assert.equal(evidence.checkedAt, checkedAt, 'Sector evidence review date changed');
  assert.equal(dataset.cityKey, 'spb', 'Sector wages cover Saint Petersburg, not Krasnodar');
  assert.equal(dataset.geo, 'Санкт-Петербург', 'Sector geography must remain Saint Petersburg');
  assert.equal(dataset.geoLevel, 'federal_subject', 'Sector geography is the federal city, not another region');
  assert.equal(dataset.periodKey, '2025', 'Sector observation period is the complete year 2025');
  assert.equal(dataset.period, '2025 год', 'Sector observation period must not become a publication year');
  assert.equal(dataset.frequency, 'annual', 'Sector rows are annual observations of monthly mean wages');
  assert.equal(dataset.unit, '₽/мес', 'Sector money scale is rubles per month, not thousands, indexes or annual pay');
  assert.equal(dataset.aggregation, 'mean', 'Sector wages must remain a mean, not a median');
  assert.equal(dataset.basis, 'gross', 'Sector wages are before personal income tax, not net pay');
  assert.equal(dataset.nominal, true, 'Sector wages are nominal, not inflation-adjusted');
  assert.equal(dataset.sampleSize, null, 'An unreported sector sample size must remain null');
  assert.equal(dataset.indicator, 'Среднемесячная начисленная заработная плата по видам экономической деятельности', 'Sector indicator meaning changed');
  assert.equal(dataset.classification, 'ОКВЭД 2');
  assert.equal(dataset.classificationLevel, 'section', 'Letters identify OKVED2 sections, not occupations or subcodes');

  const source = dataset.source;
  assert(source && typeof source === 'object', 'Sector source metadata is required');
  assert.equal(source.id, 'petrostat_spb_sector_wages_2025');
  assert.equal(source.name, 'Петростат');
  assert.equal(source.publication, 'Санкт-Петербург в цифрах 2025');
  assert.equal(source.url, sourceURL, 'Original sector workbook URL changed');
  assert.equal(evidence.sourceURL, sourceURL, 'Sector evidence must identify the same original workbook');
  for (const hash of [source.sha256, evidence.sourceSha256]) {
    assert(typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash), 'Sector source SHA256 must be valid');
    assert.equal(hash.toLowerCase(), sourceSha256, 'Sector source SHA256 differs from the reviewed original workbook');
  }
  assert.equal(source.bytes, sourceBytes, 'Sector workbook byte count changed');
  assert.equal(evidence.sourceBytes, sourceBytes, 'Sector evidence workbook byte count changed');
  assert.equal(source.catalogueURL, 'https://78.rosstat.gov.ru/folder/32168');
  assert.equal(source.sheet, '4.4');
  assert.equal(evidence.sheet, source.sheet);
  assert.equal(source.title, sourceTitle);
  assert.equal(evidence.title, sourceTitle);
  assert.equal(source.retrievedAt, retrievedAt, 'Archive retrieval timestamp must not become the later review date');
  assert.equal(evidence.retrievedAt, retrievedAt);
  assert(Number.isFinite(new Date(source.retrievedAt).valueOf()), 'Invalid archive retrieval timestamp');
  assert.equal(source.reviewedAt, checkedAt);
  assert.equal(source.published, null, 'Unknown publication date must not be invented from the reporting or review date');
  assert.equal(source.verification, 'archived_primary_rechecked', 'An archive recheck must not claim a new download');

  assert.deepEqual(evidence.unitCell, {cell: 'B4', value: 'Рублей'}, 'Original B4 unit must remain rubles');
  assert.equal(source.classificationURL, classificationURL);
  assert.equal(evidence.classification?.url, classificationURL);
  assert.equal(evidence.classification.name, dataset.classification);
  assert.equal(evidence.classification.level, dataset.classificationLevel);
  assert.deepEqual(evidence.classification.sections, sections, 'Original classification must contain A–S');
  assert.equal(source.methodologySheet, 'Методологические пояснения');
  assert.equal(evidence.methodology?.sheet, source.methodologySheet);
  assert.equal(evidence.methodology.definitionCell, 'A14', 'Mean definition must cite methodology cell A14');
  assert.equal(evidence.methodology.grossBasisCell, 'A15', 'Gross basis must cite methodology cell A15');
  assert.deepEqual(source.methodologyCells, ['A14', 'A15']);
  assert.equal(evidence.methodology.salaryFundIncludesPersonalIncomeTax, true, 'Gross basis requires the original inclusion of personal income tax');
  assert(typeof dataset.scope === 'string' && dataset.scope.trim(), 'Sector organisation coverage is required');
  assert.equal(dataset.scope, evidence.methodology.coverage, 'All sector rows must retain the reviewed organisation coverage');

  assert.equal(evidence.overall?.labelCell, 'A6');
  assert.equal(evidence.overall.valueCell, 'B6');
  assert.equal(evidence.overall.label, 'Всего');
  assert.equal(evidence.overall.value, 123341, 'Original B6 overall wage changed');
  assert.equal(dataset.overall?.label, 'Все виды экономической деятельности');
  assert.equal(dataset.overall.locator, '4.4!A6:B6');
  positiveRubles(dataset.overall.value, 'Overall wage');
  assert.equal(dataset.overall.value, evidence.overall.value, 'Overall wage must use original B6, not an unweighted mean of sectors');

  const originalRows = sectionMap(evidence.rows, 'Source rows');
  const displayRows = sectionMap(dataset.sectors, 'Sector rows');
  const sharedFields = ['cityKey', 'geo', 'geoLevel', 'period', 'periodKey', 'frequency', 'unit', 'aggregation', 'basis', 'nominal', 'sampleSize'];
  for (const [index, section] of sections.entries()) {
    const original = originalRows.get(section);
    const row = displayRows.get(section);
    const worksheetRow = index + 8;
    assert.equal(original.labelCell, `A${worksheetRow}`, `Original label cell differs for ${section}`);
    assert.equal(original.valueCell, `B${worksheetRow}`, `Original salary value cell differs for ${section}; C/D are growth indexes`);
    assert.equal(row.locator, `4.4!A${worksheetRow}:B${worksheetRow}`, `Sector locator differs for ${section}; salaries must come from column B`);
    assert(typeof original.label === 'string' && original.label.trim(), `Original sector name absent for ${section}`);
    assert.equal(row.name, original.label, `Original sector name differs for ${section}`);
    assert(typeof row.shortName === 'string' && row.shortName.trim(), `Readable sector name absent for ${section}`);
    positiveRubles(original.value, `Original sector ${section}`);
    positiveRubles(row.value, `Sector ${section}`);
    assert.equal(row.value, original.value, `Original salary value differs for ${section}`);
    for (const field of sharedFields) {
      if (Object.hasOwn(row, field)) assert.equal(row[field], dataset[field], `Sector ${section} must not override shared ${field}`);
    }
  }
  const digest = createHash('sha256').update(JSON.stringify(sourceClaims(evidence))).digest('hex');
  assert.equal(digest, reviewedClaimsSha256, 'Reviewed source claims changed, even if both JSON files agree');
  return {cityKey: 'spb', periodKey: '2025', sectors: sections.length, overall: dataset.overall.value};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifySectorWages();
  console.log(`Verified sector wages: ${result.sectors} OKVED2 sections, Saint Petersburg, ${result.periodKey}, monthly mean gross pay.`);
  console.log('This checks the saved source excerpt and archive identity, not a fresh download.');
}
