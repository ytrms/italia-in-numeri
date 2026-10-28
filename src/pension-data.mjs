export const pensionCountries = [
  { code: 'ITA', name: 'Italia', dash: '' },
  { code: 'FRA', name: 'Francia', dash: '' },
  { code: 'DEU', name: 'Germania', dash: '8 3' },
  { code: 'JPN', name: 'Giappone', dash: '' },
  { code: 'GBR', name: 'Regno Unito', dash: '3 3' },
  { code: 'USA', name: 'Stati Uniti', dash: '10 3 2 3' },
  { code: 'CAN', name: 'Canada', dash: '6 3' },
];
export const pensionSources = {
  indicator: 'https://www.oecd.org/en/data/indicators/pension-spending.html',
  report: 'https://www.oecd.org/en/publications/pensions-at-a-glance-2025_e40274c1-en/full-report/public-expenditure-on-pensions_ddc9a2dd.html',
};
export const pensionApiUrl = 'https://sdmx.oecd.org/public/rest/data/OECD.ELS.SPD,DSD_SOCX_AGG@DF_PUB_OLD,1.0/ITA+FRA+DEU+JPN+GBR+USA+CAN.A..PT_B1GQ....?startPeriod=1980&format=csvfile';

// This OECD code-only export contains no quoted fields or embedded commas.
export function preparePensionData(csv, metadata) {
  const [header, ...lines] = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  const columns = header.split(',');
  const required = {
    DATAFLOW: 'OECD.ELS.SPD:DSD_SOCX_AGG@DF_PUB_OLD(1.0)',
    FREQ: 'A', MEASURE: 'SOCX', UNIT_MEASURE: 'PT_B1GQ', EXPEND_SOURCE: 'ES10',
    SPENDING_TYPE: 'C', PROGRAMME_TYPE: 'TP01', PRICE_BASE: '_Z', UNIT_MULT: '0', CURRENCY: '_Z',
  };
  if (['REF_AREA', 'TIME_PERIOD', 'OBS_VALUE', 'OBS_STATUS', ...Object.keys(required)].some(key => !columns.includes(key))) {
    throw new Error('Missing pension CSV columns');
  }
  if (!metadata?.retrievedAt || !Number.isFinite(Date.parse(metadata.retrievedAt))) throw new Error('Missing pension retrieval date');
  const series = pensionCountries.map(country => ({ ...country, points: [] }));
  const seen = new Set();
  for (const line of lines.filter(line => line.trim())) {
    const cells = line.split(',');
    if (cells.length !== columns.length || line.includes('"')) throw new Error('Unexpected pension CSV format');
    const row = Object.fromEntries(columns.map((key, i) => [key, cells[i].trim()]));
    const country = series.find(country => country.code === row.REF_AREA);
    if (!country) continue;
    if (Object.entries(required).some(([key, value]) => row[key] !== value) || row.OBS_STATUS !== 'A') {
      throw new Error('Unexpected pension series, unit or status; review the source');
    }
    const year = Number(row.TIME_PERIOD);
    if (!/^\d{4}$/.test(row.TIME_PERIOD) || year < 1980) throw new Error('Invalid pension year');
    const key = `${country.code}:${year}`;
    if (seen.has(key)) throw new Error('Duplicate pension observation');
    seen.add(key);
    // A blank observation is missing, never zero. Keep gaps in the chart.
    if (!row.OBS_VALUE) continue;
    const value = Number(row.OBS_VALUE);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid pension observation');
    country.points.push({ year, value, status: row.OBS_STATUS });
  }
  for (const country of series) {
    country.points.sort((a, b) => a.year - b.year);
    if (country.points.length < 2) throw new Error(`Missing pension series: ${country.code}`);
  }
  const commonYears = series[0].points.map(p => p.year).filter(year => series.every(country => country.points.some(p => p.year === year)));
  if (!commonYears.length) throw new Error('No common pension year');
  const years = series.flatMap(country => country.points.map(p => p.year));
  return { ...metadata, sources: pensionSources, firstYear: Math.min(...years), lastYear: Math.max(...years), commonYear: commonYears.at(-1), series };
}

export function pensionCsv(data) {
  const rows = [
    ['anno', 'paese', 'codice_paese', 'spesa_pubblica_pensioni_percentuale_pil', 'stato_ocse', 'perimetro', 'fonte', 'verificato_il'],
    ...data.series.flatMap(country => country.points.map(p => [p.year, country.name, country.code, p.value, p.status, 'Prestazioni monetarie pubbliche di vecchiaia e superstiti, lorde', data.oecdUrl, data.retrievedAt])),
  ];
  return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
}
