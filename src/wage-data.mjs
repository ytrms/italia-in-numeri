export const wageSources = {
  oecd: 'https://www.oecd.org/en/data/indicators/average-annual-wages.html',
  ameco: 'https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database_en',
  amecoMetadata: 'https://economy-finance.ec.europa.eu/document/download/ae8a3bbf-7a9c-446c-a91e-e4e4f721c21d_en?filename=Reference_Metadata_AMECO.pdf',
};

// The official exports have unquoted, numeric observations and no embedded delimiters.
function readTable(text, separator) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, '').split(separator).map(s => s.trim());
  return lines.filter(s => s.trim()).map(line => Object.fromEntries(line.split(separator).map((v, i) => [columns[i], v.trim()])));
}

function validateSeries(points) {
  points.sort((a, b) => a.year - b.year);
  if (!points.length) throw new Error('Missing wage series');
  points.forEach((p, i) => {
    if (!Number.isInteger(p.year) || !Number.isFinite(p.value) || p.value <= 0) throw new Error('Invalid wage observation');
    if (i && p.year !== points[i - 1].year + 1) throw new Error('Duplicate or missing wage year');
  });
  const base = points.find(p => p.year === 1990);
  if (!base) throw new Error('Missing 1990 wage baseline');
  return points.map(p => ({ ...p, index: p.value / base.value * 100 }));
}

export function prepareWageData(oecdCsv, amecoText, metadata) {
  const selected = readTable(oecdCsv, ',').filter(r => r.REF_AREA === 'ITA' && r.MEASURE === 'WG' && r.UNIT_MEASURE === 'EUR' && r.PAY_PERIOD === 'A' && r.PRICE_BASE === 'Q' && r.AGGREGATION_OPERATION === 'MEAN' && r.SEX === '_Z');
  const bases = new Set(selected.map(r => r.BASE_PER));
  if (bases.size !== 1 || !/^\d{4}$/.test([...bases][0])) throw new Error('Inconsistent wage price base');
  if (selected.some(r => r.OBS_STATUS !== 'A' || r.UNIT_MULT !== '0' || !r.OBS_VALUE)) throw new Error('Unexpected wage status, unit or missing value; review the source');
  const oecd = validateSeries(selected.map(r => ({ year: Number(r.TIME_PERIOD), value: Number(r.OBS_VALUE), status: r.OBS_STATUS })));
  const rows = readTable(amecoText, ';').filter(r => r.CODE === 'ITA.3.1.0.0.RWCDC');
  if (rows.length !== 1 || !rows[0].UNIT.includes('2020 = 100')) throw new Error('Unexpected AMECO series or base');
  const cutoff = metadata.amecoLastHistoricalYear;
  if (!Number.isInteger(cutoff) || cutoff >= Number(metadata.amecoRelease.slice(0, 4))) throw new Error('Review AMECO forecast cutoff');
  const ameco = validateSeries(Object.entries(rows[0]).filter(([key]) => /^\d{4}$/.test(key) && Number(key) <= cutoff).map(([year, value]) => ({ year: Number(year), value: value && value !== 'NA' ? Number(value) : NaN })));
  if (ameco.at(-1).year !== cutoff) throw new Error('Missing AMECO final historical year');
  return { ...metadata, baseYear: 1990, priceYear: Number([...bases][0]), sources: wageSources, series: { oecd, ameco } };
}
