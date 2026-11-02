export const ventureCountries = [
  { code: 'ITA', name: 'Italia', dash: '' },
  { code: 'USA', name: 'Stati Uniti', dash: '' },
  { code: 'SWE', name: 'Svezia', dash: '8 3' },
  { code: 'CHE', name: 'Svizzera', dash: '' },
  { code: 'GBR', name: 'Regno Unito', dash: '3 3' },
  { code: 'NLD', name: 'Paesi Bassi', dash: '10 3 2 3' },
  { code: 'ESP', name: 'Spagna', dash: '' },
  { code: 'FRA', name: 'Francia', dash: '6 3' },
  { code: 'DEU', name: 'Germania', dash: '2 3' },
];
export const ventureSource = 'https://data-explorer.oecd.org/vis?df[ag]=OECD.SDD.TPS&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_VC%40DF_VC_INV&df[vs]=1.0&dq=USA%2BSWE%2BCHE%2BGBR%2BNLD%2BESP%2BFRA%2BDEU%2BITA.._T.PT_B1GQ.A&pd=2007%2C&vw=tb';
export const ventureApiUrl = 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_VC@DF_VC_INV,1.0/USA+SWE+CHE+GBR+NLD+ESP+FRA+DEU+ITA.._T.PT_B1GQ.A?startPeriod=2007&endPeriod=2025&format=csvfile';
export const ventureStructureUrl = 'https://sdmx.oecd.org/public/rest/dataflow/OECD.SDD.TPS/DSD_VC@DF_VC_INV/1.0?references=all';

// The OECD code-only export has no quoted fields or embedded commas.
export function prepareVentureData(csv, metadata) {
  const [header, ...lines] = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  const columns = header.split(',');
  const required = {
    DATAFLOW: 'OECD.SDD.TPS:DSD_VC@DF_VC_INV(1.0)', MEASURE: 'VC_INV_MKT',
    BUSINESS_DEVELOPMENT_STAGE: '_T', UNIT_MEASURE: 'PT_B1GQ', FREQ: 'A', UNIT_MULT: '0', CURRENCY: '_Z',
  };
  if (['REF_AREA', 'TIME_PERIOD', 'OBS_VALUE', 'OBS_STATUS', ...Object.keys(required)].some(key => !columns.includes(key))) throw new Error('Missing venture capital CSV columns');
  if (!metadata?.retrievedAt || !Number.isFinite(Date.parse(metadata.retrievedAt))) throw new Error('Missing venture capital retrieval date');
  const series = ventureCountries.map(country => ({ ...country, points: [] }));
  const seen = new Set();
  for (const line of lines.filter(line => line.trim())) {
    const cells = line.split(',');
    if (cells.length !== columns.length || line.includes('"')) throw new Error('Unexpected venture capital CSV format');
    const row = Object.fromEntries(columns.map((key, i) => [key, cells[i].trim()]));
    const country = series.find(country => country.code === row.REF_AREA);
    if (!country) throw new Error('Unexpected venture capital country');
    if (Object.entries(required).some(([key, value]) => row[key] !== value) || row.OBS_STATUS !== 'A') throw new Error('Unexpected venture capital series, unit or status; review the source');
    const year = Number(row.TIME_PERIOD);
    if (!/^\d{4}$/.test(row.TIME_PERIOD) || year < 2007 || year >= new Date(metadata.retrievedAt).getUTCFullYear()) throw new Error('Invalid or incomplete venture capital year');
    const key = `${country.code}:${year}`;
    if (seen.has(key)) throw new Error('Duplicate venture capital observation');
    seen.add(key);
    if (!row.OBS_VALUE) continue;
    const value = Number(row.OBS_VALUE);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid venture capital observation');
    country.points.push({ year, value, status: row.OBS_STATUS });
  }
  for (const country of series) {
    country.points.sort((a, b) => a.year - b.year);
    if (country.points.length < 2) throw new Error(`Missing venture capital series: ${country.code}`);
  }
  const commonYears = series[0].points.map(p => p.year).filter(year => series.every(country => country.points.some(p => p.year === year)));
  if (!commonYears.length) throw new Error('No common venture capital year');
  const years = series.flatMap(country => country.points.map(p => p.year));
  return { ...metadata, source: ventureSource, firstYear: Math.min(...years), lastYear: Math.max(...years), commonYear: commonYears.at(-1), series };
}

export function ventureCsv(data) {
  const rows = [
    ['anno', 'paese', 'codice_paese', 'investimenti_nuove_imprese_percentuale_pil', 'stato_ocse', 'perimetro', 'fonte', 'verificato_il'],
    ...data.series.flatMap(country => country.points.map(p => [p.year, country.name, country.code, p.value, p.status, 'Investimenti nel capitale delle nuove imprese; statistiche di mercato OCSE', data.oecdUrl, data.retrievedAt])),
  ];
  return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
}
