import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareData, observation } from '../src/data.mjs';

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
