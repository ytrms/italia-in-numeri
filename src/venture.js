const view = document.querySelector('.venture-view');
if (view) {
  const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const rows = new Map([...view.querySelectorAll('tbody tr')].map(row => [Number(row.dataset.year), new Map([...row.querySelectorAll('td')].map(cell => [cell.dataset.country, cell.dataset.value === '' ? null : Number(cell.dataset.value)]))]));
  const plot = view.querySelector('.venture-plot');
  const cursor = view.querySelector('.venture-crosshair');
  const legend = [...view.querySelectorAll('.venture-legend > div')];
  const first = Number(view.dataset.firstYear), last = Number(view.dataset.lastYear), upper = Number(view.dataset.upper);
  let selected = Number(view.dataset.commonYear);
  function selectYear(year) {
    const values = rows.get(year);
    if (!values) return;
    selected = year;
    view.querySelector('.venture-selected-year').textContent = year;
    cursor.style.left = `${(year - first) / (last - first) * 100}%`;
    const descriptions = legend.map(item => {
      const code = item.dataset.ventureCountry;
      const value = values.get(code);
      item.querySelector('dd').textContent = value == null ? 'n.d.' : `${number.format(value)}%`;
      const dot = cursor.querySelector(`[data-venture-country="${code}"]`);
      dot.hidden = value == null;
      if (value != null) dot.style.top = `${(upper - value) / upper * 100}%`;
      return `${item.dataset.name}: ${value == null ? 'dato non disponibile' : `${number.format(value)} per cento del PIL`}`;
    });
    plot.setAttribute('aria-valuenow', year);
    plot.setAttribute('aria-valuetext', `${year}. ${descriptions.join('; ')}`);
  }
  function selectAtPointer(event) {
    const rect = plot.getBoundingClientRect();
    if (rect.width) selectYear(Math.round(first + Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * (last - first)));
  }
  plot.tabIndex = 0;
  plot.setAttribute('role', 'slider');
  plot.setAttribute('aria-valuemin', first);
  plot.setAttribute('aria-valuemax', last);
  plot.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') selectAtPointer(event);
  });
  plot.addEventListener('click', selectAtPointer);
  plot.addEventListener('keydown', event => {
    const year = { ArrowLeft: selected - 1, ArrowDown: selected - 1, ArrowRight: selected + 1, ArrowUp: selected + 1, Home: first, End: last }[event.key];
    if (year === undefined) return;
    event.preventDefault();
    selectYear(Math.max(first, Math.min(last, year)));
  });
  selectYear(selected);
}
