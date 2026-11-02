import { pensionPath } from './pension-chart.mjs';

const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const axisNumber = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const percent = value => value === undefined ? 'n.d.' : `${number.format(value)}%`;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');

export function renderVentureChart(data) {
  const { firstYear, lastYear, commonYear, series } = data;
  const upper = Math.max(.2, Math.ceil(Math.max(...series.flatMap(c => c.points.map(p => p.value))) / .2) * .2);
  const x = year => (year - firstYear) / (lastYear - firstYear) * 100;
  const y = value => (upper - value) / upper * 100;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const ticks = [firstYear, ...years.filter(year => year % 5 === 0 && year > firstYear + 2 && year < lastYear - 2), lastYear];
  const valueAt = (country, year) => country.points.find(p => p.year === year)?.value;
  // Separate close endpoint labels in a 360px plot, retaining their actual line positions.
  const labels = series.filter(country => country.points.at(-1).year === lastYear).map(country => ({ ...country, endpoint: country.points.at(-1), top: y(country.points.at(-1).value) * 3.6 })).sort((a, b) => a.top - b.top);
  labels.forEach((label, i) => { if (i) label.top = Math.max(label.top, labels[i - 1].top + 23); });
  labels.at(-1).top = Math.min(labels.at(-1).top, 354);
  for (let i = labels.length - 2; i >= 0; i--) labels[i].top = Math.min(labels[i].top, labels[i + 1].top - 23);
  return `<div class="venture-view" data-first-year="${firstYear}" data-last-year="${lastYear}" data-common-year="${commonYear}" data-upper="${upper}">
    <p class="venture-definition">Capitali investiti in imprese giovani con potenziale di crescita, in cambio di una quota della società. Valori in percentuale del PIL. Italia a confronto con Stati Uniti, Svezia, Svizzera, Regno Unito, Paesi Bassi, Spagna, Francia e Germania. <a href="#metodo-nuove-imprese">Metodo</a></p>
    <div class="venture-chart-heading"><p>% del PIL · ${firstYear}–${lastYear}</p><p>Anno <strong class="venture-selected-year">${commonYear}</strong></p></div>
    <div class="venture-chart" role="group" aria-label="Investimenti nelle nuove imprese in nove paesi, in percentuale del PIL. Italia evidenziata. Dati completi nella tabella seguente.">
      <div class="venture-plot" aria-label="Esplora gli investimenti per anno" aria-describedby="venture-chart-help">
        ${Array.from({ length: Math.round(upper / .2) + 1 }, (_, i) => i * .2).map(t => `<div class="venture-grid" style="top:${y(t)}%"><span>${axisNumber.format(t)}%</span></div>`).join('')}
        <svg viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
          ${[...series].reverse().map(country => `<g data-venture-country="${country.code}"><path class="venture-line" stroke-dasharray="${country.dash}" d="${pensionPath(country.points, year => x(year) * 10, value => y(value) * 3.6)}" />${country.points.map((p, i, points) => !points[i - 1] || points[i - 1].year !== p.year - 1 || !points[i + 1] || points[i + 1].year !== p.year + 1 ? `<path class="venture-endpoint" d="M${(x(p.year) * 10).toFixed(3)},${(y(p.value) * 3.6).toFixed(3)}h0" />` : '').join('')}</g>`).join('')}
        </svg>
        <div class="venture-end-labels" aria-hidden="true">${labels.map(label => `<div data-venture-country="${label.code}" style="top:${label.top / 3.6}%"><svg class="venture-leader" viewBox="0 0 30 1" preserveAspectRatio="none"><path d="M0,${y(label.endpoint.value) * 3.6 - label.top}L30,0" /></svg><span>${label.name}</span></div>`).join('')}</div>
        <div class="venture-crosshair" style="left:${x(commonYear)}%" aria-hidden="true">${series.map(country => `<span data-venture-country="${country.code}" style="top:${y(valueAt(country, commonYear))}%"></span>`).join('')}</div>
        <div class="venture-x-axis" aria-hidden="true">${ticks.map(year => `<span style="left:${x(year)}%">${year}</span>`).join('')}</div>
      </div>
    </div>
    <p class="sr-only" id="venture-chart-help">Passa sul grafico o tocca un punto. Con la tastiera, usa le frecce per cambiare anno, Home per il primo ed End per l’ultimo. I valori sono riportati sotto il grafico.</p>
    <dl class="venture-legend" aria-label="Investimenti per paese nell’anno selezionato">${series.map(country => `<div data-venture-country="${country.code}" data-name="${country.name}"><dt><svg viewBox="0 0 30 10" aria-hidden="true"><path d="M0,5H30" stroke-dasharray="${country.dash}" /></svg>${country.name}</dt><dd>${percent(valueAt(country, commonYear))}</dd></div>`).join('')}</dl>
    <p class="venture-caveat">L’OCSE avverte che definizioni e metodi di raccolta differiscono tra paesi e limitano la comparabilità internazionale. Ultimo anno comune: ${commonYear}. n.d. indica un dato non disponibile.</p>
    <div class="chart-caption"><p>Fonte: <a href="${escape(data.source)}" target="_blank" rel="noopener noreferrer">OCSE · Investimenti nelle nuove imprese ↗</a></p><a class="download-link" href="./data/investimenti-nuove-imprese.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
    <details class="regional-table-details venture-table-details"><summary>Tutti gli anni e i paesi <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Investimenti nelle nuove imprese, tabella scorrevole"><table class="regional-table venture-table"><caption>Investimenti nel capitale delle nuove imprese · % del PIL. n.d. = dato non disponibile.</caption><thead><tr><th scope="col">Anno</th>${series.map(country => `<th scope="col">${country.name}</th>`).join('')}</tr></thead><tbody>${years.map(year => `<tr data-year="${year}"><th scope="row">${year}</th>${series.map(country => `<td data-country="${country.code}" data-value="${valueAt(country, year) ?? ''}">${percent(valueAt(country, year))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
  </div>`;
}
