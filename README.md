# italia in numeri

A minimal Italian-language website about public spending. Static HTML, CSS and JavaScript; no runtime dependencies, third-party fonts, tracking or external requests on page load. The graph, sources and category details work without JavaScript. JavaScript adds the unit switch.

## Local development

Node.js 22 or later. No dependency installation is required.

```sh
npm run build
npm run check
npm run dev
```

Open http://127.0.0.1:4173. Edit `src/`, then rebuild. `dist/` is the deployable site. Sites identity is recorded in `.openai/hosting.json`.

## Data

Eurostat `gov_10a_exp`, Italy (`IT`), general government (`S13`), expenditure (`TE`), million euro (`MIO_EUR`), annual frequency. `dist/data/eurostat-raw.json` preserves the exact API response; `retrieval.json` records the retrieval date. The most recent complete year is selected from observations, not from the dataset's global latest-year metadata.

The chart uses all ten COFOG divisions, with two subdivisions for readability: GF10 becomes GF1002 + GF1003 and its remainder; GF01 becomes GF0107 and its remainder. These twelve categories are mutually exclusive. Old-age and survivor expenditure is not identical to all pension expenditure. Every derivation and definition lives in `src/data.mjs` and appears in the page and CSV.

```sh
npm run refresh-data
npm run check
```

Refresh downloads, validates and rebuilds; it does not deploy. Review the output and definitions before publication, particularly when a new year or source revision appears. The build rejects missing data, negative derived categories and totals that fail to reconcile beyond source rounding. Website figures are snapshots, not live feeds.

## Extending

Keep future statistics as separate datasets and pages, with their own reference year, definitions and source metadata. The page shell and typography can be shared. Avoid combining different years or accounting scopes in the same total.

## Design direction

Use the name “italia in numeri” without punctuation, keeping “italia” bold in the wordmark. Maintain a minimal black-on-white palette and restrained typography. Do not use eyebrows (small introductory labels above headings) anywhere on this website. Keep the hero supporting sentence and chart heading/helper sentence visually hidden. Show the reference year in parentheses after “spesa totale”.

## Sources

- [Eurostat dataset](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en)
- [Eurostat methodology](https://ec.europa.eu/eurostat/en/web/government-finance-statistics/methodology)
- [Istat quality report](https://www.istat.it/scheda-qualita/spese-della-pubblica-amministrazione-per-funzione/)
- [UN COFOG definitions](https://unstats.un.org/unsd/publication/seriesm/seriesm_84e.pdf)
