"""Phone, landscape, and desktop gates. Finishes one Dam Loop to the podium."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ref"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:8771/?v=gd1"


def shot(page, name):
    page.screenshot(path=str(OUT / name), animations="disabled")
    print("shot", name)


def box(page, sel):
    return page.locator(sel).bounding_box()


def assert_inside(b, w, h, name, min_h=36):
    if not b:
        raise AssertionError(name + " missing")
    if b["width"] < 40 or b["height"] < min_h:
        raise AssertionError(name + " thin " + str(b))
    if b["x"] < -1 or b["y"] < -1:
        raise AssertionError(name + " origin " + str(b))
    if b["x"] + b["width"] > w + 1 or b["y"] + b["height"] > h + 1:
        raise AssertionError(name + " clipped " + str(b) + f" vp {w}x{h}")


def assert_race_chrome(page, w, h):
    stage = box(page, "#stage")
    assert stage["height"] >= h * 0.58, (stage, h)
    for sel in ("#btn-left", "#btn-right", "#btn-drift", "#btn-gas"):
        assert_inside(box(page, sel), w, h, sel, 52)
    assert_inside(box(page, "#spark"), w, h, "#spark", 16)
    gas = box(page, "#btn-gas")
    drift = box(page, "#btn-drift")
    assert gas["height"] >= 52, gas
    assert drift["height"] >= 52, drift
    print("stage", round(stage["height"] / h, 3), "gas", round(gas["height"]), "drift", round(drift["height"]))


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda err: print("PAGEERROR", err))
        page.on("console", lambda msg: print("CONSOLE", msg.type, msg.text) if msg.type in ("error", "warning") else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_function("() => window.__grand && window.__grand.snapshot().phase === 'splash'")
        splash = page.locator("#splash").inner_text()
        low = splash.lower()
        for banned in ("mario", "nintendo", "rainbow", "kart"):
            if banned in low:
                fails.append("splash " + banned)
        for need in ("grand dam", "race the bank", "drift the dam", "first to the crest", "fan game by a holder"):
            if need not in low:
                fails.append("copy " + need)
        shot(page, "splash-390.png")
        report = page.evaluate("() => window.__grand.selfTest()")
        print("SELF", report)
        if not report["ok"]:
            fails.append("selfTest " + ",".join(report["fails"]))
        frame = page.evaluate("() => window.__grand.frameCheck()")
        print("FRAME", frame)
        if not frame["ok"]:
            fails.append("frame " + str(frame))

        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        assert_race_chrome(page, 390, 844)
        page.mouse.move(300, 780)
        gas = box(page, "#btn-gas")
        page.mouse.move(gas["x"] + gas["width"] / 2, gas["y"] + gas["height"] / 2)
        page.mouse.down()
        page.wait_for_timeout(500)
        speed = page.evaluate("() => window.__grand.snapshot().speed")
        page.mouse.up()
        print("gas speed", round(speed, 2))
        if speed < 2:
            fails.append("gas no speed " + str(speed))
        page.evaluate("() => window.__grand.setAuto(true)")
        page.wait_for_timeout(3500)
        shot(page, "race-390.png")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'podium'", timeout=100000)
        snap = page.evaluate("() => window.__grand.snapshot()")
        print("PODIUM", snap["place"], round(snap["time"], 2), snap["progress"])
        if snap["place"] < 1 or snap["place"] > 4:
            fails.append("place")
        assert_inside(box(page, "#btn-rematch"), 390, 844, "rematch", 44)
        assert_inside(box(page, "#btn-splash"), 390, 844, "splash-back", 40)
        you_row = page.locator("#podium-list li.me").inner_text()
        print("YOU ROW", you_row)
        if "YOU" not in you_row:
            fails.append("podium you")
        shot(page, "podium-390.png")
        page.click("#btn-splash")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")

        page.set_viewport_size({"width": 844, "height": 390})
        page.reload(wait_until="networkidle")
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        assert_race_chrome(page, 844, 390)
        shot(page, "race-land.png")

        page.set_viewport_size({"width": 1280, "height": 800})
        page.click("#btn-quit")
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        assert_race_chrome(page, 1280, 800)
        shot(page, "race-desk.png")
        browser.close()
    if fails:
        print("PLAYTEST_FAIL")
        for f in fails:
            print(" -", f)
        sys.exit(1)
    print("PLAYTEST_OK")


if __name__ == "__main__":
    main()
