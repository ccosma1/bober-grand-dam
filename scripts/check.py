"""Static gates for Bober Grand Dam."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "css" / "game.css").read_text(encoding="utf-8")
readme = (ROOT / "README.md").read_text(encoding="utf-8")
blob = "\n".join(
    [html, css, readme]
    + [p.read_text(encoding="utf-8") for p in (ROOT / "js").glob("*.js")]
)

fails = []
for word in ("mario", "nintendo", "rainbow road", "peerjs", "room code"):
    if word in blob.lower():
        fails.append("forbidden " + word)

splash = re.search(r'<section id="splash">(.*?)</section>', html, re.S)
if not splash:
    fails.append("no splash")
else:
    text = splash.group(1).lower()
    if "kart" in text:
        fails.append("kart on splash")
    for need in (
        "bober",
        "grand dam",
        "race the bank",
        "drift the dam",
        "first to the crest",
        "fan game by a holder",
        "btn-start",
    ):
        if need not in text:
            fails.append("splash missing " + need)

for need in ("Sling Kart", "Dam Loop", "Frost Ridge", "Sap Shell", "Stick Trap", "Snow Wall", "Yeet Rocket", "Star Thaw", "Blue Lodge Orb", "btn-left", "btn-right", "btn-drift", "btn-gas", "btn-fire", "btn-rematch"):
    if need not in html:
        fails.append("html missing " + need)
if "58dvh" not in css:
    fails.append("stage 58dvh")
if "btn-history" in html or 'id="history"' in html or ">HISTORY<" in html:
    fails.append("history leftover")
if "user-select: none" not in css or "-webkit-touch-callout: none" not in css:
    fails.append("hold select css")
if html.lower().count("data-exhibit=\"dam-loop\"") != 1:
    fails.append("dup dam card")
if html.lower().count("data-exhibit=\"frost-ridge\"") != 1:
    fails.append("dup frost card")
for aid in (
    "assets/splash.jpg",
    "assets/history/dam-loop.jpg",
    "assets/history/crest-drift.jpg",
    "assets/museum/dam-loop.jpg",
    "assets/museum/sling-kart.jpg",
    "assets/vehicles/sheet.jpg",
    "assets/icons/bober-grand-dam.ico",
    "assets/history/frost-ridge.jpg",
    "assets/museum/frost-ridge.jpg",
    "assets/museum/sap.jpg",
    "assets/museum/trap.jpg",
    "assets/museum/wall.jpg",
    "assets/museum/rocket.jpg",
    "assets/museum/star.jpg",
    "assets/museum/orb.jpg",
):
    if not (ROOT / aid).exists():
        fails.append("missing " + aid)

if fails:
    print("CHECK_FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("CHECK_OK")
