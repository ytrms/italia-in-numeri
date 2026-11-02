"""Recover the published CNEL figures, without digitising chart positions.

Optional maintenance tool: Python 3 + pdfplumber 0.11.9. Normal builds use the
checked-in JSON and require only Node. Pinned fingerprints require review when
either report changes. Re-run with --snapshot-dir to avoid another download.
"""
import argparse
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'dist/data/migration'
SOURCES = {
    '2025': {
        'url': 'https://static.cnel.it/documenti/2025/8d714221-5082-45b2-81d2-2c6af468e749/Cnel_Rapporto_Giovani_2025.11.25.pdf',
        'sha256': '84fc0aca976c835051fe8919c87351878a86c84f6e63c1cbbf46dc68b6a2eb85',
        'printedPage': 125, 'pdfPage': 127, 'table': 6,
    },
    '2026': {
        'url': 'https://www.cnel.it/media/docs/default-source/news-documents/rapporto-cnel_giovani-expat_2026-ultima-vers.pdf',
        'sha256': '0c0e35fb510c8bdbd13f1e15730215dc5b365cc1f4bcf16180ec132519bf4cb0',
        'printedPage': 17, 'pdfPage': 17, 'figure': 2,
    },
}
COUNTRIES = [
    ('BEL', 'Belgio', 133.5), ('DNK', 'Danimarca', 158.37),
    ('DEU', 'Germania', 187.39), ('ESP', 'Spagna', 248.94),
    ('FRA', 'Francia', 276.49), ('ITA', 'Italia', 300.79),
    ('NLD', 'Paesi Bassi', 330.58), ('AUT', 'Austria', 361.19),
    ('SWE', 'Svezia', 388.84), ('CHE', 'Svizzera', 414.68),
    ('GBR', 'Regno Unito', 435.58),
]


def recover(paths):
    with pdfplumber.open(paths['2025']) as pdf:
        page = pdf.pages[126]
        text = page.extract_text()
        if 'TAVOLA 6' not in text or '20-34' not in text or '2011-23' not in text:
            raise ValueError('Unexpected CNEL table; review the source')
        words = page.extract_words()
        # Numeric text in the published table, not image/pixel coordinates.
        # x1 is the right edge of each citizenship column in PDF points.
        def value_at(y, right_edge):
            matches = [w['text'] for w in words if abs(w['top'] - y) < .5 and abs(w['x1'] - right_edge) < .3 and re.fullmatch(r'\d+,\d', w['text'])]
            if len(matches) != 1:
                raise ValueError(f'Missing or ambiguous table cell: {y}, {right_edge}')
            return float(matches[0].replace(',', '.'))

        observations = []
        for code, name, column in COUNTRIES:
            label = name.split()[0]
            labels = [w for w in words if w['text'] == label and 78 < w['x0'] < 80 and 345 < w['top'] < 485]
            if len(labels) != 1:
                raise ValueError(f'Missing table row: {name}')
            observations.append({
                'code': code, 'name': name,
                'departures': value_at(503.93, column),
                'arrivals': value_at(labels[0]['top'], 512.48),
            })
        source_table = page.crop((73, 279, 521, 564)).extract_text(layout=True)
        source_method = '\n\n'.join(f'PDF page {i + 1}\n{pdf.pages[i].extract_text()}' for i in [120, 125, 126])
    with pdfplumber.open(paths['2026']) as pdf:
        figure_text = pdf.pages[16].extract_text()
        for observation in observations:
            matches = re.findall(re.escape(observation['name']) + r';\s*(\d+,\d{3})', figure_text)
            if len(matches) != 1:
                raise ValueError(f'Missing published ISFM: {observation["name"]}')
            observation['isfm'] = float(matches[0].replace(',', '.'))
    data = {
        'period': {'firstYear': 2011, 'lastYear': 2023},
        'age': {'min': 20, 'max': 34}, 'unit': 'percent',
        'precision': {'shares': 1, 'publishedIsfm': 3},
        'observations': observations,
    }
    return data, source_table, source_method, figure_text


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot-dir', type=Path)
    args = parser.parse_args()
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    paths = {}
    for edition, source in SOURCES.items():
        name = f'cnel-{edition}.pdf'
        content = (args.snapshot_dir / name).read_bytes() if args.snapshot_dir else urllib.request.urlopen(source['url'], timeout=60).read()
        if hashlib.sha256(content).hexdigest() != source['sha256']:
            raise ValueError(f'CNEL {edition} changed; review before recovering data')
        paths[edition] = DIRECTORY / name
        paths[edition].write_bytes(content)
    data, table, method, figure = recover(paths)
    DIRECTORY.joinpath('published-table.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    for name, content in [('source-table.txt', table), ('source-method.txt', method), ('source-figure.txt', figure)]:
        DIRECTORY.joinpath(name).write_text('\n'.join(line.rstrip() for line in content.splitlines()).strip() + '\n')
    metadata = {
        'retrievedAt': datetime.now(timezone.utc).isoformat(), 'sources': SOURCES,
        'extraction': f'pdfplumber {pdfplumber.__version__}; published table cells and figure labels, no chart digitisation',
    }
    DIRECTORY.joinpath('retrieval.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(f'Recovered {len(data["observations"])} countries from the published CNEL table and ISFM labels.')
