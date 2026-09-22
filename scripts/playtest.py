"""Phone, landscape, and desktop gates. Finishes one Dam Loop to the podium."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ref"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:8771/?v=gd11"


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


def snap(page):
    return page.evaluate("() => window.__grand.snapshot()")


def wrap_delta(a, b):
    d = b - a
    while d > 3.14159265:
        d -= 6.2831853
    while d < -3.14159265:
        d += 6.2831853
    return d


def hold(page, sel, ms):
    b = box(page, sel)
    page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
    page.mouse.down()
    page.wait_for_timeout(ms)
    page.mouse.up()


def steer_delta(page, sel, ms=450):
    y0 = snap(page)["yaw"]
    hold(page, sel, ms)
    return wrap_delta(y0, snap(page)["yaw"])


def key_steer_delta(page, key, ms=450):
    y0 = snap(page)["yaw"]
    page.keyboard.down(key)
    page.wait_for_timeout(ms)
    page.keyboard.up(key)
    return wrap_delta(y0, snap(page)["yaw"])


def museum_round(page, w, h):
    page.click("#btn-museum")
    page.wait_for_selector("#museum", state="visible")
    hit = page.evaluate(
        """() => {
          const img = document.querySelector('[data-exhibit="dam-loop"] img');
          const r = img.getBoundingClientRect();
          const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !!(el && el.closest('[data-exhibit="dam-loop"]'));
        }"""
    )
    if not hit:
        raise AssertionError("museum art blocked")
    page.click("[data-exhibit=dam-loop]")
    page.wait_for_selector("#exhibit", state="visible")
    if "Dam Loop" not in page.locator("#exhibit-title").inner_text():
        raise AssertionError("dam detail")
    page.click("#exhibit-scrim", position={"x": 4, "y": 4})
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("[data-exhibit=sling-kart]")
    page.wait_for_selector("#exhibit", state="visible")
    if "Sling" not in page.locator("#exhibit-title").inner_text():
        raise AssertionError("kart detail")
    assert_inside(box(page, "#btn-exhibit-close"), w, h, "close", 40)
    page.click("#btn-exhibit-close")
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("[data-exhibit=sap]")
    page.wait_for_selector("#exhibit", state="visible")
    if "Sap" not in page.locator("#exhibit-title").inner_text():
        raise AssertionError("sap card")
    page.click("#exhibit-scrim", position={"x": 4, "y": 4})
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("#btn-museum-back")
    page.wait_for_selector("#museum", state="hidden")


def key_race(page, timeout_s=400):
    import time
    down = set()

    def set_keys(want):
        for key in list(down):
            if key not in want:
                page.keyboard.up(key)
                down.discard(key)
        for key in want:
            if key not in down:
                page.keyboard.down(key)
                down.add(key)

    deadline = time.time() + timeout_s
    try:
        while time.time() < deadline:
            s = snap(page)
            if s["phase"] == "podium":
                return s
            page._laps = getattr(page, "_laps", set())
            page._laps.add(s["lap"])
            advice = s["advice"]
            want = set()
            if advice.get("gas"):
                want.add("KeyW")
            if advice.get("steer", 0) > 0.18:
                want.add("KeyA")
            elif advice.get("steer", 0) < -0.18:
                want.add("KeyD")
            if advice.get("drift"):
                want.add("ShiftLeft")
            if advice.get("fire"):
                want.add("KeyF")
            set_keys(want)
            page.wait_for_timeout(70)
    finally:
        set_keys(set())
    raise AssertionError("keyboard race timeout")


def clean_starts(page, n=3):
    for i in range(n):
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=9000)
        page.wait_for_timeout(900)
        s = snap(page)
        if s["phase"] != "race" or s["laps"] != 0 or s["progress"] >= 0.55:
            raise AssertionError("instant %s %s" % (i, s))
        page.click("#btn-quit")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")


def assert_race_chrome(page, w, h):
    stage = box(page, "#stage")
    assert stage["height"] >= h * 0.58, (stage, h)
    for sel in ("#stick", "#btn-fire"):
        assert_inside(box(page, sel), w, h, sel, 52)
    assert_inside(box(page, "#spark"), w, h, "#spark", 16)
    stick = box(page, "#stick")
    fire = box(page, "#btn-fire")
    assert stick["width"] >= 90 and stick["height"] >= 64, stick
    assert fire["height"] >= 64 and fire["width"] >= 64, fire
    mini = box(page, "#minimap")
    assert_inside(mini, w, h, "minimap", 40)
    if mini["x"] < w * 0.45:
        raise AssertionError("minimap not right " + str(mini))
    sels = ["#stick", "#btn-fire"]
    boxes = [box(page, sel) for sel in sels]
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b = boxes[i], boxes[j]
            ix = min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"])
            iy = min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"])
            if ix > 4 and iy > 4:
                raise AssertionError("overlap %s %s" % (sels[i], sels[j]))
    print("stage", round(stage["height"] / h, 3), "stick", round(stick["width"]), "fire", round(fire["height"]))


def nudge_stick(page, fx, fy, ms=450):
    b = box(page, "#stick")
    cx = b["x"] + b["width"] / 2
    cy = b["y"] + b["height"] / 2
    rad = min(b["width"], b["height"]) * 0.32
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.mouse.move(cx + fx * rad, cy + fy * rad)
    page.wait_for_timeout(ms)
    page.mouse.up()


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda err: print("PAGEERROR", err))
        page.on("console", lambda msg: print("CONSOLE", msg.type, msg.text) if msg.type in ("error", "warning") else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_function("() => window.__grand && window.__grand.snapshot().phase === 'splash'")
        page.wait_for_function("() => !document.getElementById('btn-start').disabled", timeout=20000)
        if page.locator("#history").count() or page.locator("#btn-history").count():
            fails.append("history still present")
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
        page.click("[data-driver=nib]")
        picked = page.evaluate("() => window.__grand.snapshot()")
        print("DRIVER", picked["driver"], picked["names"], picked["colors"])
        if picked["driver"] != "nib":
            fails.append("driver " + str(picked["driver"]))
        if sorted(picked["names"]) != ["BOBER", "MUSCLE", "NIB", "TALL"]:
            fails.append("names " + str(picked["names"]))
        if len(set(picked["colors"])) != 4:
            fails.append("colors " + str(picked["colors"]))
        sigs = {}
        for driver in ("bober", "muscle", "tall", "nib"):
            page.click("[data-driver=%s]" % driver)
            page.click("#btn-start")
            page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
            body = page.evaluate("() => window.__grand.snapshot()")
            print("MODEL", driver, body["model"], body["sig"], body["driver"])
            if body["driver"] != driver or body["model"] != driver:
                fails.append("model " + driver + " " + str(body["model"]))
            sigs[driver] = body["sig"]
            page.click("#btn-quit")
            page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        if len(set(sigs.values())) != 4:
            fails.append("same mesh " + str(sigs))
        page.click("[data-driver=nib]")

        try:
            museum_round(page, 390, 844)
            clean_starts(page, 3)
        except Exception as exc:
            fails.append("phone museum/start " + str(exc))
            browser.close()
            print("PLAYTEST_FAIL")
            for f in fails:
                print(" -", f)
            sys.exit(1)

        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        assert_race_chrome(page, 390, 844)
        nudge_stick(page, -0.3, -0.2, 3000)
        selected = page.evaluate("() => window.getSelection().toString()")
        selectable = page.evaluate("() => getComputedStyle(document.getElementById('stick')).userSelect")
        print("select", repr(selected), selectable)
        if selected.strip() or selectable != "none":
            fails.append("text select " + repr(selected) + " " + selectable)
        ink = page.evaluate(
            """() => {
              const c = document.getElementById('minimap');
              const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
              let n = 0;
              for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++;
              return n;
            }"""
        )
        print("MINIMAP", ink)
        if ink < 30:
            fails.append("minimap blank " + str(ink))
        y0 = snap(page)["yaw"]
        nudge_stick(page, 1, -0.15, 450)
        right_d = wrap_delta(y0, snap(page)["yaw"])
        y1 = snap(page)["yaw"]
        nudge_stick(page, -1, -0.15, 450)
        left_d = wrap_delta(y1, snap(page)["yaw"])
        print("steer R", round(right_d, 3), "L", round(left_d, 3))
        if right_d >= -0.05:
            fails.append("right not right " + str(right_d))
        if left_d <= 0.05:
            fails.append("left not left " + str(left_d))
        for item in ("sap", "trap", "wall", "rocket", "star", "orb"):
            got = page.evaluate("(id) => { window.__grand.grant(id); return window.__grand.fireNow(); }", item)
            print("fx", item, got)
            if got != item:
                fails.append("fx " + item + " " + str(got))
        page.evaluate("() => window.__grand.grant('sap')")
        page.click("#btn-fire")
        page.wait_for_timeout(120)
        if page.evaluate("() => window.__grand.snapshot().held"):
            fails.append("fire button held")
        stick = box(page, "#stick")
        page.mouse.move(stick["x"] + stick["width"] / 2, stick["y"] + stick["height"] / 2)
        page.mouse.down()
        page.mouse.move(stick["x"] + stick["width"] / 2, stick["y"] + stick["height"] * 0.18)
        page.wait_for_timeout(500)
        speed = page.evaluate("() => window.__grand.snapshot().speed")
        page.mouse.up()
        print("gas speed", round(speed, 2))
        if speed < 2:
            fails.append("gas no speed " + str(speed))
        shot(page, "race-390.png")
        try:
            page._laps = set()
            key_race(page, 400)
        except Exception as exc:
            fails.append("keyboard race " + str(exc))
        if not ({1, 2, 3} <= set(getattr(page, "_laps", set()))):
            fails.append("lap hud " + str(sorted(getattr(page, "_laps", []))))
        page.wait_for_function("() => window.__grand.snapshot().phase === 'podium'", timeout=5000)
        pod = page.evaluate("() => window.__grand.snapshot()")
        print("PODIUM", pod["place"], round(pod["time"], 2), pod["progress"])
        if pod["place"] < 1 or pod["place"] > 4:
            fails.append("place")
        if pod["time"] < 15 or pod["laps"] < 3:
            fails.append("short race %s laps %s" % (pod["time"], pod["laps"]))
        assert_inside(box(page, "#btn-rematch"), 390, 844, "rematch", 44)
        assert_inside(box(page, "#btn-splash"), 390, 844, "splash-back", 40)
        you_row = page.locator("#podium-list li.me").inner_text()
        print("YOU ROW", you_row)
        if "NIB" not in you_row:
            fails.append("podium you " + you_row)
        shot(page, "podium-390.png")
        page.click("#btn-splash")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        page.click("[data-track=frost]")
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=9000)
        page.wait_for_timeout(800)
        fr = snap(page)
        print("FROST", fr["track"], round(fr["progress"], 3), fr["laps"])
        if fr["track"] != "frost" or fr["phase"] != "race" or fr["laps"] != 0:
            fails.append("frost start " + str(fr["track"]) + " " + str(fr["laps"]))
        page.evaluate("() => window.__grand.setAuto(true)")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'podium'", timeout=400000)
        fr2 = snap(page)
        print("FROST PODIUM", fr2["place"], round(fr2["time"], 2), fr2["laps"])
        if fr2["laps"] < 3 or fr2["time"] < 15:
            fails.append("frost short")
        page.click("#btn-splash")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        page.locator("#btn-museum").focus()
        page.keyboard.press("Enter")
        page.wait_for_selector("#museum", state="visible")
        page.keyboard.press("Enter")
        page.wait_for_selector("#exhibit", state="visible")
        print("KEY MUSEUM", page.locator("#exhibit-title").inner_text())
        page.keyboard.press("Escape")
        page.wait_for_selector("#exhibit", state="hidden")
        page.keyboard.press("Escape")
        page.wait_for_selector("#museum", state="hidden")

        page.set_viewport_size({"width": 844, "height": 390})
        page.reload(wait_until="networkidle")
        page.wait_for_function("() => window.__grand && !document.getElementById('btn-start').disabled", timeout=20000)
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        assert_race_chrome(page, 844, 390)
        shot(page, "race-land.png")

        page.set_viewport_size({"width": 1280, "height": 800})
        page.click("#btn-quit")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        try:
            museum_round(page, 1280, 800)
            clean_starts(page, 3)
        except Exception as exc:
            fails.append("desk museum/start " + str(exc))
        page.click("#btn-start")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'race'", timeout=8000)
        if page.locator("#stick").is_visible() or page.locator("#btn-fire").is_visible():
            fails.append("desktop phone chrome")
        stage = box(page, "#stage")
        if stage["height"] < 800 * 0.58:
            fails.append("desk stage " + str(stage))
        print("DESK stick", page.locator("#stick").is_visible(), "stage", round(stage["height"] / 800, 3))
        kr = key_steer_delta(page, "ArrowRight")
        kl = key_steer_delta(page, "ArrowLeft")
        print("keys R", round(kr, 3), "L", round(kl, 3))
        if kr >= -0.05:
            fails.append("key right " + str(kr))
        if kl <= 0.05:
            fails.append("key left " + str(kl))
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
