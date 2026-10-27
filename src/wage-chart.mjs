const decimal = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });
const sign = value => `${value < 0 ? '−' : value > 0 ? '+' : ''}${decimal.format(Math.abs(value))}`;

export function renderWageCharts(data) {
  return Object.entries(data.series).map(([id, points]) => {
    const first = points[0], last = points.at(-1);
    const isWage = id === 'oecd';
    const description = isWage ? 'Salario medio annuo lordo, equivalente a tempo pieno.' : 'Reddito medio per dipendente, inclusi i contributi del datore di lavoro.';
    const step = isWage ? 5 : 25;
    const lower = Math.floor(Math.min(...points.map(p => p.index)) / step) * step;
    const upper = Math.ceil(Math.max(...points.map(p => p.index)) / step) * step;
    const x = year => (year - first.year) / (last.year - first.year) * 100;
    const y = value => (upper - value) / (upper - lower) * 100;
    const ticks = Array.from({ length: (upper - lower) / step + 1 }, (_, i) => lower + i * step);
    const years = [first.year, ...points.filter(p => p.year % 10 === 0 && p.year > first.year && p.year < last.year - 3).map(p => p.year), last.year];
    return `<div class="wage-view" data-wage-view="${id}" data-price-year="${data.priceYear}" data-first-year="${first.year}" data-last-year="${last.year}" data-lower="${lower}" data-upper="${upper}">
      <p class="wage-definition">${description} <a href="#metodo-salari">Metodo</a></p>
      <div class="wage-readout">
        <div><span class="wage-selected-year">${last.year}</span><p class="wage-value">${decimal.format(last.index)}<span> / 100</span></p><p class="wage-euros">${isWage ? `${money.format(last.value)} € lordi annui, a prezzi ${data.priceYear}` : 'Indice del reddito reale per dipendente'}</p></div>
        <div class="wage-change"><p class="wage-difference">${sign(last.index - 100)}%</p><p>rispetto al 1990</p></div>
      </div>
      <p class="wage-axis-caption">Potere d’acquisto · indice 1990 = 100</p>
      <div class="wage-chart" role="img" aria-label="${description} Indice corretto per l’inflazione, 1990 uguale a 100. Dal ${first.year} al ${last.year}: da ${decimal.format(first.index)} a ${decimal.format(last.index)}. Dati completi nella tabella seguente.">
        <div class="wage-plot">
          ${ticks.map(t => `<div class="wage-grid${t === 100 ? ' wage-baseline' : ''}" style="top:${y(t)}%"><span>${t}</span></div>`).join('')}
          <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><path class="wage-line" d="${points.map((p, i) => `${i ? 'L' : 'M'}${(x(p.year) * 10).toFixed(3)},${(y(p.index) * 3).toFixed(3)}`).join(' ')}" /></svg>
          <div class="wage-crosshair" style="left:100%" aria-hidden="true"><span style="top:${y(last.index)}%"></span></div>
          <div class="wage-x-axis" aria-hidden="true">${years.map(year => `<span style="left:${x(year)}%">${year}</span>`).join('')}</div>
        </div>
      </div>
      <div class="wage-year-control" hidden><label for="wage-year-${id}">Esplora un anno</label><input id="wage-year-${id}" type="range" min="${first.year}" max="${last.year}" value="${last.year}" step="1" aria-valuetext="${last.year}: indice ${decimal.format(last.index)}" /><output for="wage-year-${id}">${last.year}</output></div>
      <div class="chart-caption"><p>Fonte: <a href="${data.sources[id]}" target="_blank" rel="noopener noreferrer">${isWage ? 'OCSE' : 'Commissione europea · AMECO'}, ${first.year}–${last.year} ↗</a> · Inflazione già corretta.</p><a class="download-link" href="./data/salari-${id}.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
      ${!isWage ? '<p class="wage-caveat">La serie dal 1960 include contributi a carico del datore: non equivale alla busta paga. I dati più lontani sono ricostruzioni storiche; le previsioni 2026–2027 sono escluse.</p>' : ''}
      <details class="regional-table-details wage-table-details"><summary>Tutti gli anni <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Serie storica dei salari, tabella scorrevole"><table class="regional-table wage-table"><caption>${description} ${isWage ? `Euro a prezzi ${data.priceYear}.` : 'AMECO RWCDC, ribasato al 1990.'}</caption><thead><tr><th scope="col">Anno</th><th scope="col">Indice reale</th><th scope="col">Dal 1990</th>${isWage ? '<th scope="col">Euro reali</th>' : ''}</tr></thead><tbody>${points.map(p => `<tr data-year="${p.year}" data-value="${p.value}" data-index="${p.index}"><th scope="row">${p.year}</th><td>${decimal.format(p.index)}</td><td>${sign(p.index - 100)}%</td>${isWage ? `<td>${money.format(p.value)} €</td>` : ''}</tr>`).join('')}</tbody></table></div></details>
    </div>`;
  }).join('\n').replace(/\n[ \t]+\n/g, '\n');
}
