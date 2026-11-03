const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = value => `${number.format(value)}%`;

export function renderFiscalChart(data) {
  return `<div class="fiscal-view">
    <p class="fiscal-definition">Quote di famiglie nei 25 paesi UE studiati · stime sul sistema fiscale del ${data.year}. Il confronto include pensioni e altri trasferimenti, sanità e istruzione, imposte, contributi sociali e IVA. <a href="#metodo-famiglie">Metodo e limiti</a></p>
    <div class="fiscal-legend" aria-label="Legenda"><span><i class="fiscal-beneficiary-key" aria-hidden="true"></i>Beneficiarie nette</span><span><i class="fiscal-contributor-key" aria-hidden="true"></i>Contribuenti nette</span></div>
    <div class="fiscal-axis" aria-hidden="true"><span>Paese</span><div><span>0%</span><span>50%</span><span>100%</span></div></div>
    <ol class="fiscal-rows" aria-label="Famiglie beneficiarie e contribuenti nette, ordinate per quota beneficiaria decrescente">
      ${data.countries.map(c => `<li class="fiscal-row${c.code === 'IT' ? ' fiscal-italy' : ''}" data-fiscal-country="${c.code}"><span class="fiscal-country">${c.name}</span><span class="fiscal-bar" aria-hidden="true"><span class="fiscal-beneficiaries" style="width:${c.beneficiaries}%">${percent(c.beneficiaries)}</span><span class="fiscal-contributors" style="width:${c.contributors}%">${percent(c.contributors)}</span></span><span class="sr-only">Beneficiarie nette: ${percent(c.beneficiaries)}; contribuenti nette: ${percent(c.contributors)}.</span></li>`).join('\n')}
    </ol>
    <p class="fiscal-caveat">I benefici comprendono anche il valore stimato dei servizi pubblici. È una fotografia del ${data.year}: il saldo di una famiglia può cambiare nelle diverse fasi della vita.</p>
    <div class="chart-caption"><p>Fonte: <a href="${data.sources.paper}" target="_blank" rel="noopener noreferrer">Christl e Köppl-Turyna (2025), figura 10 ↗</a></p><a class="download-link" href="./data/famiglie-saldo-fiscale.csv" download>Scarica i dati <span aria-hidden="true">↓</span></a></div>
    <details class="regional-table-details fiscal-table-details"><summary>Tutti i paesi <span class="plus" aria-hidden="true"></span></summary><div class="regional-table-wrap" tabindex="0" role="region" aria-label="Saldo fiscale delle famiglie, tabella scorrevole"><table class="regional-table fiscal-table"><caption>Quote stimate di famiglie (%) · sistema ${data.year} · concetto esteso. Valori ricavati dalla figura 10 e arrotondati a 0,1 punti percentuali; beneficiarie come complemento al 100%, saldi nulli non distinti.</caption><thead><tr><th scope="col">Paese</th><th scope="col">Beneficiarie nette (%)</th><th scope="col">Contribuenti nette (%)</th></tr></thead><tbody>${data.countries.map(c => `<tr><th scope="row">${c.name}</th><td>${percent(c.beneficiaries)}</td><td>${percent(c.contributors)}</td></tr>`).join('')}</tbody></table></div></details>
  </div>`;
}
