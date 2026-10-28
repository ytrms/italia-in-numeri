const view = document.querySelector('.pension-view');
if (view) {
  const number = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rows = new Map([...view.querySelectorAll('tbody tr')].map(row => [Number(row.dataset.year), new Map([...row.querySelectorAll('td')].map(cell => [cell.dataset.country, cell.dataset.value === '' ? null : Number(cell.dataset.value)]))]));
  const slider = view.querySelector('input[type="range"]');
  const plot = view.querySelector('.pension-plot');
  const cursor = view.querySelector('.pension-crosshair');
  const legend = [...view.querySelectorAll('.pension-legend > div')];
  const first = Number(view.dataset.firstYear), last = Number(view.dataset.lastYear), upper = Number(view.dataset.upper);
  function selectYear(year) {
    const values = rows.get(Number(year));
    if (!values) return;
    slider.value = year;
    view.querySelector('output').textContent = year;
    view.querySelector('.pension-selected-year').textContent = year;
    cursor.style.left = `${(year - first) / (last - first) * 100}%`;
    const descriptions = legend.map(item => {
      const code = item.dataset.pensionCountry;
      const value = values.get(code);
      item.querySelector('dd').textContent = value == null ? 'n.d.' : `${number.format(value)}%`;
      const dot = cursor.querySelector(`[data-pension-country="${code}"]`);
      dot.hidden = value == null;
      if (value != null) dot.style.top = `${(upper - value) / upper * 100}%`;
      return `${item.dataset.name}: ${value == null ? 'dato non disponibile' : `${number.format(value)} per cento del PIL`}`;
    });
    slider.setAttribute('aria-valuetext', `${year}. ${descriptions.join('; ')}`);
  }
  function selectAtPointer(event) {
    const rect = plot.getBoundingClientRect();
    if (!rect.width) return;
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    selectYear(Math.round(first + fraction * (last - first)));
  }
  plot.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') selectAtPointer(event);
  });
  plot.addEventListener('click', selectAtPointer);
  slider.addEventListener('input', () => selectYear(slider.value));
  selectYear(Number(view.dataset.commonYear));
}
