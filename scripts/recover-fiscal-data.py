"""Recover Figure 10's vector bars from GLO Discussion Paper 1620.

Optional maintenance dependency: pdfplumber==0.11.8. The normal Node build
reads the preserved numerical snapshots and needs neither Python nor network.
The paper is downloaded temporarily; only numerical geometry is redistributed.
"""
import argparse
import hashlib
import json
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'dist/data/fiscal'
URL = 'https://www.econstor.eu/bitstream/10419/319679/1/GLO-DP-1620.pdf'
SHA256 = '2bb616ea49be5a0473d87b15110c3717eaf6776d02f3a1cfd59dcd1074b573a8'
COUNTRIES = 'IT EL IE AT PL HU FR BE ES NL SE FI HR PT BG CZ RO DE LU SI DK SK EE LV LT'.split()


def recover(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[24]
        if 'Figure 10: Total Net contributor households' not in page.extract_text():
            raise ValueError('Unexpected fiscal figure; review the source')
        if 'systems in place in 2022' not in pdf.pages[5].extract_text():
            raise ValueError('Unexpected fiscal reference year; review the source')
        bars = sorted([r for r in page.rects if r['non_stroking_color'] == (0.37647,) * 3], key=lambda r: r['x0'])
        ticks = sorted([line['top'] for line in page.lines if abs(line['x0'] - 145.466562) < .001 and abs(line['x1'] - 149.065428) < .001])
        labels = sorted([c for c in page.chars if abs(c['top'] - 631.603828524) < .001], key=lambda c: c['x0'])
        if len(bars) != 25 or len(ticks) != 6 or ''.join(c['text'] for c in labels) != ''.join(COUNTRIES):
            raise ValueError('Unexpected fiscal bars, scale or country labels')
        zero, one = ticks[-1], ticks[0]
        geometry = {'pdfPage': 25, 'printedPage': 24, 'figure': 10, 'zeroY': zero, 'oneY': one, 'bars': []}
        for index, (code, bar) in enumerate(zip(COUNTRIES, bars)):
            label_center = (labels[index * 2]['x0'] + labels[index * 2 + 1]['x1']) / 2
            if abs(label_center - bar['x1']) > .02 or abs(bar['bottom'] - zero) > .001:
                raise ValueError(f'Unexpected fiscal label or baseline: {code}')
            geometry['bars'].append({'code': code, **{key: bar[key] for key in ['x0', 'x1', 'top', 'bottom']}})
        observations = [{'code': b['code'], 'contributors': round((zero - b['top']) / (zero - one) * 100, 1)} for b in geometry['bars']]
        # Independent numerical statements in the paper's conclusion, p. 34.
        verified = {'IT': 39.4, 'EL': 40.7, 'IE': 41.8, 'AT': 42.6, 'PL': 43.2, 'DK': 53.1, 'SK': 53.5, 'EE': 54.7, 'LV': 56.9, 'LT': 58.0}
        for observation in observations:
            if observation['code'] in verified and observation['contributors'] != verified[observation['code']]:
                raise ValueError('Vector recovery disagrees with the paper’s written results')
        return geometry, {'year': 2022, 'unit': 'percent_households', 'concept': 'extended_income', 'precision': 1, 'observations': observations}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf', type=Path, help='Reuse a local copy of the original paper')
    args = parser.parse_args()
    content = args.pdf.read_bytes() if args.pdf else urllib.request.urlopen(URL, timeout=60).read()
    if hashlib.sha256(content).hexdigest() != SHA256:
        raise ValueError('Fiscal source changed; review the paper before recovering data')
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / 'source.pdf'
        path.write_bytes(content)
        geometry, shares = recover(path)
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    metadata = {
        'retrievedAt': datetime.now(timezone.utc).isoformat(), 'url': URL, 'sha256': SHA256,
        'publicationYear': 2025, 'pdfPage': 25, 'printedPage': 24, 'figure': 10,
        'method': 'Extended-concept vector bars calibrated to the 0 and 1 axis ticks; rounded to 0.1 percentage point. Beneficiary share is the complement to 100. Ten results independently checked against the conclusion on printed p. 34.',
        'source': 'Christl, M. & Köppl-Turyna, M. (2025), Net Fiscal Contributions in the EU — The role of indirect taxation and in-kind benefits, GLO Discussion Paper 1620.',
    }
    for name, value in [('source-geometry.json', geometry), ('published-shares.json', shares), ('retrieval.json', metadata)]:
        DIRECTORY.joinpath(name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(f'Recovered {len(shares["observations"])} fiscal observations for 2022 from Figure 10.')
