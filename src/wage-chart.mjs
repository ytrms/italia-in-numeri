const decimal = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });
const sign = value => `${value < 0 ? '−' : value > 0 ? '+' : ''}${decimal.format(Math.abs(value))}`;
const change = point => point ? `${sign(point.index - 100)}%` : 'n.d.';

export function wagePath(points, x, y) {
  return points.map((p, i) => `${i && p.year === points[i - 1].year + 1 ? 'L' : 'M'}${x(p.year).toFixed(3)},${y(p.index).toFixed(3)}`).join(' ');
}

export function renderWageCharts(data) {
  return Object.entries(data.comparisons).map(([id, countries]) => {
    const isWage = id === 'oecd';
    const firstYear = Math.min(...countries.map(c => c.points[0].year));
    const lastYear = Math.max(...countries.map(c => c.points.at(-1).year));
    const italy = countries.find(c => c.code === 'ITA');
    const commonYear = italy.points.findLast(p => countries.every(c => c.points.some(point => point.year === p.year)))?.year;
    if (!commonYear) throw new Error('No common wage year');
    const pointAt = (country, year) => country.points.find(p => p.year === year);
    const selected = pointAt(italy, commonYear);
    const eurosAt = year => data.series.oecd.find(p => p.year === year)?.value;
    const description = isWage ? 'Salario medio annuo lordo, equivalente a tempo pieno.' : 'Reddito medio per dipendente, inclusi i contributi del datore di lavoro.';
    const step = isWage ? 10 : 25;
    const indices = countries.flatMap(c => c.points.map(p => p.index));
    const lower = Math.floor(Math.min(100, ...indices) / step) * step;
    const upper = Math.max(lower + step, Math.ceil(Math.max(100, ...indices) / step) * step);
    const x = year => (year - firstYear) / (lastYear - firstYear) * 100;
    const y = value => (upper - value) / (upper - lower) * 100;
    const ticks = Array.from({ length: (upper - lower) / step + 1 }, (_, i) => lower + i * step);
    const allYears = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
    const years = [firstYear, ...allYears.filter(year => year % 10 === 0 && year > firstYear && year < lastYear - 3), lastYear];
    return `<div class="wage-view" data-wage-view="${id}" data-price-year="${data.priceYear}" data-first-year="${firstYear}" data-last-year="${lastYear}" data-common-year="${commonYear}" data-lower="${lower}" data-upper="${upper}">
      <p class="wage-definition">${description} Italia a confronto con Francia, Germania, Spagna, Paesi Bassi e Stati Uniti. <a href="#metodo-salari">Metodo</a></p>
      <div class="wage-readout">
        <div><span class="wage-selected-country">Italia · </span><span class="wage-selected-year">${commonYear}</span><p class="wage-value">${decimal.format(selected.index)}<span> / 100</span></p><p class="wage-euros">${isWage ? `${money.format(eurosAt(commonYear))} € lordi annui, a prezzi ${data.priceYear}` : 'Indice del reddito reale per dipendente'}</p></div>
        <div class="wage-change"><p class="wage-difference">${change(selected)}</p><p>rispetto al 1990</p></div>
      </div>
      <p class="wage-axis-caption">Potere d’acquisto · indice 1990 = 100 per ciascun paese</p>
      <div class="wage-chart" role="group" aria-label="${description} Confronto tra sei paesi, corretto per l’inflazione, dal ${firstYear} al ${lastYear}. Italia evidenziata. Dati completi nella tabella seguente.">
        <div class="wage-plot">
          ${ticks.map(t => `<div class="wage-grid${t === 100 ? ' wage-baseline' : ''}" style="top:${y(t)}%"><span>${t}</span></div>`).join('')}
          <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">${[...countries].reverse().map(country => `<g data-wage-country="${country.code}"><path class="wage-line" stroke-dasharray="${country.dash}" d="${wagePath(country.points, year => x(year) * 10, index => y(index) * 3)}" />${country.points.filter((p, i, points) => !points[i - 1] || points[i - 1].year !== p.year - 1 || !points[i + 1] || points[i + 1].year !== p.year + 1).map(p => `<path class="wage-endpoint" d="M${(x(p.year) * 10).toFixed(3)},${(y(p.index) * 3).toFixed(3)}h0" />`).join('')}</g>`).join('')}</svg>
          <div class="wage-crosshair" style="left:${x(commonYear)}%" aria-hidden="true">${countries.map(country => `<span data-wage-country="${country.code}" style="top:${y(pointAt(country, commonYear).index)}%"></span>`).join('')}</div>
          <div class="wage-x-axis" aria-hidden="true">${years.map(year => `<span style="left:${x(year)}%">${year}</span>`).join('')}</div>
        </div>
      </div>
      <div class="wage-year-control" hidden><label for="wage-year-${id}">Esplora un anno</label><input id="wage-year-${id}" type="range" min="${firstYear}" max="${lastYear}" value="${commonYear}" step="1" /><output for="wage-year-${id}">${commonYear}</output></div>
      <p class="wage-legend-heading">Variazione dal 1990 · <span class="wage-selected-year">${commonYear}</span></p>
      <dl class="wage-legend" aria-label="Variazione reale per paese nell’anno selezionato">${countries.map(country => `<div data-wage-country="${country.code}" data-name="${country.name}"><dt><svg viewBox="0 0 30 10" aria-hidden="true"><path d="M0,5H30" stroke-dasharray="${country.dash}" /></svg>${country.name}</dt><dd>${change(pointAt(country, commonYear))}</dd></div>`).join('')}</dl>
      <p class="wage-caveat">Le linee confrontano la crescita, non il livello degli stipendi: ogni paese parte da 100 nel 1990. Ultimo anno comune: ${commonYear}. I dati mancanti sono indicati con n.d. e interrompono le linee.</p>
      <div class="chart-caption"><p>Fonte: <a href="${data.sources[id]}" target="_blank" rel="noopener noreferrer">${isWage ? 'OCSE' : 'Commissione europea · AMECO'}, ${firstYear}–${lastYear} ↗</a> · Inflazione già corretta.</p><a class="download-link" href="./data/salari-${id}.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
      <p class="wage-caveat">${isWage ? `Cina: non disponibile nella stessa serie OCSE. Le <a href="${data.sources.china}" target="_blank" rel="noopener noreferrer">statistiche ufficiali cinesi ↗</a> riguardano unità urbane e hanno una copertura diversa.` : 'La serie dal 1960 include contributi a carico del datore: non equivale alla busta paga. I dati più lontani sono ricostruzioni storiche; le previsioni 2026–2027 sono escluse.'}</p>
      <details class="regional-table-details wage-table-details"><summary>Tutti gli anni e i paesi <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Serie storica dei salari per paese, tabella scorrevole"><table class="regional-table wage-table"><caption>${description} Indice reale 1990 = 100 per ciascun paese. n.d. = dato non disponibile.${isWage ? ` Importo italiano in euro a prezzi ${data.priceYear}.` : ''}</caption><thead><tr><th scope="col">Anno</th>${countries.map(country => `<th scope="col">${country.name}</th>`).join('')}${isWage ? '<th scope="col">Italia · euro reali</th>' : ''}</tr></thead><tbody>${allYears.map(year => `<tr data-year="${year}" data-euros="${isWage ? eurosAt(year) ?? '' : ''}"><th scope="row">${year}</th>${countries.map(country => { const p = pointAt(country, year); return `<td data-country="${country.code}" data-index="${p?.index ?? ''}">${p ? decimal.format(p.index) : 'n.d.'}</td>`; }).join('')}${isWage ? `<td>${eurosAt(year) === undefined ? 'n.d.' : `${money.format(eurosAt(year))} €`}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>
    </div>`;
  }).join('\n');
}
