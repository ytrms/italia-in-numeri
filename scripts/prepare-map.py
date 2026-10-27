#!/usr/bin/env python3
"""Prepare display geometry from Istat's generalised 2023 regional boundaries.

One-time development dependencies (not needed by the website or its build):
  python3 -m venv .local/map-venv
  .local/map-venv/bin/pip install pyshp==2.3.1 shapely==2.0.7
  .local/map-venv/bin/python scripts/prepare-map.py /path/to/Limiti01012023_g.zip

The archive can be downloaded from SOURCE_URL below. Coordinates remain in the
source's WGS84 / UTM32N projection; a uniform scale and Y-axis flip convert them
to SVG coordinates. No islands are filtered out. Use fill-rule="evenodd"
when rendering paths, and a white boundary stroke of at least 1 viewBox unit.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

import shapefile
from shapely import make_valid
from shapely.geometry import shape

SOURCE_URL = "https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2023/Limiti01012023_g.zip"
MEMBER = "Limiti01012023_g/Reg01012023_g/Reg01012023_g_WGS84"
TOLERANCE_METRES = 600
HEIGHT = 700
PADDING = 10


def polygons(geometry):
    return [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)


def generate(archive_path):
    archive_bytes = archive_path.read_bytes()
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        reader = shapefile.Reader(
            **{ext: io.BytesIO(archive.read(f"{MEMBER}.{ext}")) for ext in ("shp", "shx", "dbf")},
            encoding="utf-8",
        )
        projection = archive.read(f"{MEMBER}.prj").decode("utf-8")
        assert 'WGS_1984_UTM_Zone_32N' in projection, "Unexpected source projection"
        records = []
        for record in reader.iterShapeRecords():
            properties = record.record.as_dict()
            geometry = shape(record.shape.__geo_interface__)
            # Istat's generalised Sardegna polygon has a tiny self-intersection.
            # Repair it, and possible nested shells introduced by simplification.
            simplified = make_valid(make_valid(geometry).simplify(TOLERANCE_METRES, preserve_topology=True))
            assert simplified.is_valid and not simplified.is_empty
            assert abs(simplified.area / geometry.area - 1) < .005, "Excessive area change"
            records.append((int(properties["COD_REG"]), properties["DEN_REG"], geometry, simplified))
    records.sort(key=lambda record: record[0])
    assert [r[0] for r in records] == list(range(1, 21)), "Expected all 20 regions"

    bounds = [geometry.bounds for _, _, geometry, _ in records]
    min_x, min_y = min(b[0] for b in bounds), min(b[1] for b in bounds)
    max_x, max_y = max(b[2] for b in bounds), max(b[3] for b in bounds)
    scale = (HEIGHT - PADDING * 2) / (max_y - min_y)
    width = round((max_x - min_x) * scale + PADDING * 2, 1)

    def project(coordinate):
        x, y = coordinate
        return [round((x - min_x) * scale + PADDING, 1), round((max_y - y) * scale + PADDING, 1)]

    def path_for(geometry):
        paths = []
        for polygon in polygons(geometry):
            for ring in [polygon.exterior, *polygon.interiors]:
                # The final coordinate repeats the first; SVG Z closes the ring.
                coordinates = [project(point) for point in list(ring.coords)[:-1]]
                points = [f"{x:g},{y:g}" for x, y in coordinates]
                paths.append("M" + "L".join(points) + "Z")
        return "".join(paths)

    regions = []
    for region_id, name, original, simplified in records:
        # Use the main polygon, so an archipelago does not move its anchor offshore.
        anchor = max(polygons(simplified), key=lambda polygon: polygon.area).representative_point()
        regions.append({
            "id": region_id,
            "name": name,
            "path": path_for(simplified),
            "anchor": project(anchor.coords[0]),
        })
    return {
        "viewBox": f"0 0 {width:g} {HEIGHT}",
        "source": {
            "publisher": "Istat",
            "title": "Confini delle regioni italiane al 1° gennaio 2023 — versione generalizzata",
            "year": 2023,
            "url": SOURCE_URL,
            "archiveSha256": hashlib.sha256(archive_bytes).hexdigest(),
            "license": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "termsUrl": "https://www.istat.it/note-legali/",
            "projection": "EPSG:32632 — WGS 84 / UTM zone 32N",
            "modifications": "Semplificazione con tolleranza di 600 m e correzione delle autointersezioni; scala uniforme, inversione dell’asse Y e arrotondamento a 0,1 unità SVG. Nessun filtro sulle isole minori.",
        },
        "regions": regions,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Downloaded Istat 2023 generalised boundaries ZIP")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "src" / "italy-regions.json")
    args = parser.parse_args()
    result = generate(args.archive)
    output = json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n"
    args.output.write_text(output, encoding="utf-8")
    print(f"Wrote {len(result['regions'])} regions, viewBox {result['viewBox']}, {len(output.encode('utf-8')):,} bytes to {args.output}")
