export const fiscalSources = {
  paper: 'https://www.econstor.eu/bitstream/10419/319679/1/GLO-DP-1620.pdf#page=25',
  publication: 'https://euromod-web.jrc.ec.europa.eu/research/publications/net-fiscal-contributions-eu-role-indirect-taxation-and-kind-benefits',
  journal: 'https://doi.org/10.1111/kykl.70009',
};

const countries = {
  IT: 'Italia', EL: 'Grecia', IE: 'Irlanda', AT: 'Austria', PL: 'Polonia',
  HU: 'Ungheria', FR: 'Francia', BE: 'Belgio', ES: 'Spagna', NL: 'Paesi Bassi',
  SE: 'Svezia', FI: 'Finlandia', HR: 'Croazia', PT: 'Portogallo', BG: 'Bulgaria',
  CZ: 'Cechia', RO: 'Romania', DE: 'Germania', LU: 'Lussemburgo', SI: 'Slovenia',
  DK: 'Danimarca', SK: 'Slovacchia', EE: 'Estonia', LV: 'Lettonia', LT: 'Lituania',
};
const fingerprint = '2bb616ea49be5a0473d87b15110c3717eaf6776d02f3a1cfd59dcd1074b573a8';
const complete = rows => Array.isArray(rows) && rows.length === 25 && new Set(rows.map(row => row.code)).size === 25 && rows.every(row => Object.hasOwn(countries, row.code));

export function prepareFiscalData(raw, geometry, metadata) {
  if (raw?.year !== 2022 || raw.unit !== 'percent_households' || raw.concept !== 'extended_income' || raw.precision !== 1) throw new Error('Unexpected fiscal period, unit, concept or precision; review the source');
  if (metadata?.sha256 !== fingerprint || metadata.url !== fiscalSources.paper.split('#')[0] || metadata.publicationYear !== 2025 || metadata.figure !== 10 || metadata.pdfPage !== 25 || !Number.isFinite(Date.parse(metadata.retrievedAt))) throw new Error('Unexpected fiscal source metadata');
  if (!complete(raw.observations) || !complete(geometry?.bars)) throw new Error('Missing, duplicate or unknown fiscal countries');
  if (geometry.figure !== 10 || geometry.pdfPage !== 25 || geometry.printedPage !== 24 || !Number.isFinite(geometry.zeroY) || !Number.isFinite(geometry.oneY) || geometry.zeroY <= geometry.oneY) throw new Error('Invalid fiscal source scale');
  const observations = raw.observations.map(observation => {
    const bar = geometry.bars.find(bar => bar.code === observation.code);
    if (['x0', 'x1', 'top', 'bottom'].some(key => !Number.isFinite(bar[key])) || bar.x0 >= bar.x1 || Math.abs(bar.bottom - geometry.zeroY) > .001 || bar.top < geometry.oneY || bar.top > geometry.zeroY) throw new Error('Invalid fiscal source bar');
    const recovered = Math.round((geometry.zeroY - bar.top) / (geometry.zeroY - geometry.oneY) * 1000) / 10;
    if (typeof observation.contributors !== 'number' || !Number.isFinite(observation.contributors) || observation.contributors < 0 || observation.contributors > 100 || observation.contributors !== recovered) throw new Error('Invalid fiscal share or disagreement with source geometry');
    return { code: observation.code, name: countries[observation.code], contributors: observation.contributors, beneficiaries: Math.round((100 - observation.contributors) * 10) / 10 };
  });
  return { ...metadata, year: raw.year, precision: raw.precision, sources: fiscalSources, countries: observations.sort((a, b) => b.beneficiaries - a.beneficiaries) };
}

export function fiscalCsv(data) {
  const rows = [
    ['paese', 'codice_fonte', 'anno_sistema_fiscale', 'anno_pubblicazione', 'contribuenti_nette_percento_famiglie', 'beneficiarie_nette_complemento_percento_famiglie', 'metodo', 'fonte', 'verificato_il'],
    ...data.countries.map(c => [c.name, c.code, data.year, data.publicationYear, c.contributors.toFixed(1), c.beneficiaries.toFixed(1), 'Stime EUROMOD; concetto esteso; pensioni come trasferimenti; quote ricavate dalle barre vettoriali della figura 10, arrotondate a 0.1 punti percentuali; beneficiarie = 100 - contribuenti; saldi nulli non distinti', data.sources.paper, data.retrievedAt]),
  ];
  return '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
}
