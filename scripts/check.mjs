import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareData, observation } from '../src/data.mjs';
import { prepareRegionalData, parseCpt, balanceScale, balanceColor } from '../src/regional-data.mjs';
import { prepareWageData, wageCsv } from '../src/wage-data.mjs';
import { wagePath, renderWageCharts } from '../src/wage-chart.mjs';
import { createHash } from 'node:crypto';
import { preparePensionData, pensionCsv } from '../src/pension-data.mjs';
import { pensionPath, renderPensionChart } from '../src/pension-chart.mjs';
import { prepareVentureData, ventureCsv } from '../src/venture-data.mjs';
import { renderVentureChart } from '../src/venture-chart.mjs';
import { prepareMigrationData, migrationCsv } from '../src/migration-data.mjs';
import { renderMigrationChart } from '../src/migration-chart.mjs';
import { prepareFiscalData, fiscalCsv } from '../src/fiscal-data.mjs';

const raw = JSON.parse(await readFile(new URL('../dist/data/eurostat-raw.json', import.meta.url), 'utf8'));
const published = JSON.parse(await readFile(new URL('../dist/data/spending.json', import.meta.url), 'utf8'));
const data = prepareData(raw, published.retrievedAt);
assert.deepEqual(published, data, 'Published data must match the source snapshot');
assert.ok(Math.abs(data.categories.reduce((sum, c) => sum + c.amount, 0) - data.total) < 1, 'No omitted or double-counted expenditure');
assert.ok(Math.abs(data.categories.reduce((sum, c) => sum + c.share, 0) - 100) < .001, 'Shares must sum to 100%');
for (const year of Object.keys(raw.dimension.time.category.index).filter(y => Number(y) > data.year)) {
  assert.ok(!observation(raw, 'TOTAL', year) || data.categories.some(c => c.terms.some(([code]) => !observation(raw, code, year))), 'A newer complete year must not be overlooked');
}
const missing = structuredClone(raw);
missing.value = {};
assert.throws(() => prepareData(missing, data.retrievedAt), /No complete year/, 'Missing observations must never become zero');
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.equal((html.match(/class="spending-row"/g) || []).length, 12);
assert.ok(!html.includes('{{'), 'No unrendered placeholders');
console.log(`Data checks passed: ${data.year}, 12 mutually exclusive categories, reconciled total, complete-year selection, and missing-data rejection.`);

const revenueCsv = await readFile(new URL('../dist/data/cpt/entrate.csv', import.meta.url), 'utf8');
const spendingCsv = await readFile(new URL('../dist/data/cpt/spese.csv', import.meta.url), 'utf8');
const regionalPublished = JSON.parse(await readFile(new URL('../dist/data/regions.json', import.meta.url), 'utf8'));
const regional = prepareRegionalData(revenueCsv, spendingCsv, regionalPublished.retrievedAt);
assert.deepEqual(regionalPublished, regional, 'Regional output must match original CPT files');
assert.equal(regional.regions.length, 20);
assert.deepEqual(regional.regions.flatMap(r => r.sourceTerritories).sort((a,b) => a-b), [1,2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22], 'Each CPT territory is counted once');
const sourceRevenue = parseCpt(revenueCsv, 'revenue');
const sourceSpending = parseCpt(spendingCsv, 'spending');
const independentTotals = { revenue: 0, spending: 0 };
for (const [flow, table, code] of [['revenue', sourceRevenue, '163'], ['spending', sourceSpending, '445']]) {
  for (const [key, value] of table) if (key.startsWith(`${regional.year}:`) && key.endsWith(`:${code}`)) independentTotals[flow] += value;
  assert.ok(Math.abs(regional.regions.reduce((sum,r) => sum + r[flow], 0) - independentTotals[flow]) < .00001, `${flow} reconciles after aggregation`);
}
assert.ok(Math.abs(regional.regions.find(r => r.id === 4).balance - [21,22].reduce((sum,id) => sum + sourceRevenue.get(`${regional.year}:${id}:163`) - sourceSpending.get(`${regional.year}:${id}:445`), 0)) < .00001, 'Trento and Bolzano balances are summed, not averaged');
assert.ok(regional.regions.every(r => Math.abs(r.balance - (r.revenue - r.spending)) < .00001));
if (regional.year === 2023) {
  assert.ok(Math.abs(regional.regions.find(r => r.id === 3).balance - 52516.62847) < .00001, 'Verified Lombardia source values');
  assert.ok(regional.regions.find(r => r.id === 19).balance < 0, 'Sicilia is negative in the verified 2023 snapshot');
}
const header = revenueCsv.split(/\r?\n/)[0];
assert.throws(() => prepareRegionalData(header, spendingCsv, regional.retrievedAt), /No complete CPT year/);
const firstAmount = revenueCsv.split(/\r?\n/)[1].split(';')[4];
assert.throws(() => parseCpt(revenueCsv.replace(firstAmount, ''), 'revenue'), /Invalid CPT/);
assert.throws(() => parseCpt(revenueCsv + '\n' + revenueCsv.split('\n')[1], 'revenue'), /Duplicate CPT/);
const partialNewest = revenueCsv.split('\n').filter(line => !(line.includes(';2023;') && line.includes('03 - Lombardia') && line.includes('E - 163'))).join('\n');
assert.equal(prepareRegionalData(partialNewest, spendingCsv, regional.retrievedAt).year, 2022, 'A partial year must not be shown as complete');
const maximum = balanceScale(regional.regions);
assert.equal(balanceColor(0, maximum), 'rgb(246, 245, 242)');
assert.equal(balanceColor(maximum * 1000, maximum), 'rgb(38, 113, 82)');
assert.equal(balanceColor(-maximum * 1000, maximum), 'rgb(164, 57, 50)');
assert.equal((html.match(/class="map-region"/g) || []).length, 20);
assert.equal((html.split('<table class="regional-table">')[1].split('</table>')[0].match(/<tr><th scope="row">/g) || []).length, 20);
console.log(`Regional checks passed: ${regional.year}, 20 regions from 21 territories, reconciled source totals, correct sign and scale, missing-data and duplicate rejection.`);

const oecd = await readFile(new URL('../dist/data/wages/oecd.csv', import.meta.url), 'utf8');
const ameco = await readFile(new URL('../dist/data/wages/ameco7.txt', import.meta.url), 'utf8');
const wageMetadata = JSON.parse(await readFile(new URL('../dist/data/wages/retrieval.json', import.meta.url), 'utf8'));
const wages = prepareWageData(oecd, ameco, wageMetadata);
assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/wages.json', import.meta.url), 'utf8')), wages);
for (const series of Object.values(wages.series)) {
  assert.equal(series.find(p => p.year === 1990).index, 100);
  const base = series.find(p => p.year === 1990).value;
  assert.ok(series.every(p => Math.abs(p.index / 100 - p.value / base) < 1e-12), 'Rebasing preserves real growth ratios');
}
assert.equal(wages.series.oecd[0].year, 1990);
assert.equal(wages.series.ameco[0].year, 1960);
assert.equal(wages.series.ameco.at(-1).year, wageMetadata.amecoLastHistoricalYear, 'No forecast years displayed');
if (wages.priceYear === 2025) {
  assert.equal(wages.series.oecd[0].value, 35461.897, 'Verified OECD EUR constant-price observation');
  assert.equal(wages.series.oecd.find(p => p.year === 2025).value, 34732.901);
  assert.ok(Math.abs(wages.series.oecd.at(-1).index - 97.9442836910304) < 1e-6);
}
assert.equal(wages.series.ameco[0].value, 39.42823);
assert.equal(wages.series.ameco.find(p => p.year === 1990).value, 112.1829);
const wageLine = oecd.split(/\r?\n/).find(line => line.includes('ITA,WG,EUR,A,Q,MEAN,_Z,1990,'));
assert.throws(() => prepareWageData(oecd + '\n' + wageLine, ameco, wageMetadata), /Duplicate/);
assert.throws(() => prepareWageData(oecd.replace(wageLine, ''), ameco, wageMetadata), /Missing 1990/);
assert.throws(() => prepareWageData(oecd.replace(wageLine, wageLine.replace('35461.897', '')), ameco, wageMetadata), /missing value/);
assert.throws(() => prepareWageData(oecd.replace(wageLine, wageLine.replace(',A,0,0', ',F,0,0')), ameco, wageMetadata), /Unexpected wage status/);
assert.throws(() => prepareWageData(oecd, ameco.replace('ITA.3.1.0.0.RWCDC;', 'ITA.WRONG;'), wageMetadata), /Unexpected AMECO/);
assert.throws(() => prepareWageData(oecd, ameco, { ...wageMetadata, amecoLastHistoricalYear: 2026 }), /forecast cutoff/);
assert.equal(createHash('sha256').update(oecd).digest('hex'), wageMetadata.oecdSha256, 'Original OECD export fingerprint');
for (const [id, countries] of Object.entries(wages.comparisons)) {
  assert.deepEqual(countries.map(c => c.code), ['ITA', 'FRA', 'DEU', 'ESP', 'NLD', 'USA']);
  for (const country of countries) {
    const base = country.points.find(p => p.year === 1990);
    assert.equal(base.index, 100);
    assert.ok(country.points.every(p => Math.abs(p.index / 100 - p.value / base.value) < 1e-12));
    assert.equal(country.points[0].year, id === 'oecd' ? 1990 : 1960);
    assert.equal(country.points.at(-1).year, 2025);
    if (id === 'ameco') assert.ok(country.points.every(p => p.year <= wageMetadata.amecoLastHistoricalYear));
  }
  assert.equal(await readFile(new URL(`../dist/data/salari-${id}.csv`, import.meta.url), 'utf8'), wageCsv(wages, id));
  assert.equal(wageCsv(wages, id).trim().split('\r\n').length, 1 + countries.reduce((sum, c) => sum + c.points.length, 0));
}
assert.equal(wages.comparisons.oecd.find(c => c.code === 'USA').points.at(-1).value, 86977.138);
assert.equal(wages.comparisons.oecd.find(c => c.code === 'FRA').points[0].value, 44931.497);
assert.ok(wages.comparisons.oecd[0].points.every((p, i) => Math.abs(p.index - wages.series.oecd[i].index) < 0.00001), 'Fixed PPP conversion preserves Italian growth');
const comparisonLine = oecd.split(/\r?\n/).find(line => line.includes('FRA,WG,USD_PPP,A,Q,MEAN,_Z,1990,'));
assert.throws(() => prepareWageData(oecd + '\n' + comparisonLine, ameco, wageMetadata), /Duplicate/);
assert.throws(() => prepareWageData(oecd.replace(comparisonLine, ''), ameco, wageMetadata), /Missing 1990/);
assert.throws(() => prepareWageData(oecd.replace(comparisonLine, comparisonLine.replace(',2025,A,0,', ',2025,F,0,')), ameco, wageMetadata), /Unexpected comparison wage/);
assert.throws(() => prepareWageData(oecd.replace(comparisonLine, comparisonLine.replace(',2025,A,0,', ',2024,A,0,')), ameco, wageMetadata), /Unexpected comparison wage/);
assert.throws(() => prepareWageData(oecd, ameco.replace('USA.3.1.0.0.RWCDC;', 'USA.WRONG;'), wageMetadata), /Unexpected AMECO comparison/);
const withGap = structuredClone(wages);
withGap.comparisons.oecd.find(c => c.code === 'FRA').points = withGap.comparisons.oecd.find(c => c.code === 'FRA').points.filter(p => p.year !== 2000 && p.year !== 2025);
const gapHtml = renderWageCharts(withGap);
assert.match(gapHtml, /data-common-year="2024"/, 'Select the latest shared year');
assert.match(gapHtml, /data-country="FRA" data-index="">n.d.<\/td>/);
assert.equal((wagePath(withGap.comparisons.oecd.find(c => c.code === 'FRA').points, y => y, i => i).match(/M/g) ?? []).length, 2, 'No line bridges a missing year');
assert.equal((renderWageCharts(wages).match(/class="wage-line"/g) ?? []).length, 12);
console.log(`Wage checks passed: OECD ${wages.series.oecd[0].year}–${wages.series.oecd.at(-1).year}, AMECO ${wages.series.ameco[0].year}–${wages.series.ameco.at(-1).year}, source values, constant-price selection, rebasing, forecast exclusion and invalid-data rejection.`);

const pensionSource = await readFile(new URL('../dist/data/pensions/oecd.csv', import.meta.url), 'utf8');
const pensionMetadata = JSON.parse(await readFile(new URL('../dist/data/pensions/retrieval.json', import.meta.url), 'utf8'));
assert.equal(createHash('sha256').update(pensionSource).digest('hex'), pensionMetadata.sha256, 'Preserve the original pension snapshot');
const pensions = preparePensionData(pensionSource, pensionMetadata);
assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/pensions.json', import.meta.url), 'utf8')), pensions);
assert.equal(await readFile(new URL('../dist/data/pensioni-g7.csv', import.meta.url), 'utf8'), pensionCsv(pensions));
assert.equal(pensions.series.length, 7);
assert.equal(pensions.firstYear, 1980);
assert.equal(pensions.commonYear, 2021);
assert.equal(pensions.series.find(c => c.code === 'ITA').points.find(p => p.year === 2021).value, 16.089);
assert.equal(pensions.series.find(c => c.code === 'USA').points.find(p => p.year === 2023).value, 7.314);
const pensionLine = pensionSource.split(/\r?\n/).find(line => line.includes(',ITA,') && line.includes(',2021,'));
assert.throws(() => preparePensionData(pensionSource + '\n' + pensionLine, pensionMetadata), /Duplicate/);
assert.throws(() => preparePensionData(pensionSource.replace(pensionLine, pensionLine.replace(',A,0,1,', ',F,0,1,')), pensionMetadata), /Unexpected pension/);
for (const [before, after] of [['PT_B1GQ', 'USD'], ['ES10', 'ES20'], [',C,TP01', ',_T,TP01'], ['16.089', '-1'], ['16.089', 'NaN']]) {
  assert.throws(() => preparePensionData(pensionSource.replace(pensionLine, pensionLine.replace(before, after)), pensionMetadata), /Unexpected pension|Invalid pension/);
}
const missingPension = preparePensionData(pensionSource.replace(pensionLine, pensionLine.replace('16.089', '')), pensionMetadata);
assert.equal(missingPension.commonYear, 2020, 'The default year must contain every country');
assert.ok(!missingPension.series.find(c => c.code === 'ITA').points.some(p => p.year === 2021), 'Blank values must not become zero');
assert.throws(() => preparePensionData(pensionSource.split(/\r?\n/).filter(line => !line.includes(',ITA,')).join('\n'), pensionMetadata), /Missing pension series/);
const gapLine = pensionSource.split(/\r?\n/).find(line => line.includes(',ITA,') && line.includes(',2000,'));
const gap = preparePensionData(pensionSource.replace(gapLine, ''), pensionMetadata);
assert.equal((pensionPath(gap.series[0].points, year => year, value => value).match(/M/g) || []).length, 2, 'A missing year must break the line');
const pensionHtml = renderPensionChart(pensions);
assert.equal((pensionHtml.match(/class="pension-line"/g) || []).length, 7);
assert.ok(pensionHtml.includes('<td data-country="ITA" data-value="">n.d.</td>'), 'Trailing missing years are explicit in the table');
assert.ok(html.includes(pensionHtml), 'The generated chart and accessible table must match the snapshot');
console.log(`Pension checks passed: G7 ${pensions.firstYear}–${pensions.lastYear}, common year ${pensions.commonYear}, source fingerprint, exact values, units, duplicates, forecast rejection and visible gaps.`);

const ventureSource = await readFile(new URL('../dist/data/venture/oecd.csv', import.meta.url), 'utf8');
const ventureMetadata = JSON.parse(await readFile(new URL('../dist/data/venture/retrieval.json', import.meta.url), 'utf8'));
const venture = prepareVentureData(ventureSource, ventureMetadata);
assert.equal(createHash('sha256').update(ventureSource).digest('hex'), ventureMetadata.sha256);
assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/venture.json', import.meta.url), 'utf8')), venture);
assert.equal(await readFile(new URL('../dist/data/investimenti-nuove-imprese.csv', import.meta.url), 'utf8'), ventureCsv(venture));
assert.deepEqual(venture.series.map(c => c.code).sort(), ['CHE', 'DEU', 'ESP', 'FRA', 'GBR', 'ITA', 'NLD', 'SWE', 'USA']);
assert.equal(venture.firstYear, 2007);
assert.equal(venture.commonYear, 2025);
assert.equal(venture.series.find(c => c.code === 'USA').points.find(p => p.year === 2021).value, 1.1258546128275744, 'Verified US peak from the original OECD export');
assert.equal(venture.series[0].points.find(p => p.year === 2025).value, 0.049246900565299165, 'Verified Italian share, already in percent of GDP');
const ventureLine = ventureSource.split(/\r?\n/).find(line => line.includes(',ITA,') && line.includes(',2025,'));
assert.throws(() => prepareVentureData(ventureSource + '\n' + ventureLine, ventureMetadata), /Duplicate/);
for (const [before, after] of [['PT_B1GQ', 'USD'], ['VC_INV_MKT', 'OTHER'], [',_T,', ',SEED,'], [',A,0,', ',F,0,'], ['0.049246900565299165', '-1'], ['0.049246900565299165', 'NaN'], [',2025,', ',2026,']]) {
  assert.throws(() => prepareVentureData(ventureSource.replace(ventureLine, ventureLine.replace(before, after)), ventureMetadata), /Unexpected venture|Invalid.*venture/);
}
assert.throws(() => prepareVentureData(ventureSource.split(/\r?\n/).filter(line => !line.includes(',ITA,')).join('\n'), ventureMetadata), /Missing venture/);
const ventureMissing = prepareVentureData(ventureSource.replace(ventureLine, ventureLine.replace('0.049246900565299165', '')), ventureMetadata);
assert.equal(ventureMissing.commonYear, 2024, 'The selected year must have all nine countries');
assert.ok(!ventureMissing.series[0].points.some(p => p.year === 2025), 'A blank observation is missing, never zero');
assert.match(renderVentureChart(ventureMissing), /data-country="ITA" data-value="">n.d.<\/td>/);
const ventureGap = structuredClone(venture);
ventureGap.series[0].points = ventureGap.series[0].points.filter(p => p.year !== 2020);
assert.equal((pensionPath(ventureGap.series[0].points, year => year, value => value).match(/M/g) || []).length, 2);
assert.equal((renderVentureChart(venture).match(/class="venture-line"/g) || []).length, 9);
assert.ok(html.includes(renderVentureChart(venture)), 'Chart and accessible table match the preserved source');
console.log(`New-business investment checks passed: nine countries, ${venture.firstYear}–${venture.lastYear}, original source fingerprint and values, units, missing years, duplicates and forecast rejection.`);

const migrationRaw = JSON.parse(await readFile(new URL('../dist/data/migration/published-table.json', import.meta.url), 'utf8'));
const migrationMetadata = JSON.parse(await readFile(new URL('../dist/data/migration/retrieval.json', import.meta.url), 'utf8'));
const migration = prepareMigrationData(migrationRaw, migrationMetadata);
for (const edition of ['2025', '2026']) {
  const source = await readFile(new URL(`../dist/data/migration/cnel-${edition}.pdf`, import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), migrationMetadata.sources[edition].sha256, 'Preserve the reports used for numerical recovery');
}
assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/migration.json', import.meta.url), 'utf8')), migration);
assert.equal(await readFile(new URL('../dist/data/migrazioni-giovani.csv', import.meta.url), 'utf8'), migrationCsv(migration));
assert.equal(migration.countries.length, 11);
const migrationItaly = migration.countries.find(c => c.code === 'ITA');
assert.equal(migrationItaly.departures, 26.9);
assert.equal(migrationItaly.arrivals, 1.9);
assert.equal(migrationItaly.isfm, 14.520, 'Use the published index, not a quotient of already rounded percentages');
assert.equal(migration.countries.find(c => c.code === 'GBR').arrivals, 16.9);
assert.equal(migration.countries.find(c => c.code === 'CHE').departures, 4.3);
assert.deepEqual(migration.totals, { departures: 108.9, arrivals: 115.2 }, 'Disclose source aggregates without silently normalising them to 100');
for (const change of [r => { r.age.min = 18; }, r => { r.period.lastYear = 2024; }, r => { r.unit = 'people'; }, r => { r.observations[0].arrivals = null; }, r => { r.observations[0].arrivals = ''; }, r => { r.observations[0].departures = -1; }, r => { r.observations[0].isfm = 20; }, r => { r.observations[1] = r.observations[0]; }, r => { r.observations.pop(); }]) {
  const changed = structuredClone(migrationRaw);
  change(changed);
  assert.throws(() => prepareMigrationData(changed, migrationMetadata), /migration|Migration/);
}
const migrationHtml = renderMigrationChart(migration);
assert.equal((migrationHtml.match(/class="migration-dot"/g) || []).length, 11);
assert.equal((migrationHtml.match(/data-migration-row=/g) || []).length, 11);
assert.ok(migrationHtml.includes('left:89.66666666666666%;top:93.66666666666667%'), 'Italy is plotted with departures on x and arrivals on y on equal zero-based scales');
assert.ok(html.includes(migrationHtml));
assert.ok(html.includes('115,2%') && html.includes('108,9%'), 'Source aggregation limits are visible in the method');
console.log('Youth migration checks passed: 11 published country observations, source PDF fingerprints, period/age/unit validation, unmodified source totals, published indices, accessible table and CSV.');

const fiscalRaw = JSON.parse(await readFile(new URL('../dist/data/fiscal/published-shares.json', import.meta.url), 'utf8'));
const fiscalGeometry = JSON.parse(await readFile(new URL('../dist/data/fiscal/source-geometry.json', import.meta.url), 'utf8'));
const fiscalMetadata = JSON.parse(await readFile(new URL('../dist/data/fiscal/retrieval.json', import.meta.url), 'utf8'));
const fiscal = prepareFiscalData(fiscalRaw, fiscalGeometry, fiscalMetadata);
assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/fiscal.json', import.meta.url), 'utf8')), fiscal);
assert.equal(await readFile(new URL('../dist/data/famiglie-saldo-fiscale.csv', import.meta.url), 'utf8'), fiscalCsv(fiscal));
// Written results in the conclusion independently validate the calibration,
// country mapping and rounding of the recovered vector bars.
for (const [code, value] of Object.entries({ IT: 39.4, EL: 40.7, IE: 41.8, AT: 42.6, PL: 43.2, DK: 53.1, SK: 53.5, EE: 54.7, LV: 56.9, LT: 58.0 })) {
  assert.equal(fiscal.countries.find(c => c.code === code).contributors, value, 'Recovered share agrees with the paper’s written result');
}
assert.equal(fiscal.countries[0].beneficiaries, 60.6);
assert.equal(fiscal.countries[0].code, 'IT');
assert.ok(fiscal.countries.every((c, i, all) => Math.abs(c.beneficiaries + c.contributors - 100) < 1e-10 && (i === 0 || c.beneficiaries <= all[i - 1].beneficiaries)), 'Every bar totals 100 and countries follow the displayed ranking');
for (const change of [r => { r.year = 2025; }, r => { r.unit = 'percent_people'; }, r => { r.concept = 'disposable_income'; }, r => { r.observations[0].contributors = null; }, r => { r.observations[0].contributors = 39; }, r => { r.observations[1] = r.observations[0]; }, r => { r.observations.pop(); }]) {
  const changed = structuredClone(fiscalRaw);
  change(changed);
  assert.throws(() => prepareFiscalData(changed, fiscalGeometry, fiscalMetadata), /fiscal/);
}
assert.throws(() => prepareFiscalData(fiscalRaw, { ...fiscalGeometry, oneY: fiscalGeometry.zeroY + 1 }, fiscalMetadata), /fiscal source scale/);
const changedGeometry = structuredClone(fiscalGeometry);
changedGeometry.bars[0].top -= 1;
assert.throws(() => prepareFiscalData(fiscalRaw, changedGeometry, fiscalMetadata), /source geometry/);
const fiscalSection = html.split('id="famiglie" open>')[1].split('</ol>')[0];
assert.deepEqual([...fiscalSection.matchAll(/data-fiscal-country="([A-Z]+)"/g)].map(match => match[1]), fiscal.countries.map(c => c.code), 'All 25 source countries appear once in chart order');
assert.ok(fiscalSection.includes('60,6%') && fiscalSection.includes('39,4%'), 'The Italian bar uses the source precision');
assert.ok(html.includes('id="metodo-famiglie"') && html.includes('eventuali saldi nulli') && html.includes('sistema fiscale del 2022'), 'Definitions, complement convention and reference year accompany the chart');
console.log('Household fiscal checks passed: 25 countries, 2022 policy year, vector calibration, ten independently published values, complementary shares, invalid-input rejection and reproducible CSV.');
