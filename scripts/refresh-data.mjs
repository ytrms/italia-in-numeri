import { writeFile, rename } from 'node:fs/promises';
import { apiUrl, prepareData } from '../src/data.mjs';

const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`Eurostat returned ${response.status}. Existing snapshot retained.`);
const raw = await response.json();
const retrievedAt = new Date().toISOString();
const data = prepareData(raw, retrievedAt);
const directory = new URL('../dist/data/', import.meta.url);
await writeFile(new URL('eurostat-raw.json.tmp', directory), JSON.stringify(raw) + '\n');
await writeFile(new URL('retrieval.json.tmp', directory), JSON.stringify({ retrievedAt, source: apiUrl }, null, 2) + '\n');
await rename(new URL('eurostat-raw.json.tmp', directory), new URL('eurostat-raw.json', directory));
await rename(new URL('retrieval.json.tmp', directory), new URL('retrieval.json', directory));
console.log(`Validated complete data for ${data.year}. Rebuilding the static page.`);
await import('./build.mjs');
