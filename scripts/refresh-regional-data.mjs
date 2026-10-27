import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { prepareRegionalData, regionalSources } from '../src/regional-data.mjs';

const [revenue, spending] = await Promise.all(['revenue', 'spending'].map(async flow => {
  const response = await fetch(regionalSources[flow]);
  if (!response.ok) throw new Error(`CPT ${flow}: HTTP ${response.status}`);
  return response.text();
}));
const retrievedAt = new Date().toISOString();
const data = prepareRegionalData(revenue, spending, retrievedAt);
// Validate both files before replacing either snapshot. Review source changes before publishing.
await writeFile(new URL('../dist/data/cpt/entrate.csv', import.meta.url), revenue);
await writeFile(new URL('../dist/data/cpt/spese.csv', import.meta.url), spending);
await writeFile(new URL('../dist/data/cpt/retrieval.json', import.meta.url), JSON.stringify({ retrievedAt, sources: regionalSources }, null, 2) + '\n');
execFileSync(process.execPath, [new URL('./build.mjs', import.meta.url).pathname], { stdio: 'inherit' });
console.log(`Refreshed CPT: ${data.year}, ${data.regions.length} regions. Review method, snapshot and map before deployment.`);
