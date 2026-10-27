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

const regions = [...document.querySelectorAll('.map-region')];
const regionSelect = document.querySelector('#region-select');
let activeRegion;

function selectRegion(id) {
  const region = regions.find(path => path.dataset.region === String(id));
  if (!region || region === activeRegion) return;
  activeRegion = region;
  const { balance, revenue, spending } = region.dataset;
  const amount = Number(balance);
  const signedBalance = `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${number.format(Math.abs(amount) / 1000)}`;
  regionSelect.value = id;
  document.querySelector('#region-balance').textContent = signedBalance;
  document.querySelector('#region-status').textContent = amount > 0 ? 'Entrate superiori alle spese' : amount < 0 ? 'Spese superiori alle entrate' : 'Entrate e spese in equilibrio';
  document.querySelector('#region-revenue').textContent = `${number.format(Number(revenue) / 1000)} mld €`;
  document.querySelector('#region-spending').textContent = `${number.format(Number(spending) / 1000)} mld €`;
  regions.forEach(path => {
    path.classList.toggle('is-active', path === region);
    path.setAttribute('aria-pressed', String(path === region));
  });
  // Paint the active outline above its neighbours without changing keyboard order.
  const oldOutline = document.querySelector('.region-outline');
  oldOutline?.remove();
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  outline.setAttribute('d', region.getAttribute('d'));
  outline.setAttribute('class', 'region-outline');
  outline.setAttribute('aria-hidden', 'true');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', '#181818');
  outline.setAttribute('stroke-width', '1.5');
  outline.setAttribute('vector-effect', 'non-scaling-stroke');
  outline.style.pointerEvents = 'none';
  region.parentElement.append(outline);
}

regions.forEach(region => {
  region.setAttribute('tabindex', '0');
  region.setAttribute('role', 'button');
  region.setAttribute('aria-label', region.querySelector('title').textContent);
  region.setAttribute('aria-controls', 'region-balance');
  region.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') selectRegion(region.dataset.region);
  });
  region.addEventListener('focus', () => selectRegion(region.dataset.region));
  region.addEventListener('click', () => selectRegion(region.dataset.region));
  region.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectRegion(region.dataset.region);
    }
  });
});
regionSelect.addEventListener('change', () => selectRegion(regionSelect.value));
selectRegion(regionSelect.value);
document.querySelector('.region-panel').hidden = false;
document.querySelector('.regional-layout').classList.add('is-interactive');

const wageViews = [...document.querySelectorAll('[data-wage-view]')];
const wageButtons = [...document.querySelectorAll('[data-wage-series]')];
function setWageSeries(id) {
  wageViews.forEach(view => { view.hidden = view.dataset.wageView !== id; });
  wageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wageSeries === id)));
}
wageButtons.forEach(button => button.addEventListener('click', () => setWageSeries(button.dataset.wageSeries)));
wageViews.forEach(view => {
  const points = [...view.querySelectorAll('tbody tr')].map(row => ({ year: Number(row.dataset.year), value: Number(row.dataset.value), index: Number(row.dataset.index) }));
  const slider = view.querySelector('input[type="range"]');
  const plot = view.querySelector('.wage-plot');
  const lower = Number(view.dataset.lower), upper = Number(view.dataset.upper);
  const firstYear = points[0].year, lastYear = points.at(-1).year;
  const priceYear = view.dataset.priceYear;
  function selectYear(year) {
    const point = points.find(p => p.year === Number(year));
    if (!point) return;
    slider.value = point.year;
    slider.setAttribute('aria-valuetext', `${point.year}: indice ${number.format(point.index)}, ${number.format(point.index - 100)} per cento rispetto al 1990`);
    view.querySelector('output').textContent = point.year;
    view.querySelector('.wage-selected-year').textContent = point.year;
    view.querySelector('.wage-value').replaceChildren(document.createTextNode(number.format(point.index)));
    const unit = document.createElement('span');
    unit.textContent = ' / 100';
    view.querySelector('.wage-value').append(unit);
    const change = point.index - 100;
    view.querySelector('.wage-difference').textContent = `${change < 0 ? '−' : change > 0 ? '+' : ''}${number.format(Math.abs(change))}%`;
    if (view.dataset.wageView === 'oecd') view.querySelector('.wage-euros').textContent = `${integer.format(point.value)} € lordi annui, a prezzi ${priceYear}`;
    const cursor = view.querySelector('.wage-crosshair');
    cursor.style.left = `${(point.year - firstYear) / (lastYear - firstYear) * 100}%`;
    cursor.querySelector('span').style.top = `${(upper - point.index) / (upper - lower) * 100}%`;
  }
  function selectAtPointer(event) {
    const rect = plot.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    selectYear(Math.round(firstYear + fraction * (lastYear - firstYear)));
  }
  plot.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') selectAtPointer(event);
  });
  plot.addEventListener('click', selectAtPointer);
  slider.addEventListener('input', () => selectYear(slider.value));
  selectYear(lastYear);
  view.querySelector('.wage-year-control').hidden = false;
});
setWageSeries('oecd');
document.querySelector('.wage-toolbar').hidden = false;

function revealLinkedDetails(hash) {
  let target = document.getElementById(hash.slice(1));
  while (target) {
    if (target.tagName === 'DETAILS') target.open = true;
    target = target.parentElement;
  }
}

const sectionLinks = [...document.querySelectorAll('.section-nav a')];
const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1)));
let navigationFrame;
function updateSectionNavigation() {
  navigationFrame = undefined;
  const readingLine = Math.min(160, window.innerHeight * .2);
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= readingLine) current = section;
  }
  // The final, shorter section may reach the bottom before its heading can
  // reach the reading line. It should still become the current destination.
  if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = sections.at(-1);
  sectionLinks.forEach(link => {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function scheduleNavigationUpdate() {
  if (navigationFrame === undefined) navigationFrame = requestAnimationFrame(updateSectionNavigation);
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    revealLinkedDetails(link.hash);
    if (link.closest('.section-nav')) {
      event.preventDefault();
      const target = document.getElementById(link.hash.slice(1));
      if (window.location.hash !== link.hash) history.pushState(null, '', link.hash);
      target.scrollIntoView({ block: 'start' });
      target.querySelector(':scope > summary').focus({ preventScroll: true });
    }
    scheduleNavigationUpdate();
  });
});
window.addEventListener('hashchange', () => {
  revealLinkedDetails(window.location.hash);
  scheduleNavigationUpdate();
});
window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
window.addEventListener('resize', scheduleNavigationUpdate);
sections.forEach(section => section.addEventListener('toggle', scheduleNavigationUpdate));
revealLinkedDetails(window.location.hash);
updateSectionNavigation();
