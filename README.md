# italia in numeri

A minimal Italian-language website about public spending, regional balances and real wages. Static HTML, CSS and JavaScript; no runtime dependencies, third-party fonts, tracking or external requests on page load. Charts, map, tables, sources and category details work without JavaScript. JavaScript adds the unit switch, interactive regional selection and wage-series/year controls.

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

## Regional map

The map shows **territorial revenue minus expenditure**, not an adjusted fiscal residual or transfers between regions. It uses the CPT consolidated PA exports EN_PA_CEMACRO (E163) and SP_PA_CEMACRO (S445), preserved unchanged in `dist/data/cpt/`. These are cash totals, including interest and financial operations, not just tax receipts or resident benefits. Their allocation methods differ; see CPT Guide §5.3. They cannot be reconciled directly to the Eurostat accrual-based spending chart. The visible caption and sources disclose this distinction.

`src/regional-data.mjs` selects the latest complete common year (currently 2023), validates current + capital = total, and sums Trento and Bolzano into Trentino-Alto Adige / Südtirol. All 21 CPT territories appear exactly once in the 20-region map. Values are rounded only for display. Green means positive revenue minus spending; red means negative. The linear color scale is symmetric around zero and uses absolute billions, not per-capita values. The map's year and verification date are independent of the spending chart.

```sh
npm run refresh-regional-data
npm run check
```

The checked-in `src/italy-regions.json` contains SVG display geometry derived from Istat's generalised 2023 regional boundaries (CC BY4.0). `scripts/prepare-map.py` documents optional, pinned development dependencies and regenerates it from the official archive. No geometry library or network request is needed in the website or build. Source geometry remains in WGS84 / UTM32N, uniformly scaled and simplified at 600m; minor invalid rings are repaired. License, original URL, archive hash and modifications are embedded in the asset.

Hover, keyboard focus/Enter/Space, touch/click and a native region selector update the detail panel. A collapsible semantic table and downloadable CSV provide all exact underlying values without relying on colors or pointer interaction.

## Real wages

“Il potere d’acquisto dei salari.” is a peer disclosure, expanded by default. Two distinct series are provided, never spliced:

- **OECD, 1990–2025 (default):** Average annual gross wages, whole economy, full-time equivalent. Select `ITA.WG.EUR.A.Q.MEAN._Z` from `DSD_EARNINGS@AV_AN_WAGE`, constant 2025 EUR, status A and multiplier 0. The private-consumption deflator is already applied by OECD; do not deflate again. Annual EUR values and the index are shown.
- **AMECO, 1960–2025:** `ITA.3.1.0.0.RWCDC`, real compensation per employee using the private-consumption deflator. Includes employer social contributions, so it is broader than wages. Spring 2026 vintage (3 June update), with forecasts for 2026–2027 excluded explicitly. Earlier history is backcast across accounting standards, with lower comparability. Older Istat contractual/category-specific wage series are not concatenated with this aggregate.

Both are rebased separately to 1990 = 100, preserving each source's growth rates. The labelled vertical scale adapts to the series; a dashed baseline marks 100. The readout shows the selected year's index and change against 1990. Hover, click/tap, or the labelled native year slider (arrows/Home/End) update the chart. Each series retains its year on switching/collapse. Tables and CSVs provide all years; without JavaScript both series remain visible.

`dist/data/wages/oecd.csv` preserves the OECD response. `ameco7.txt` is the full official chapter 7 export transcoded from Windows-1252 to UTF-8; `retrieval.json` records the official ZIP SHA-256 and release. `RWCDC.txt` is the official variable definition transcoded to UTF-8. `wages.json` and both CSV downloads derive from these snapshots in the build. Refresh requires Node 22+ and `unzip`:

```sh
npm run refresh-wage-data -- --release 2026-06-03 --last-historical-year 2025
npm run check
```

The refresh deliberately requires review when adopting a new AMECO vintage: update the explicit forecast cutoff, on-page vintage text, and guard in the script together. AMECO text files do not distinguish forecasts per observation. OECD price-base changes update the page automatically; unexpected statuses, missing years, duplicates or units fail the build.

## Design direction

Use the name “italia in numeri” without punctuation, keeping “italia” bold in the wordmark. Maintain a minimal black-on-white palette and restrained typography. Do not use eyebrows (small introductory labels above headings) anywhere on this website. “Dove vanno le tue tasse?” and “Il saldo delle regioni.” are equal peer sections: share their heading scale, spacing, dividers and right-aligned chevron. Both start expanded and collapse independently using native details/summary, including without JavaScript. Retain chart units and regional selection when collapsing. Keep introductory supporting copy absent and the chart helper sentence visually hidden. Show the latest-year/retrieval note in the sources section. The default chart unit is billions of euros. Do not add a spending-total callout, header sources link, generic sources introduction or footer tagline.

## Sources

“Fonti e metodo.” uses the same native chevron disclosure as the data sections but starts collapsed. Links to the methodology open both this section and the targeted explanation automatically.

- [Eurostat dataset](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en)
- [Eurostat methodology](https://ec.europa.eu/eurostat/en/web/government-finance-statistics/methodology)
- [Istat quality report](https://www.istat.it/scheda-qualita/spese-della-pubblica-amministrazione-per-funzione/)
- [UN COFOG definitions](https://unstats.un.org/unsd/publication/seriesm/seriesm_84e.pdf)
