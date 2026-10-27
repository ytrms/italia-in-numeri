import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { prepareWageData } from '../src/wage-data.mjs';

// AMECO includes forecasts without observation-level flags. Require a reviewed
// release and historical cutoff rather than automatically treating them as actuals.
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--release') || !args.includes('--last-historical-year')) {
  throw new Error('Review the AMECO release first, then pass --release YYYY-MM-DD --last-historical-year YYYY');
}
const amecoRelease = value('--release');
const amecoLastHistoricalYear = Number(value('--last-historical-year'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(amecoRelease)) throw new Error('Invalid release date');
const oecdUrl = 'https://sdmx.oecd.org/public/rest/data/OECD.ELS.SAE,DSD_EARNINGS@AV_AN_WAGE,1.0/ITA......?format=csvfile';
const amecoUrl = 'https://ec.europa.eu/economy_finance/db_indicators/ameco/documents/ameco7.zip';
const amecoHelpUrl = 'https://economy-finance.ec.europa.eu/document/download/ee1f3fdc-bef6-498e-9de0-d57257186a66_en?filename=Ameco+help+files+%282026_05%29.zip';
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const [oecd, archive, helpArchive] = await Promise.all([get(oecdUrl), get(amecoUrl), get(amecoHelpUrl)]);
const temporary = await mkdtemp(join(tmpdir(), 'italia-wages-'));
try {
  const zipPath = join(temporary, 'ameco7.zip');
  const helpPath = join(temporary, 'help.zip');
  await writeFile(zipPath, archive);
  await writeFile(helpPath, helpArchive);
  const decode = buffer => new TextDecoder('windows-1252').decode(buffer);
  const ameco = decode(execFileSync('unzip', ['-p', zipPath, 'AMECO7.TXT'], { maxBuffer: 16 * 1024 * 1024 }));
  const help = decode(execFileSync('unzip', ['-p', helpPath, 'RWCDC.TXT']));
  const metadata = {
    retrievedAt: new Date().toISOString(), oecdUrl, amecoUrl, amecoRelease, amecoLastHistoricalYear,
    amecoOriginalEncoding: 'windows-1252', amecoZipSha256: createHash('sha256').update(archive).digest('hex'), amecoHelpUrl,
  };
  const data = prepareWageData(oecd.toString('utf8'), ameco, metadata);
  // Publication copy deliberately records this specific vintage; update it when
  // adopting a newer edition, after checking the forecasts and historical breaks.
  const lastExportYear = Math.max(...ameco.split('\n')[0].split(';').filter(s => /^\d{4}$/.test(s.trim())).map(Number));
  if (amecoRelease !== '2026-06-03' || amecoLastHistoricalYear !== 2025 || lastExportYear !== 2027) {
    throw new Error('New AMECO vintage: update and review the on-page methodology before replacing snapshots');
  }
  const directory = new URL('../dist/data/wages/', import.meta.url);
  await writeFile(new URL('oecd.csv', directory), oecd);
  await writeFile(new URL('ameco7.txt', directory), ameco);
  await writeFile(new URL('RWCDC.txt', directory), help);
  await writeFile(new URL('retrieval.json', directory), JSON.stringify(metadata, null, 2) + '\n');
  execFileSync(process.execPath, [new URL('./build.mjs', import.meta.url).pathname], { stdio: 'inherit' });
  console.log(`Refreshed wage snapshots through ${data.series.oecd.at(-1).year}. Review both definitions before publication.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
