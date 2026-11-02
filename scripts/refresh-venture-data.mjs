import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ventureApiUrl, ventureStructureUrl, prepareVentureData } from '../src/venture-data.mjs';

const response = await fetch(ventureApiUrl, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`OECD venture capital: HTTP ${response.status}`);
const csv = await response.text();
const metadata = {
  retrievedAt: new Date().toISOString(), oecdUrl: ventureApiUrl, structureUrl: ventureStructureUrl,
  sha256: createHash('sha256').update(csv).digest('hex'),
};
const data = prepareVentureData(csv, metadata);
const directory = new URL('../dist/data/venture/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('oecd.csv', directory), csv);
await writeFile(new URL('retrieval.json', directory), JSON.stringify(metadata, null, 2) + '\n');
execFileSync(process.execPath, [new URL('./build.mjs', import.meta.url).pathname], { stdio: 'inherit' });
console.log(`Refreshed venture capital: ${data.firstYear}–${data.lastYear}, latest common year ${data.commonYear}.`);
