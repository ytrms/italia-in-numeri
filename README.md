# italia in numeri

A minimal Italian-language website about public spending, household fiscal balances, G7 pension spending, regional balances, real wages, equity investment in young businesses and the CNEL youth migration comparison. Static HTML, CSS and JavaScript; no runtime dependencies, third-party fonts, tracking or external requests on page load. Charts, map, tables, sources and category details work without JavaScript. JavaScript adds the unit switch, interactive regional selection and chart year controls.

## Local development

Node.js 22 or later. No dependency installation is required.

```sh
npm run build
npm run check
npm run dev
```

Open http://127.0.0.1:4173. Edit `src/`, then rebuild. `dist/` is the deployable site. Keep its checked-in data snapshots: the build uses these as inputs.

## Deployment

The site is hosted on GitHub Pages at https://italia.lorenzogravina.com/, from https://github.com/ytrms/italia-in-numeri. Pushing to `main` runs `.github/workflows/deploy-pages.yml`: build with Node.js 22, validate the data, then upload and deploy only `dist/`. A failed build or data check prevents publication. The workflow can also be run manually from GitHub Actions. No secrets or dependency installation are required.

GitHub Pages must use **GitHub Actions** as its source, with the custom domain **italia.lorenzogravina.com** configured in the repository's Pages settings. Namecheap Advanced DNS needs one **CNAME Record**, host **italia**, value **ytrms.github.io**, TTL **Automatic**. Existing apex, other subdomain and mail records are independent. Once DNS resolves to GitHub and its certificate is issued, enable **Enforce HTTPS** in Pages settings. Custom workflows use the repository's domain setting; a `CNAME` file in `dist/` is unnecessary.

The previous Sites deployment identity remains in `.openai/hosting.json`; the GitHub workflow does not update that deployment.

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

“Il potere d'acquisto del tuo stipendio” is a peer disclosure, expanded by default. Both views compare Italy with France, Germany, Spain, the Netherlands and the US. The two measures remain distinct and are never spliced:

- **OECD, 1990–2025 (default):** Average annual gross wages, whole economy, full-time equivalent. Select `COUNTRY.WG.USD_PPP.A.Q.MEAN._Z` from `DSD_EARNINGS@AV_AN_WAGE`, constant 2025 PPP dollars, status A and multiplier 0. Retain `ITA.WG.EUR.A.Q.MEAN._Z` for the Italian euro readout. The private-consumption deflator is already applied by OECD; do not deflate again. Each country is independently rebased to 1990 = 100, comparing real growth rather than wage levels. The Italian euro amount is shown separately. Fixed-price PPP conversion preserves growth rates, apart from source rounding.
- **AMECO, 1960–2025:** `COUNTRY.3.1.0.0.RWCDC` for the same six countries, real compensation per employee using the private-consumption deflator. Includes employer social contributions, so it is broader than wages. Spring 2026 vintage (3 June update), with forecasts for 2026–2027 excluded explicitly. Earlier history is backcast across accounting standards, with lower comparability. Older Istat contractual/category-specific wage series are not concatenated with this aggregate.

Both views rebase each country separately to 1990 = 100. The labelled vertical scale covers all six countries; a dashed baseline marks 100. Italy uses a thicker line, and country colors and patterns match across views and themes. The large readout remains Italian; the legend shows each country’s change in the selected year. Hover, click/tap, or focus the plot and use arrow keys (Home/End for endpoints). Each view retains its year on switching/collapse. The default is the latest year shared by all countries, currently 2025. Missing observations display as `n.d.` and break the line. Tables and CSVs provide every country and year; without JavaScript both views remain visible. All “Esplora un anno” sliders are temporarily hidden at the user's request; keep their markup available for restoration.

`dist/data/wages/oecd.csv` preserves the full OECD export, including countries not plotted. The `all` endpoint with `dimensionAtObservation=AllDimensions` avoids errors from country-filtered API requests. `retrieval.json` records its URL, SHA-256 and separate retrieval date; extending OECD coverage does not refresh AMECO. `ameco7.txt` is the full official chapter 7 export transcoded from Windows-1252 to UTF-8; `retrieval.json` records the official ZIP SHA-256 and release. `RWCDC.txt` is the official variable definition transcoded to UTF-8. `wages.json` includes the original Italian series and six-country comparisons; both CSV downloads contain country codes, indices, growth, original values and units, and source dates. These derive from the snapshots in the build. Refresh requires Node 22+ and `unzip`:

```sh
npm run refresh-wage-data -- --release 2026-06-03 --last-historical-year 2025
npm run check
```

The refresh deliberately requires review when adopting a new AMECO vintage: update the explicit forecast cutoff, on-page vintage text, and guard in the script together. AMECO text files do not distinguish forecasts per observation. OECD price-base changes update the page automatically; unexpected statuses, missing years, duplicates or units fail the build.

## Pension spending

“Quanto spendiamo in pensioni” follows the public spending section and compares the **G7**, with Italy emphasized. OECD SOCX `DSD_SOCX_AGG@DF_PUB_OLD` measures annual gross public cash spending on old-age and survivors benefits as a percentage of GDP (`A`, `SOCX`, `PT_B1GQ`, `ES10`, `C`, `TP01`, `_Z`, multiplier 0). Private pensions, benefits in kind and disability spending classified elsewhere are excluded. This differs from the Eurostat COFOG spending category above. China and India are absent from this dataset; the G7 is not presented as the world's seven largest economies.

The October 2026 snapshot covers 1980–2023: Italy and Germany end in 2021; France, Japan, the UK and Canada in 2022; the US in 2023. The default selected year is **2021**, the latest year shared by all seven. Lines end at each country's last observation and break across missing years; missing cells display “n.d.”, never zero. The zero-based vertical scale shows percent of GDP, not percent of government expenditure or an average pension amount. Country colors and line patterns identify the series in both themes; Italy uses a thicker line. Hover/tap update the seven readouts. The year slider is temporarily hidden alongside the wage sliders. The complete table, chart, source links and CSV work without JavaScript.

`src/pension-data.mjs` validates source dimensions, units, status, duplicates and values. `src/pension-chart.mjs` renders the chart and table; `src/pensions.js` and `src/pensions.css` provide interaction and styling. Original CSV and retrieval metadata (including URL and SHA-256) are preserved in `dist/data/pensions/`. The build produces `pensions.json` and `pensioni-g7.csv`; no network access is needed at build time or on page load.

```sh
npm run refresh-pension-data
npm run check
```

Review source revisions and observation statuses before publication. The parser accepts normal observations (`A`) only and requires review for forecasts, estimates or breaks. The refresh uses the OECD's documented query structure with wildcard fixed dimensions, then validates every returned dimension. New vintages may require updating the pinned verified-year checks in `scripts/check.mjs` after review.

## Investment in young businesses

“Quanto investiamo nelle nuove imprese” follows wages and compares the nine countries in the reference chart: Italy, the US, Sweden, Switzerland, the UK, the Netherlands, Spain, France and Germany. OECD `DSD_VC@DF_VC_INV` provides total venture capital investment (market statistics `VC_INV_MKT`, all stages `_T`) as a percentage of GDP (`PT_B1GQ`, annual, multiplier 0). These published ratios are used directly. This is equity financing in young businesses with growth potential, including early and later stages; it does not cover every form of new-business financing.

The November 2026 snapshot covers 2007–2025, with all nine countries available in every year. The default is the latest common year, 2025. Italy has a thicker line; patterns and colors distinguish countries. Desktop labels identify line endpoints, and a responsive legend shows the selected year's values to three decimals. Hover, tap or focus the plot and use arrows/Home/End to explore years. The chart, complete table, CSV and sources also work without JavaScript. Missing observations remain `n.d.` and break the line. OECD's warning about differing definitions, collection methods, coverage and representativeness is visible alongside the chart and explained in the methodology.

`src/venture-data.mjs` validates dimensions, units, normal observation status, duplicates and completed calendar years. The original export and URL, retrieval timestamp and SHA-256 are preserved in `dist/data/venture/`; the build generates `venture.json` and `investimenti-nuove-imprese.csv`. The refresh query pins its end period to 2025; review a newer completed year before extending it in `src/venture-data.mjs` and updating the verified observations in `scripts/check.mjs`.

```sh
npm run refresh-venture-data
npm run check
```

## Youth migration comparison

“Quali paesi attirano i giovani” follows the new-business investment section. It reproduces the eleven-country scatter chart in CNEL’s September 2026 *Giovani expat. Come farli tornare*, figure 2, p. 17: ages **20–34**, annual averages over **2011–2023**. Both axes use an identical 0–30% scale, with departures by citizenship on x and arrivals by destination on y. Italy is highlighted; hover, click/tap, focus/arrows, or the country selector update the detail panel. Static points, the Italian readout, source notes and full table work without JavaScript.

The shares come from **table 6, printed p. 125 (PDF page 127)** of the 2025 CNEL report; the published ISFM index comes from the numerical labels in the 2026 chart. These are extracted from PDF text cells, never estimated from image coordinates. One decimal is preserved for the shares; the CSV retains three decimals for ISFM. The index is not recalculated from already rounded shares.

This is a reproduction of the historical CNEL comparison, not an independent reconstruction from Eurostat or a complete migration balance. CNEL includes thirteen citizenships and eleven European destinations. It uses annual averages over available years and supplements gaps for Austria, France and the UK with emigration data, approximating citizenship with origin. UK series cited by the report stop in 2019. The published destination shares sum to **115.2%**, and the eleven plotted citizenship shares to **108.9%**. Preserve and disclose these source aggregates; do not silently normalise them to 100 or present them as population emigration rates. This limitation is visible next to the chart and detailed in `#metodo-giovani`.

Original PDFs, extracted table/method/figure text, recovered observations and retrieval metadata with source hashes live in `dist/data/migration/`. `src/migration-data.mjs` validates age, period, units, unique countries, numeric values and compatibility between the rounded shares and the published index. The normal Node build reads the recovered JSON and creates `migration.json` and `migrazioni-giovani.csv` without Python or network access.

For source recovery only, use Python with `pdfplumber==0.11.9`:

```sh
python3 scripts/recover-migration-data.py
# Or reuse the preserved PDFs:
python3 scripts/recover-migration-data.py --snapshot-dir dist/data/migration
npm run build
npm run check
```

The helper pins the reviewed PDF fingerprints and table cell positions. Source revisions require reviewing the reports, updating the extractor, and verifying the values and caveats together. Recovery does not deploy.

## Household fiscal balances

“Quante famiglie ricevono più di quanto versano” follows the public spending section. The 100% stacked bars compare the 25 EU countries in Figure 10 of Christl and Köppl-Turyna (2025), *Net Fiscal Contributions in the EU*, GLO Discussion Paper 1620, printed p. 24 (PDF p. 25). These are EUROMOD estimates for the **2022 tax-benefit system**, using the extended income concept; 2025 is the publication year. Cyprus and Malta are absent from this figure. Pensions and cash benefits, imputed health/education services, income taxes, social contributions (including employers') and VAT enter the balance. It is a household share and a one-year comparison, not a lifetime account or a share of public money.

`scripts/recover-fiscal-data.py` recovers the original PDF's vector bar coordinates, calibrates them to the labelled 0 and 1 ticks, maps the country labels and rounds contributor shares to 0.1 percentage point. Ten values are independently checked against numerical statements in the conclusion. Beneficiary shares are the complement to 100; the figure does not distinguish exact-zero balances. The full PDF is used temporarily, not redistributed. `dist/data/fiscal/` preserves its URL, SHA-256, retrieval date, numerical geometry and recovered shares. New source fingerprints require review before extraction.

`src/fiscal-data.mjs` validates the period, concept, complete country coverage and agreement between the shares and source geometry. `src/fiscal-chart.mjs` produces the chart and accessible table; `src/fiscal.css` supports mobile, themes and print. The chart needs no JavaScript. The Node build generates `fiscal.json` and `famiglie-saldo-fiscale.csv` without network or Python. Italy is emphasized and countries are sorted by beneficiary share.

For source recovery only, install `pdfplumber==0.11.8` in a Python environment:

```sh
python3 scripts/recover-fiscal-data.py
# Or reuse a local copy of the original paper:
python3 scripts/recover-fiscal-data.py --pdf /absolute/path/GLO-DP-1620.pdf
npm run build
npm run check
```

This is a historical study snapshot, not an automatically refreshed annual series.

## Design direction

Use the name “italia in numeri” without punctuation, keeping “italia” bold in the wordmark. Maintain a minimal neutral palette and restrained typography, with color identifying country lines and regional balances. Do not use eyebrows (small introductory labels above headings) anywhere on this website. Do not end section titles with periods; retain question marks where appropriate. The main sections, in order, are “A cosa vanno le tue tasse”, “Quante famiglie ricevono più di quanto versano”, “Quanto spendiamo in pensioni”, “Il potere d'acquisto del tuo stipendio”, “Quanto investiamo nelle nuove imprese”, “Quali paesi attirano i giovani” and “Quanto contribuiscono le regioni al bilancio”. They are equal peer sections: share their heading scale, spacing, dividers and right-aligned chevron. All seven start expanded and collapse independently using native details/summary, including without JavaScript. Retain chart selections when collapsing. Keep generic introductory copy absent and the spending chart helper sentence visually hidden. Show retrieval notes in the sources section. The default spending chart unit is billions of euros. Do not add a spending-total callout, header sources link, generic sources introduction or footer tagline.

## Section navigation

A left-hand contents menu lists the exact section headings, including sources. Above 1100px it stays beside the content while scrolling. At narrower widths, an “Indice” disclosure starts collapsed and sticks to the top as the wordmark scrolls away; its button exposes `aria-expanded` and `aria-controls`. Opening it reveals a white dropdown without shifting the chart, with two columns on tablets or one on phones. The dropdown scrolls internally on short screens. Anchor offsets keep destination headings below the sticky bar. Selecting a link closes the compact menu before scrolling; Escape closes it and restores focus to the button. Switching to a wide layout always shows the sidebar, and returning to compact starts collapsed. Without JavaScript, all navigation links remain visible. The current reading section has a pale grey background and `aria-current="location"`. Links open the destination disclosure, update the URL fragment, scroll to the heading and move keyboard focus to its summary. Browser back/forward and direct methodology fragments remain supported. Smooth scrolling respects reduced-motion preferences. The navigation is omitted from print layouts.

## Sources

“Fonti e metodo” uses the same native chevron disclosure as the data sections but starts collapsed. Links to the methodology open both this section and the targeted explanation automatically.

- [Eurostat dataset](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table?lang=en)
- [Eurostat methodology](https://ec.europa.eu/eurostat/en/web/government-finance-statistics/methodology)
- [Istat quality report](https://www.istat.it/scheda-qualita/spese-della-pubblica-amministrazione-per-funzione/)
- [UN COFOG definitions](https://unstats.un.org/unsd/publication/seriesm/seriesm_84e.pdf)

## Appearance

The header credit reads “un progetto di Lorenzo Gravina”, with “Lorenzo Gravina” linking to https://lorenzogravina.com. The footer's Tema selector offers Sistema (the default), Chiaro and Scuro. Sistema follows the OS preference, including changes while the page is open. Explicit choices are saved locally and applied before the stylesheet paints; returning to Sistema removes the override. Other tabs synchronize the selection. If browser storage is unavailable, the control still works for the current page. Without JavaScript the CSS follows the system and the inactive selector stays hidden. Print output always uses the light palette.

Neutral surfaces, navigation, chart marks, controls and method text use shared theme colors. The regional map keeps the same symmetric scale, using a separate red/green palette and matching legend in dark mode.
