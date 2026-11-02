const view = document.querySelector('.migration-view');
if (view) {
  const countries = [...view.querySelectorAll('[data-migration-country]')];
  const select = view.querySelector('select');
  const readout = view.querySelector('.migration-readout');
  const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function selectCountry(code) {
    const selected = countries.find(c => c.dataset.migrationCountry === code);
    if (!selected) return;
    countries.forEach(c => {
      const active = c === selected;
      c.classList.toggle('is-selected', active);
      c.querySelector('button').setAttribute('aria-pressed', String(active));
    });
    select.value = code;
    readout.querySelector('h3').textContent = selected.dataset.name;
    readout.querySelector('.migration-departures').textContent = `${number.format(Number(selected.dataset.departures))}%`;
    readout.querySelector('.migration-arrivals').textContent = `${number.format(Number(selected.dataset.arrivals))}%`;
    readout.querySelector('.migration-ratio strong').textContent = number.format(Number(selected.dataset.isfm));
  }
  countries.forEach((country, index) => {
    const button = country.querySelector('button');
    button.disabled = false;
    button.addEventListener('click', () => selectCountry(country.dataset.migrationCountry));
    button.addEventListener('focus', () => selectCountry(country.dataset.migrationCountry));
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') selectCountry(country.dataset.migrationCountry);
    });
    button.addEventListener('keydown', event => {
      const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: countries.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      countries[(next + countries.length) % countries.length].querySelector('button').focus({ preventScroll: true });
    });
  });
  select.addEventListener('change', () => selectCountry(select.value));
  view.querySelector('.migration-select-control').hidden = false;
  view.querySelector('.migration-hint').hidden = false;
}
