// Apply the saved preference before the stylesheet paints the page.
(() => {
  const storageKey = 'italia-in-numeri-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => value === 'light' || value === 'dark' ? value : 'system';
  let preference = 'system';
  try { preference = normalize(localStorage.getItem(storageKey)); } catch {}

  function applyTheme() {
    if (preference === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = preference;
    const dark = preference === 'dark' || (preference === 'system' && systemTheme.matches);
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.content = dark ? '#181818' : '#ffffff';
    });
    const select = document.getElementById('theme-select');
    if (select) select.value = preference;
  }

  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = normalize(event.newValue);
    applyTheme();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme-select');
    select.value = preference;
    select.addEventListener('change', () => {
      preference = normalize(select.value);
      applyTheme();
      try {
        if (preference === 'system') localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, preference);
      } catch {}
    });
    document.querySelector('.theme-picker').hidden = false;
  });
})();
