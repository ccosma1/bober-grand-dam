from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "assets" / "ref"
URL = "http://127.0.0.1:8771/?v=gd2"

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    page = b.new_page(viewport={"width": 390, "height": 844})
    page.goto(URL, wait_until="networkidle")
    page.click("#btn-start")
    page.wait_for_function("() => window.__grand.snapshot().phase === 'race'")
    page.evaluate("() => window.__grand.setAuto(true)")
    page.wait_for_timeout(4000)
    page.screenshot(path=str(OUT / "race-390.png"), animations="disabled")
    b.close()
    print("shot")
