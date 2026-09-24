"""Pack splash, history stills, and the Cedar Sling museum crop."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r"C:\Users\calle\.grok\sessions\C%3A%5CUsers%5Ccalle\01a0ca12-a7b2-7d40-b329-045c872cb3ab\images")


def jpeg(src, dest, size=None, quality=86):
    im = Image.open(src).convert("RGB")
    if size:
        im.thumbnail(size, Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=quality, optimize=True)
    print(dest.name, im.size)


def museum_kart():
    im = Image.open(SRC / "4.jpg").convert("RGB")
    w, h = im.size
    # Third view in the lineup is the front three-quarter.
    crop = im.crop((int(w * 0.48), int(h * 0.18), int(w * 0.74), int(h * 0.86)))
    dest = ROOT / "assets" / "museum" / "sling-kart.jpg"
    crop.save(dest, "JPEG", quality=88, optimize=True)
    sheet = ROOT / "assets" / "vehicles" / "sheet.jpg"
    im.save(sheet, "JPEG", quality=88, optimize=True)
    print("kart", crop.size, "sheet", im.size)


def main():
    jpeg(SRC / "5.jpg", ROOT / "assets" / "splash.jpg", None, 86)
    jpeg(SRC / "5.jpg", ROOT / "assets" / "history" / "crest-drift.jpg", None, 84)
    jpeg(SRC / "1.jpg", ROOT / "assets" / "history" / "dam-loop.jpg", None, 86)
    jpeg(SRC / "1.jpg", ROOT / "assets" / "museum" / "dam-loop.jpg", None, 84)
    museum_kart()


if __name__ == "__main__":
    main()
