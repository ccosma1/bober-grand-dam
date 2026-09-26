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
        "boost the dam",
        "first to the crest",
        "fan game by a holder",
        "btn-start",
    ):
        if need not in text:
            fails.append("splash missing " + need)

for need in ("Cedar Sling", "Dam Loop", "Frost Ridge", "Crown Clover", "Oasis Leap", "Sky Loop 360", "Stick Trap", "Pinecone Barrage", "Dam Surge", "Lodge Magnet", "Bark Buckler", "Meteor Chip", "Resin Slick", "BOOST", "BOBER", "Bober", "Pip", "Mossback", "Reed", "btn-fire", "id=\"stick\"", "id=\"minimap\"", "btn-rematch", "gd44"):
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
for exhibit in ("crown-clover", "oasis-leap", "sky-loop"):
    if html.lower().count('data-exhibit="%s"' % exhibit) != 1:
        fails.append("dup " + exhibit)
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
    "assets/museum/crown-clover.jpg",
    "assets/museum/oasis-leap.jpg",
    "assets/museum/sky-loop.jpg",
    "assets/museum/sap.jpg",
    "assets/museum/trap.jpg",
    "assets/museum/wall.jpg",
    "assets/museum/rocket.jpg",
    "assets/museum/star.jpg",
    "assets/museum/orb.jpg",
    "assets/museum/twig.jpg",
    "assets/museum/log.jpg",
    "assets/museum/mist.jpg",
    "assets/museum/bomb.jpg",
    "assets/museum/bober.jpg",
    "assets/museum/nib.jpg",
    "assets/museum/muscle.jpg",
    "assets/museum/tall.jpg",
):
    if not (ROOT / aid).exists():
        fails.append("missing " + aid)

if fails:
    print("CHECK_FAIL")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("CHECK_OK")
