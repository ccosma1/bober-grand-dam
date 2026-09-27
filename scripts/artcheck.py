"""Beaver close-ups. Fails the process when ?artcheck=1 reports a miss."""
import base64
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(os.environ.get("TEMP", ".")) / "gd46-art"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:8791/?artcheck=1&v=gd46"
NAMES = ["bober", "nib", "muscle", "tall"]


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--disable-http-cache"])
        page = browser.new_page(viewport={"width": 1000, "height": 760})
        page.on("pageerror", lambda err: print("PAGEERROR", err))
        page.on("console", lambda msg: print("CONSOLE", msg.type, msg.text) if msg.type == "error" else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_function("() => window.__artcheck", timeout=90000)
        report = page.evaluate("() => window.__artcheck")
        print("ART", report)
        for i, name in enumerate(NAMES):
            data = page.evaluate("(i) => window.__artFrame(i)", i)
            if not data or not str(data).startswith("data:image"):
                fails.append(name + " no frame")
                continue
            raw = base64.b64decode(str(data).split(",", 1)[1])
            path = OUT / (name + ".png")
            path.write_bytes(raw)
            print("SHOT", path)
        browser.close()
    if not report.get("ok"):
        for row in report.get("reports") or []:
            for item in row.get("fails") or []:
                fails.append(item)
    if fails:
        print("ARTCHECK_FAIL")
        for item in fails:
            print(" -", item)
        sys.exit(1)
    print("ARTCHECK_OK")


if __name__ == "__main__":
    main()
