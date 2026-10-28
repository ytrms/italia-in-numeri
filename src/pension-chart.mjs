const decimal = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = value => value === undefined ? 'n.d.' : `${decimal.format(value)}%`;

// Start a new segment after a missing year; never interpolate across a gap.
export function pensionPath(points, x, y) {
  return points.map((p, i) => `${i && p.year === points[i - 1].year + 1 ? 'L' : 'M'}${x(p.year).toFixed(3)},${y(p.value).toFixed(3)}`).join(' ');
}

export function renderPensionChart(data) {
  const { firstYear, lastYear, commonYear, series } = data;
  const upper = Math.max(5, Math.ceil(Math.max(...series.flatMap(c => c.points.map(p => p.value))) / 5) * 5);
  const x = year => (year - firstYear) / (lastYear - firstYear) * 100;
  const y = value => (upper - value) / upper * 100;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const ticks = [firstYear, ...years.filter(year => year % 10 === 0 && year > firstYear && year < lastYear - 4), lastYear];
  const valueAt = (country, year) => country.points.find(p => p.year === year)?.value;
  const mark = country => `<svg viewBox="0 0 30 10" aria-hidden="true"><path d="M0,5H30" stroke-dasharray="${country.dash}" /></svg>`;
  return `<div class="pension-view" data-first-year="${firstYear}" data-last-year="${lastYear}" data-common-year="${commonYear}" data-upper="${upper}">
    <p class="pension-definition">Spesa pubblica per pensioni di vecchiaia e superstiti, in percentuale del PIL. Confronto tra i paesi del G7. <a href="#metodo-pensioni">Metodo</a></p>
    <div class="pension-chart-heading"><p>% del PIL</p><p>Anno <strong class="pension-selected-year">${commonYear}</strong></p></div>
    <div class="pension-chart" role="img" aria-label="Spesa pubblica per pensioni nei sette paesi del G7, dal ${firstYear} al ${lastYear}, in percentuale del PIL. Italia evidenziata con una linea più spessa. Le serie terminano nell’ultimo anno disponibile per ciascun paese. Dati completi nella tabella seguente.">
      <div class="pension-plot">
        ${Array.from({ length: upper / 5 + 1 }, (_, i) => i * 5).map(t => `<div class="pension-grid" style="top:${y(t)}%"><span>${t}%</span></div>`).join('')}
        <svg viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
          ${[...series].reverse().map(country => `<g data-pension-country="${country.code}"><path class="pension-line" stroke-dasharray="${country.dash}" d="${pensionPath(country.points, year => x(year) * 10, value => y(value) * 3.2)}" />${country.points.map((p, i, points) => !points[i - 1] || points[i - 1].year !== p.year - 1 || !points[i + 1] || points[i + 1].year !== p.year + 1 ? `<path class="pension-endpoint" d="M${(x(p.year) * 10).toFixed(3)},${(y(p.value) * 3.2).toFixed(3)}h0" />` : '').join('')}</g>`).join('')}
        </svg>
        <div class="pension-crosshair" style="left:${x(commonYear)}%" aria-hidden="true">${series.map(country => `<span data-pension-country="${country.code}" style="top:${y(valueAt(country, commonYear))}%"></span>`).join('')}</div>
        <div class="pension-x-axis" aria-hidden="true">${ticks.map(year => `<span style="left:${x(year)}%">${year}</span>`).join('')}</div>
      </div>
    </div>
    <div class="pension-year-control" hidden><label for="pension-year">Esplora un anno</label><input id="pension-year" type="range" min="${firstYear}" max="${lastYear}" value="${commonYear}" step="1" /><output for="pension-year">${commonYear}</output></div>
    <dl class="pension-legend" aria-label="Spesa per paese nell’anno selezionato">${series.map(country => `<div data-pension-country="${country.code}" data-name="${country.name}"><dt>${mark(country)}${country.name}</dt><dd>${percent(valueAt(country, commonYear))}</dd></div>`).join('')}</dl>
    <p class="pension-caveat">Ultimo anno comune: ${commonYear}. Le linee si fermano all’ultimo dato disponibile; n.d. indica un dato non disponibile. Sono escluse le pensioni private e le prestazioni in natura.</p>
    <div class="chart-caption"><p>Fonte: <a href="${data.sources.indicator}" target="_blank" rel="noopener noreferrer">OCSE · SOCX, ${firstYear}–${lastYear} ↗</a></p><a class="download-link" href="./data/pensioni-g7.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
    <details class="regional-table-details pension-table-details"><summary>Tutti gli anni e i paesi <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Spesa pensionistica del G7, tabella scorrevole"><table class="regional-table pension-table"><caption>Pensioni pubbliche di vecchiaia e superstiti · % del PIL. n.d. = dato non disponibile.</caption><thead><tr><th scope="col">Anno</th>${series.map(country => `<th scope="col">${country.name}</th>`).join('')}</tr></thead><tbody>${years.map(year => `<tr data-year="${year}"><th scope="row">${year}</th>${series.map(country => `<td data-country="${country.code}" data-value="${valueAt(country, year) ?? ''}">${percent(valueAt(country, year))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
  </div>`;
}
