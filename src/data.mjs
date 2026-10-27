export const apiUrl = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?lang=EN&freq=A&unit=MIO_EUR&sector=S13&na_item=TE&geo=IT&sinceTimePeriod=2024';
export const sourceUrl = 'https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en';

export const definitions = [
  {
    id: 'vecchiaia-superstiti', label: 'Vecchiaia e superstiti', note: 'Principalmente pensioni',
    terms: [['GF1002', 1], ['GF1003', 1]], formula: 'GF1002 + GF1003',
    description: 'Pensioni di vecchiaia, anticipate e ai superstiti, ma anche assistenza e servizi agli anziani. Questa voce non coincide con il totale di tutte le pensioni: per esempio, quelle di invalidità rientrano nell’altra protezione sociale.',
  },
  {
    id: 'sanita', label: 'Sanità', terms: [['GF07', 1]], formula: 'GF07',
    description: 'Ospedali, assistenza ambulatoriale, medicinali, prevenzione e ricerca sanitaria. È la spesa pubblica per la funzione sanità; non comprende la spesa sanitaria privata delle famiglie.',
  },
  {
    id: 'economia', label: 'Economia e trasporti', terms: [['GF04', 1]], formula: 'GF04',
    description: 'La funzione «Affari economici»: trasporti e infrastrutture, agricoltura, energia, industria, attività commerciali, politiche del lavoro e ricerca collegata.',
  },
  {
    id: 'protezione-sociale', label: 'Altra protezione sociale', terms: [['GF10', 1], ['GF1002', -1], ['GF1003', -1]], formula: 'GF10 − GF1002 − GF1003',
    description: 'Malattia e invalidità, famiglia e figli, disoccupazione, sostegni per l’abitazione, esclusione sociale e altre prestazioni. Comprende le pensioni di invalidità. Esclude vecchiaia e superstiti, mostrati separatamente.',
  },
  {
    id: 'istruzione', label: 'Istruzione', terms: [['GF09', 1]], formula: 'GF09',
    description: 'Scuole di ogni grado, università, servizi di supporto agli studenti, amministrazione e ricerca nel campo dell’istruzione.',
  },
  {
    id: 'debito', label: 'Interessi e spese sul debito', terms: [['GF0107', 1]], formula: 'GF0107',
    description: 'Interessi sul debito pubblico e spese per la sottoscrizione e l’emissione dei prestiti. Non include il rimborso del capitale, né i costi amministrativi della gestione del debito, classificati nei servizi generali.',
  },
  {
    id: 'servizi-generali', label: 'Altri servizi pubblici generali', terms: [['GF01', 1], ['GF0107', -1]], formula: 'GF01 − GF0107',
    description: 'Organi legislativi ed esecutivi, amministrazione finanziaria e fiscale, affari esteri, aiuti internazionali, servizi generali e ricerca di base. Esclude la voce sul debito, mostrata separatamente.',
  },
  {
    id: 'sicurezza', label: 'Ordine pubblico e sicurezza', terms: [['GF03', 1]], formula: 'GF03',
    description: 'Forze di polizia, vigili del fuoco, tribunali, carceri e altri servizi per l’ordine pubblico e la sicurezza.',
  },
  {
    id: 'difesa', label: 'Difesa', terms: [['GF02', 1]], formula: 'GF02',
    description: 'Difesa militare e civile, aiuti militari all’estero e ricerca collegata. Il perimetro COFOG è diverso da quello utilizzato dalla NATO: i due valori non sono direttamente confrontabili.',
  },
  {
    id: 'ambiente', label: 'Protezione dell’ambiente', terms: [['GF05', 1]], formula: 'GF05',
    description: 'Gestione dei rifiuti e delle acque reflue, riduzione dell’inquinamento, tutela della biodiversità e del paesaggio e ricerca ambientale.',
  },
  {
    id: 'cultura', label: 'Cultura, sport e culto', terms: [['GF08', 1]], formula: 'GF08',
    description: 'Attività ricreative e sportive, servizi culturali, radiotelevisione ed editoria, servizi religiosi e altri servizi per la comunità.',
  },
  {
    id: 'territorio', label: 'Abitazioni e territorio', terms: [['GF06', 1]], formula: 'GF06',
    description: 'Sviluppo delle abitazioni e del territorio, approvvigionamento idrico, illuminazione stradale e servizi connessi.',
  },
];

// Decode JSON-stat by dimension, without assuming a fixed ordering or dense values.
export function observation(raw, code, year) {
  const selected = { freq: 'A', unit: 'MIO_EUR', sector: 'S13', cofog99: code, na_item: 'TE', geo: 'IT', time: String(year) };
  let offset = 0;
  for (let i = 0; i < raw.id.length; i++) {
    const dimension = raw.id[i];
    const position = raw.dimension[dimension].category.index[selected[dimension]];
    if (!Number.isInteger(position)) return undefined;
    offset = offset * raw.size[i] + position;
  }
  const value = raw.value?.[offset];
  if (!Number.isFinite(value)) return undefined;
  return { value, status: raw.status?.[offset] ?? null };
}

export function prepareData(raw, retrievedAt) {
  const divisions = Array.from({ length: 10 }, (_, i) => `GF${String(i + 1).padStart(2, '0')}`);
  const required = [...new Set(['TOTAL', ...divisions, ...definitions.flatMap(d => d.terms.map(([code]) => code))])];
  const years = Object.keys(raw.dimension.time.category.index).sort((a, b) => Number(b) - Number(a));
  const year = years.find(year => required.every(code => observation(raw, code, year)));
  if (!year) throw new Error('No complete year is available. Refusing to publish partial data.');
  const total = observation(raw, 'TOTAL', year).value;
  if (total <= 0) throw new Error('Invalid expenditure total.');
  const categories = definitions.map(definition => {
    const observations = definition.terms.map(([code, multiplier]) => ({ code, multiplier, ...observation(raw, code, year) }));
    const amount = observations.reduce((sum, item) => sum + item.value * item.multiplier, 0);
    if (amount < 0) throw new Error(`Negative category: ${definition.id}`);
    return { ...definition, amount, share: amount / total * 100, observations };
  }).sort((a, b) => b.amount - a.amount);
  const divisionTotal = divisions.reduce((sum, code) => sum + observation(raw, code, year).value, 0);
  const categoryTotal = categories.reduce((sum, category) => sum + category.amount, 0);
  // Eurostat publishes MIO_EUR to one decimal; allow only source rounding.
  if (Math.abs(divisionTotal - total) > 1 || Math.abs(categoryTotal - total) > 1) {
    throw new Error('Categories do not reconcile with the published total.');
  }
  return { year: Number(year), total, unit: 'MIO_EUR', retrievedAt, datasetUpdated: raw.updated, apiUrl, sourceUrl, categories };
}
