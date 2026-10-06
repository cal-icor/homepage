"""Generate data/ca_outline.json, the California outline for the homepage usage map.

One-time script; rerun only to change the map's shape or detail. Source is the
US Census Bureau cartographic boundary for California (public domain), as
GeoJSON. Islands are dropped and the mainland is projected equirectangularly
(longitude scaled by cos of the state's middle latitude), then simplified.
assets/js/hub-map.js reads the projection from the output to place campuses.

    python3 scripts/build_ca_outline.py
"""

import json
import math
import urllib.request
from pathlib import Path

SOURCE = "https://raw.githubusercontent.com/glynnbird/usstatesgeojson/master/california.geojson"
OUT = Path(__file__).resolve().parent.parent / "data" / "ca_outline.json"
UNITS_PER_DEGREE = 50
PAD = 8
TOLERANCE = 0.6  # simplification, in output units


def simplify(points, tolerance):
    """Douglas-Peucker."""
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    worst, index = 0.0, 0
    for i in range(1, len(points) - 1):
        x, y = points[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
        if d > worst:
            worst, index = d, i
    if worst <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[: index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)


def main():
    with urllib.request.urlopen(SOURCE, timeout=60) as resp:
        geometry = json.load(resp)["geometry"]
    polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    mainland = max((p[0] for p in polygons), key=len)

    lngs = [p[0] for p in mainland]
    lats = [p[1] for p in mainland]
    lng0, lat_max = min(lngs), max(lats)
    lat_mid = (min(lats) + lat_max) / 2
    kx = UNITS_PER_DEGREE * math.cos(math.radians(lat_mid))
    ky = UNITS_PER_DEGREE

    projected = [((lng - lng0) * kx + PAD, (lat_max - lat) * ky + PAD) for lng, lat in mainland]
    # A closed ring starts and ends on the same point, so split it at the
    # point farthest from the start and simplify each half.
    x0, y0 = projected[0]
    far = max(range(len(projected)), key=lambda i: math.hypot(projected[i][0] - x0, projected[i][1] - y0))
    points = simplify(projected[: far + 1], TOLERANCE)[:-1] + simplify(projected[far:], TOLERANCE)[:-1]

    OUT.write_text(json.dumps({
        "source": "US Census Bureau cartographic boundary (public domain)",
        "projection": {"lng0": round(lng0, 4), "latMax": round(lat_max, 4), "kx": round(kx, 4), "ky": ky, "pad": PAD},
        "width": round((max(lngs) - lng0) * kx + 2 * PAD, 1),
        "height": round((lat_max - min(lats)) * ky + 2 * PAD, 1),
        "points": [[round(x, 1), round(y, 1)] for x, y in points],
    }, separators=(",", ":")) + "\n")
    print(f"{OUT.name}: {len(mainland)} -> {len(points)} points")


if __name__ == "__main__":
    main()
