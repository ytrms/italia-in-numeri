import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareData, observation } from '../src/data.mjs';
import { prepareRegionalData, parseCpt, balanceScale, balanceColor } from '../src/regional-data.mjs';
import { prepareWageData } from '../src/wage-data.mjs';

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
console.log(`Wage checks passed: OECD ${wages.series.oecd[0].year}–${wages.series.oecd.at(-1).year}, AMECO ${wages.series.ameco[0].year}–${wages.series.ameco.at(-1).year}, source values, constant-price selection, rebasing, forecast exclusion and invalid-data rejection.`);
