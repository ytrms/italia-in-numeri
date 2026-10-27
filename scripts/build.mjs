import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { prepareData, sourceUrl } from '../src/data.mjs';

const raw = JSON.parse(await readFile(new URL('../dist/data/eurostat-raw.json', import.meta.url), 'utf8'));
const { retrievedAt } = JSON.parse(await readFile(new URL('../dist/data/retrieval.json', import.meta.url), 'utf8'));
const data = prepareData(raw, retrievedAt);
const n = value => new Intl.NumberFormat('it-IT', { useGrouping: 'always', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
const date = value => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date(value));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const shareMaximum = Math.ceil(Math.max(...data.categories.map(c => c.share)) / 10) * 10;
const amountMaximum = Math.ceil(Math.max(...data.categories.map(c => c.amount / 1000)) / 100) * 100;
const rows = data.categories.map(category => {
  const flags = [...new Set(category.observations.map(o => o.status).filter(Boolean))];
  return `<details class="spending-row" id="${category.id}" data-share="${category.share}" data-amount="${category.amount / 1000}">
  <summary>
    <span class="row-label">${escape(category.label)}${category.note ? `<span class="row-note">${escape(category.note)}</span>` : ''}</span>
    <span class="bar-track" aria-hidden="true"><span class="bar" style="--bar-width: ${category.amount / 1000 / amountMaximum * 100}%"></span></span>
    <span class="row-value" aria-label="${n(category.amount / 1000)} miliardi di euro">${n(category.amount / 1000)}</span>
    <span class="plus" aria-hidden="true"></span>
  </summary>
  <div class="row-detail">
    <p class="detail-amount">${n(category.amount / 1000)} miliardi di euro <span aria-hidden="true">·</span> ${n(category.share)}% della spesa totale</p>
    <p>${escape(category.description)}</p>
    ${flags.length ? `<p>Flag Eurostat: ${flags.map(escape).join(', ')}. Consulta i metadati della fonte.</p>` : ''}
    <p class="detail-code"><span>COFOG: ${escape(category.formula)}</span><a href="${sourceUrl}&amp;cofog99=${category.terms[0][0]}" target="_blank" rel="noopener noreferrer">Consulta la fonte <span aria-hidden="true">↗</span></a></p>
  </div>
</details>`;
}).join('\n');

let html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
const replacements = {
  YEAR: String(data.year), TOTAL_BILLIONS: n(data.total / 1000), ROWS: rows,
  RETRIEVED_DATE: date(retrievedAt), UPDATED_DATE: date(data.datasetUpdated), API_URL: escape(data.apiUrl),
  AXIS: Array.from({ length: 5 }, (_, i) => `<span>${amountMaximum * i / 4}</span>`).join(''),
};
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
  if (!(key in replacements)) throw new Error(`Unknown template key: ${key}`);
  return replacements[key];
});
html = html.replace('class="chart"', `class="chart" data-share-maximum="${shareMaximum}" data-amount-maximum="${amountMaximum}" data-total="${data.total / 1000}"`);
await mkdir(new URL('../dist', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/index.html', import.meta.url), html);
for (const name of ['styles.css', 'app.js', 'favicon.svg']) await copyFile(new URL(`../src/${name}`, import.meta.url), new URL(`../dist/${name}`, import.meta.url));
await writeFile(new URL('../dist/data/spending.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
const csv = [
  ['anno', 'voce', 'milioni_euro', 'quota_percentuale', 'formula_cofog', 'fonte', 'verificato_il'],
  ...data.categories.map(c => [data.year, c.label, c.amount.toFixed(1), c.share.toFixed(6), c.formula, sourceUrl, retrievedAt]),
  [data.year, 'Totale', data.total.toFixed(1), '100', 'TOTAL', sourceUrl, retrievedAt],
].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
await writeFile(new URL('../dist/data/spesa-pubblica.csv', import.meta.url), '\uFEFF' + csv + '\r\n');
console.log(`Built ${data.year}: ${data.categories.length} categories, €${n(data.total / 1000)} billion. Source retrieved ${retrievedAt}.`);
