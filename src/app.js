const buttons = [...document.querySelectorAll('[data-unit]')];
const rows = [...document.querySelectorAll('.spending-row')];
const chart = document.querySelector('.chart');
const number = new Intl.NumberFormat('it-IT', { useGrouping: 'always', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

function setUnit(unit) {
  const isShare = unit === 'share';
  const maximum = Number(chart.dataset[isShare ? 'shareMaximum' : 'amountMaximum']);
  for (const row of rows) {
    const value = Number(row.dataset[isShare ? 'share' : 'amount']);
    row.querySelector('.bar').style.width = `${value / maximum * 100}%`;
    const output = row.querySelector('.row-value');
    output.replaceChildren(document.createTextNode(number.format(value)));
    const suffix = document.createElement('span');
    suffix.className = 'number-unit';
    suffix.textContent = isShare ? '%' : '';
    output.append(suffix);
    output.setAttribute('aria-label', `${number.format(value)} ${isShare ? 'per cento del totale' : 'miliardi di euro'}`);
  }
  const ticks = document.querySelectorAll('.axis-ticks span');
  ticks.forEach((tick, i) => { tick.textContent = integer.format(maximum * i / 4); });
  document.querySelector('.axis-unit').textContent = isShare ? '%' : 'mld €';
  document.querySelector('#chart-total-value').textContent = isShare ? '100%' : `${number.format(Number(chart.dataset.total))} mld €`;
  document.querySelector('#chart-description').textContent = `${isShare ? 'Quota sul totale.' : 'Miliardi di euro, a prezzi correnti.'} Seleziona una voce per approfondire.`;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.unit === unit)));
  document.querySelector('#unit-announcement').textContent = `Grafico espresso in ${isShare ? 'percentuale della spesa totale' : 'miliardi di euro'}.`;
}

buttons.forEach(button => button.addEventListener('click', () => setUnit(button.dataset.unit)));
document.querySelector('.unit-switch').hidden = false;
