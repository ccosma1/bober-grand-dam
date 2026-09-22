"""Bober Grand Dam app mark. Full-bleed dam section, not a character tile."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"

# Spillway teal, crest amber, warm concrete, deep water ink.
TEAL = (15, 143, 134, 255)  # #0F8F86
AMBER = (240, 160, 36, 255)  # #F0A024
CONCRETE = (215, 196, 168, 255)  # #D7C4A8
INK = (16, 42, 51, 255)  # #102A33


def _u(v: float, size: int) -> float:
    return v * size / 512.0


def _road_top(x: float, size: int) -> float:
    """Top of the crest road. Rises toward the right finish."""
    y0 = _u(118, size)
    y1 = _u(40, size)
    return y0 + (y1 - y0) * (x / float(size))


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CONCRETE)
    draw = ImageDraw.Draw(img)
    thick = _u(102, size)
    pool = _u(406, size)

    draw.polygon(
        [
            (0, 0),
            (size, 0),
            (size, _road_top(size, size)),
            (0, _road_top(0, size)),
        ],
        fill=TEAL,
    )
    draw.polygon(
        [
            (0, _road_top(0, size)),
            (size, _road_top(size, size)),
            (size, _road_top(size, size) + thick),
            (0, _road_top(0, size) + thick),
        ],
        fill=AMBER,
    )
    draw.rectangle((0, pool, size, size), fill=INK)

    # One spillway bay: reservoir through the crest into the plunge pool.
    lip0 = _u(304, size)
    lip1 = _u(412, size)
    flare = _u(20, size)
    toe = _u(476, size)
    draw.polygon(
        [
            (lip0, 0),
            (lip1, 0),
            (lip1 + flare, toe),
            (lip0 - flare, toe),
        ],
        fill=TEAL,
    )

    # Solid cedar bowl planted on the crest, hull above the bank so it
    # is an object on the road, not a slot cut into the amber.
    x0 = _u(34, size)
    x1 = _u(232, size)
    sink = _u(18, size)
    hull = _u(84, size)
    inset = (x1 - x0) * 0.22

    def rim_y(x: float) -> float:
        return _road_top(x, size) - (hull - sink)

    def keel_y(x: float) -> float:
        return _road_top(x, size) + sink

    draw.polygon(
        [
            (x0, rim_y(x0)),
            (x1, rim_y(x1)),
            (x1 - inset, keel_y(x1 - inset)),
            (x0 + inset, keel_y(x0 + inset)),
        ],
        fill=INK,
    )
    return img.convert("RGB")


def write_icons() -> list[Path]:
    OUT.mkdir(parents=True, exist_ok=True)
    paths = [
        OUT / "icon-512.png",
        OUT / "icon-192.png",
        OUT / "bober-grand-dam.ico",
    ]
    render(512).save(paths[0], format="PNG", optimize=True)
    render(192).save(paths[1], format="PNG", optimize=True)

    ico_sizes = (16, 32, 48, 64, 128, 256)
    frames = [render(s).convert("RGBA") for s in ico_sizes]
    frames[-1].save(
        paths[2],
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=frames[:-1],
    )
    return paths


if __name__ == "__main__":
    for path in write_icons():
        print(path)
