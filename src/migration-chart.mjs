const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = value => `${number.format(value)}%`;
const x = value => value / 30 * 100;
const y = value => (30 - value) / 30 * 100;

export function renderMigrationChart(data) {
  const italy = data.countries.find(c => c.code === 'ITA');
  const ticks = [0, 5, 10, 15, 20, 25, 30];
  return `<div class="migration-view">
    <p class="migration-definition">Giovani di ${data.age.min}–${data.age.max} anni · medie ${data.period.firstYear}–${data.period.lastYear}. Confronto CNEL delle quote di partenze e arrivi tra alcuni paesi europei. Le percentuali riguardano i flussi studiati, non la popolazione giovane. <a href="#metodo-giovani">Metodo e limiti</a></p>
    <div class="migration-layout">
      <div class="migration-chart" role="group" aria-label="Confronto CNEL tra quote di partenze e arrivi dei giovani. Italia evidenziata; tabella con tutti i valori sotto il grafico.">
        <p class="migration-y-title">Arrivi · quota CNEL (%)</p>
        <div class="migration-plot">
          <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <path class="migration-attract-zone" d="M0,0H600L0,600Z" /><path class="migration-leave-zone" d="M0,600L600,0V600Z" />
            ${ticks.map(t => `<path class="migration-grid" d="M${t * 20},0V600M0,${t * 20}H600" />`).join('')}
            <path class="migration-equilibrium" d="M0,600L600,0" />
          </svg>
          <span class="migration-zone-label migration-attract-label">Più arrivi<br />che partenze</span>
          <span class="migration-zone-label migration-leave-label">Più partenze<br />che arrivi</span>
          <div class="migration-y-axis" aria-hidden="true">${ticks.map(t => `<span style="top:${y(t)}%">${t}%</span>`).join('')}</div>
          <div class="migration-x-axis" aria-hidden="true">${ticks.map(t => `<span style="left:${x(t)}%">${t}%</span>`).join('')}</div>
          ${data.countries.map(c => `<div class="migration-country${c.code === 'ITA' ? ' is-selected' : ''}" data-migration-country="${c.code}" data-name="${c.name}" data-departures="${c.departures}" data-arrivals="${c.arrivals}" data-isfm="${c.isfm}" style="left:${x(c.departures)}%;top:${y(c.arrivals)}%;--label-x:${c.dx}px;--label-y:${c.dy}px"><button class="migration-dot" type="button" disabled aria-label="${c.name}: partenze ${percent(c.departures)}, arrivi ${percent(c.arrivals)}, confronto CNEL" aria-pressed="${c.code === 'ITA'}"><span></span></button><span class="migration-country-label" aria-hidden="true"><span class="migration-country-name">${c.name}</span><span class="migration-country-short">${c.short}</span></span></div>`).join('')}
        </div>
        <p class="migration-x-title">Partenze · quota CNEL (%)</p>
      </div>
      <div class="migration-panel">
        <div class="migration-select-control" hidden><label for="migration-country-select">Scegli un paese</label><select id="migration-country-select">${data.countries.map(c => `<option value="${c.code}"${c.code === 'ITA' ? ' selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div class="migration-readout" aria-live="polite" aria-atomic="true">
          <h3>${italy.name}</h3>
          <dl><div><dt>Quota di partenze</dt><dd class="migration-departures">${percent(italy.departures)}</dd></div><div><dt>Quota di arrivi</dt><dd class="migration-arrivals">${percent(italy.arrivals)}</dd></div></dl>
          <p class="migration-ratio"><strong>${number.format(italy.isfm)}</strong> partenze per ogni arrivo nel confronto CNEL</p>
        </div>
        <p class="migration-hint" hidden>Passa su un punto, toccalo o scegli un paese. Con la tastiera, usa Tab e le frecce.</p>
      </div>
    </div>
    <p class="migration-caveat">Riproduzione dei valori pubblicati dal CNEL, con dati mancanti e integrazioni statistiche. Le quote pubblicate non si ricompongono al 100%: vanno lette come confronto del rapporto, non come ripartizione completa delle migrazioni.</p>
    <div class="chart-caption"><p>Fonte: <a href="${data.sources.figure}" target="_blank" rel="noopener noreferrer">CNEL / REF su dati Eurostat · settembre 2026 ↗</a></p><a class="download-link" href="./data/migrazioni-giovani.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
    <details class="regional-table-details migration-table-details"><summary>Tutti i paesi <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Confronto migratorio dei giovani, tabella scorrevole"><table class="regional-table migration-table"><caption>Quote CNEL · ${data.age.min}–${data.age.max} anni · ${data.period.firstYear}–${data.period.lastYear}. ISFM = partenze per ogni arrivo, pubblicato dal CNEL.</caption><thead><tr><th scope="col">Paese</th><th scope="col">Partenze (%)</th><th scope="col">Arrivi (%)</th><th scope="col">ISFM</th></tr></thead><tbody>${data.countries.map(c => `<tr data-migration-row="${c.code}"><th scope="row">${c.name}</th><td>${percent(c.departures)}</td><td>${percent(c.arrivals)}</td><td>${number.format(c.isfm)}</td></tr>`).join('')}</tbody></table></div></details>
  </div>`;
}
