export const regionalSources = {
  catalog: 'https://www.politichecoesione.governo.it/it/politica-di-coesione/misurazione-valutazione-e-trasparenza/la-misurazione-delle-politiche-di-coesione/conti-pubblici-territoriali-cpt/i-dati/catalogo-open-cpt/',
  revenue: 'https://www.politichecoesione.governo.it/media/yhqdfy5d/en_pa_cemacro.csv',
  spending: 'https://www.politichecoesione.governo.it/media/e31aeyon/sp_pa_cemacro.csv',
  method: 'https://www.politichecoesione.governo.it/media/lvijyngd/guida-ai-conti-pubblici-territoriali-cpt.pdf#page=98',
};

const names = ['Piemonte', 'Valle d’Aosta', 'Lombardia', 'Trentino-Alto Adige / Südtirol', 'Veneto', 'Friuli-Venezia Giulia', 'Liguria', 'Emilia-Romagna', 'Toscana', 'Umbria', 'Marche', 'Lazio', 'Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria', 'Sicilia', 'Sardegna'];
const territories = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const codes = { revenue: ['091', '160', '163'], spending: ['373', '442', '445'] };

// These two CPT exports contain unquoted, semicolon-separated fields and decimal commas.
// Reject changed schemas or malformed values instead of silently plotting zeros.
export function parseCpt(text, flow) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').filter(line => line.replaceAll(';', '').trim());
  const header = flow === 'revenue'
    ? 'Territorio;Regione per Dettaglio;Categoria Entrate;Anno;E - Consolidato PA'
    : 'Territorio;Regione per Dettaglio;Categoria Spese;Anno;S - Consolidato PA';
  if (lines.shift() !== header) throw new Error(`Unexpected CPT ${flow} schema`);
  const observations = new Map();
  for (const line of lines) {
    const cells = line.split(';');
    const territory = Number(cells[1]?.match(/^(\d{2}) - /)?.[1]);
    const code = cells[2]?.match(/^[ES] - (\d{3}) - /)?.[1];
    const year = Number(cells[3]);
    if (cells.length !== 5 || !territories.includes(territory) || !codes[flow].includes(code)
      || !/^\d{4}$/.test(cells[3]) || !/^-?\d+(,\d+)?$/.test(cells[4])) throw new Error(`Invalid CPT ${flow} row: ${line}`);
    const value = Number(cells[4].replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid CPT amount');
    const key = `${year}:${territory}:${code}`;
    if (observations.has(key)) throw new Error(`Duplicate CPT observation: ${key}`);
    observations.set(key, value);
  }
  return observations;
}

export function prepareRegionalData(revenueCsv, spendingCsv, retrievedAt) {
  const tables = { revenue: parseCpt(revenueCsv, 'revenue'), spending: parseCpt(spendingCsv, 'spending') };
  const years = [...new Set([...tables.revenue.keys(), ...tables.spending.keys()].map(key => Number(key.split(':')[0])))].sort((a, b) => b - a);
  const year = years.find(y => Object.entries(tables).every(([flow, observations]) => territories.every(id => codes[flow].every(code => observations.has(`${y}:${id}:${code}`)))));
  if (!year) throw new Error('No complete CPT year for all 21 territories');
  for (const [flow, table] of Object.entries(tables)) {
    for (const id of territories) {
      const [current, capital, total] = codes[flow].map(code => table.get(`${year}:${id}:${code}`));
      if (Math.abs(current + capital - total) > .001) throw new Error(`CPT totals do not reconcile: ${flow}, ${id}`);
    }
  }
  const regions = names.map((name, index) => {
    const id = index + 1;
    const sourceTerritories = id === 4 ? [21, 22] : [id];
    const revenue = sourceTerritories.reduce((sum, t) => sum + tables.revenue.get(`${year}:${t}:163`), 0);
    const spending = sourceTerritories.reduce((sum, t) => sum + tables.spending.get(`${year}:${t}:445`), 0);
    return { id, name, sourceTerritories, revenue, spending, balance: revenue - spending };
  });
  return { year, retrievedAt, unit: 'million EUR', basis: 'cash', scope: 'PA', formula: 'E163 − S445', sources: regionalSources, regions };
}

// One symmetric linear scale in billions, shared by the map and its legend.
export function balanceScale(regions) {
  return Math.ceil(Math.max(...regions.map(r => Math.abs(r.balance))) / 10000) * 10;
}
export function balanceColor(balance, maximum, theme = 'light') {
  const neutral = theme === 'dark' ? [104, 104, 99] : [246, 245, 242];
  const end = theme === 'dark'
    ? (balance >= 0 ? [103, 184, 146] : [222, 122, 111])
    : (balance >= 0 ? [38, 113, 82] : [164, 57, 50]);
  const weight = Math.min(Math.abs(balance) / 1000 / maximum, 1);
  return `rgb(${neutral.map((value, i) => Math.round(value + (end[i] - value) * weight)).join(', ')})`;
}
