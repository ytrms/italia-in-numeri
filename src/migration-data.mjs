export const migrationSources = {
  table: 'https://static.cnel.it/documenti/2025/8d714221-5082-45b2-81d2-2c6af468e749/Cnel_Rapporto_Giovani_2025.11.25.pdf#page=127',
  figure: 'https://www.cnel.it/media/docs/default-source/news-documents/rapporto-cnel_giovani-expat_2026-ultima-vers.pdf#page=17',
};
export const migrationCountries = [
  { code: 'BEL', name: 'Belgio', short: 'BE', dx: 14, dy: 15 },
  { code: 'DNK', name: 'Danimarca', short: 'DK', dx: 12, dy: -22 },
  { code: 'DEU', name: 'Germania', short: 'DE', dx: 14, dy: 16 },
  { code: 'ESP', name: 'Spagna', short: 'ES', dx: 14, dy: 15 },
  { code: 'FRA', name: 'Francia', short: 'FR', dx: 0, dy: -20 },
  { code: 'ITA', name: 'Italia', short: 'IT', dx: -14, dy: -18 },
  { code: 'NLD', name: 'Paesi Bassi', short: 'NL', dx: 14, dy: -13 },
  { code: 'AUT', name: 'Austria', short: 'AT', dx: 14, dy: -14 },
  { code: 'SWE', name: 'Svezia', short: 'SE', dx: 14, dy: 17 },
  { code: 'CHE', name: 'Svizzera', short: 'CH', dx: -12, dy: 15 },
  { code: 'GBR', name: 'Regno Unito', short: 'GB', dx: 0, dy: -20 },
];

export function prepareMigrationData(raw, metadata) {
  if (raw?.period?.firstYear !== 2011 || raw.period.lastYear !== 2023 || raw?.age?.min !== 20 || raw.age.max !== 34 || raw.unit !== 'percent' || raw?.precision?.shares !== 1 || raw.precision.publishedIsfm !== 3) throw new Error('Unexpected migration period, age range, unit or precision; review the source');
  if (!metadata?.retrievedAt || !Number.isFinite(Date.parse(metadata.retrievedAt)) || !metadata.sources?.['2025']?.sha256 || !metadata.sources?.['2026']?.sha256) throw new Error('Missing migration source metadata');
  if (!Array.isArray(raw.observations) || raw.observations.length !== migrationCountries.length || new Set(raw.observations.map(c => c.code)).size !== migrationCountries.length) throw new Error('Missing or duplicate migration countries');
  const countries = migrationCountries.map(country => {
    const observation = raw.observations.find(c => c.code === country.code);
    if (!observation || observation.name !== country.name) throw new Error('Unexpected migration country');
    for (const key of ['departures', 'arrivals', 'isfm']) {
      if (typeof observation[key] !== 'number' || !Number.isFinite(observation[key]) || observation[key] <= 0 || observation[key] > 100) throw new Error('Invalid or missing migration observation');
    }
    if (['departures', 'arrivals'].some(key => Math.abs(observation[key] * 10 - Math.round(observation[key] * 10)) > 1e-8)) throw new Error('Unexpected migration share precision');
    // The source index is calculated before rounding the published shares.
    // Validate compatibility with their rounding intervals, never recompute it.
    const minimumRatio = (observation.departures - .05) / (observation.arrivals + .05);
    const maximumRatio = (observation.departures + .05) / (observation.arrivals - .05);
    if (observation.isfm + .0005 < minimumRatio || observation.isfm - .0005 > maximumRatio) throw new Error('Migration index is inconsistent with published shares');
    return { ...country, ...observation };
  });
  const totals = Object.fromEntries(['departures', 'arrivals'].map(key => [key, Math.round(countries.reduce((sum, c) => sum + c[key], 0) * 10) / 10]));
  return { ...metadata, sources: { ...metadata.sources, ...migrationSources }, period: raw.period, age: raw.age, countries, totals };
}

export function migrationCsv(data) {
  const rows = [
    ['paese', 'codice_paese', 'eta_min', 'eta_max', 'dal', 'al', 'quota_partenze_cnel_percento', 'quota_arrivi_cnel_percento', 'isfm_pubblicato_cnel', 'metodo', 'fonte_quote', 'fonte_isfm', 'verificato_il'],
    ...data.countries.map(c => [c.name, c.code, data.age.min, data.age.max, data.period.firstYear, data.period.lastYear, c.departures.toFixed(1), c.arrivals.toFixed(1), c.isfm.toFixed(3), 'Quote pubblicate CNEL; medie 2011-23; non rinormalizzate; indice pubblicato non ricalcolato dalle quote arrotondate', data.sources.table, data.sources.figure, data.retrievedAt]),
  ];
  return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
}
