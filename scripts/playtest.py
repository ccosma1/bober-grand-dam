"""Phone, landscape, and desktop gates. Each crest finishes to the podium."""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ref"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:8791/?v=gd47"


def shot(page, name):
    page.screenshot(path=str(OUT / name), animations="disabled")
    print("shot", name)


def show_beavers(page):
    cont = page.locator("#btn-continue")
    if cont.count() and cont.is_visible():
        cont.click()


def begin_race(page):
    show_beavers(page)
    page.click("#btn-start")


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


def sim_wait(page, ms):
    page.evaluate("(sec) => window.__grand.rush(sec)", max(0.016, ms / 1000.0))


def burn_open(page):
    page.evaluate(
        """() => {
          let n = 0;
          while (window.__grand.snapshot().phase !== 'race' && n < 80) {
            window.__grand.rush(0.25);
            n += 1;
          }
        }"""
    )


def leave_splash(page):
    page.evaluate(
        """() => {
          const splash = document.getElementById('btn-splash');
          if (splash) splash.click();
          if (window.__grand.snapshot().phase !== 'splash') {
            const quit = document.getElementById('btn-quit');
            if (quit) quit.click();
          }
        }"""
    )
    page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'", timeout=8000)


def apply_fast(page, result):
    page._laps = set(result.get("seen") or [])
    page._air = result.get("air") or 0
    page._falls = result.get("falls") or 0


def lane_finish(page, side, timeout_s=420):
    page.evaluate("(side) => window.__grand.setLane(side)", side)
    result = page.evaluate("(s) => window.__grand.runRace(s)", timeout_s)
    page.evaluate("() => window.__grand.setLane(null)")
    apply_fast(page, result)
    return snap(page)


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
    sim_wait(page, ms)
    page.mouse.up()


def steer_delta(page, sel, ms=450):
    y0 = snap(page)["yaw"]
    hold(page, sel, ms)
    return wrap_delta(y0, snap(page)["yaw"])


def key_steer_delta(page, key, ms=450):
    y0 = snap(page)["yaw"]
    page.keyboard.down(key)
    sim_wait(page, ms)
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
    if "Cedar Sling" not in page.locator("#exhibit-title").inner_text():
        raise AssertionError("sling detail")
    assert_inside(box(page, "#btn-exhibit-close"), w, h, "close", 40)
    page.click("#btn-exhibit-close")
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("[data-exhibit=nib]")
    page.wait_for_selector("#exhibit", state="visible")
    if page.locator("#exhibit-title").inner_text().strip() != "Pip":
        raise AssertionError("pip card")
    if "smallest beaver" not in page.locator("#exhibit-cap").inner_text():
        raise AssertionError("pip story")
    page.click("#btn-exhibit-close")
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("[data-exhibit=pine]")
    page.wait_for_selector("#exhibit", state="visible")
    if "Pinecone" not in page.locator("#exhibit-title").inner_text():
        raise AssertionError("pine card")
    page.click("#exhibit-scrim", position={"x": 4, "y": 4})
    page.wait_for_selector("#exhibit", state="hidden")
    page.click("#btn-museum-back")
    page.wait_for_selector("#museum", state="hidden")


def key_race(page, timeout_s=400):
    result = page.evaluate("(s) => window.__grand.runKeyed(s)", timeout_s)
    apply_fast(page, result)
    if result.get("phase") != "podium":
        raise AssertionError("keyboard race timeout")
    return snap(page)


def clean_starts(page, n=3):
    for i in range(n):
        begin_race(page)
        burn_open(page)
        sim_wait(page, 900)
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
    if page.locator("#desk-pad").is_visible():
        raise AssertionError("desk pad on phone")
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
    sim_wait(page, ms)
    page.mouse.up()


def auto_crest(page, fails, tid, laps, timeout_s=480, shot_name=None):
    page.click("[data-track=%s]" % tid)
    begin_race(page)
    burn_open(page)
    st = snap(page)
    print("TRACK", tid, st["track"], st["phase"], st["laps"], round(st.get("y") or 0, 1), flush=True)
    if st["track"] != tid or st["phase"] != "race" or st["laps"] != 0:
        fails.append("start " + tid + " " + str(st["track"]) + " " + str(st["laps"]))
    if shot_name:
        shot(page, shot_name)
    page.evaluate("() => window.__grand.setAuto(true)")
    result = page.evaluate("(s) => window.__grand.runRace(s)", timeout_s)
    apply_fast(page, result)
    fin = snap(page)
    print(
        "PODIUM",
        tid,
        fin.get("place"),
        round(fin.get("time") or 0, 2),
        fin.get("laps"),
        sorted(page._laps),
        "air",
        round(page._air, 2),
        "falls",
        page._falls,
        flush=True,
    )
    if (
        fin["phase"] != "podium"
        or fin["laps"] < laps
        or fin.get("lapTarget") != laps
        or (fin.get("time") or 0) < 15
        or not (set(range(1, laps + 1)) <= page._laps)
    ):
        fails.append(
            "%s short %s laps %s target %s hud %s"
            % (tid, fin["phase"], fin.get("laps"), fin.get("lapTarget"), sorted(page._laps))
        )
    if page._air < 0.8:
        fails.append("%s air %.2f" % (tid, page._air))
    if page._falls > 0:
        fails.append("%s falls %s" % (tid, page._falls))
    leave_splash(page)
    return fin


def main():
    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--disable-http-cache"])
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.set_default_timeout(180000)
        page.on("pageerror", lambda err: print("PAGEERROR", err))
        page.on("console", lambda msg: print("CONSOLE", msg.type, msg.text) if msg.type in ("error", "warning") else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_function("() => window.__grand && window.__grand.snapshot().phase === 'splash'")
        page.wait_for_function("() => !document.getElementById('btn-start').disabled", timeout=20000)
        page.evaluate("() => window.__grand.hold(true)")
        if page.locator("#history").count() or page.locator("#btn-history").count():
            fails.append("history still present")
        splash = page.locator("#splash").inner_text()
        low = splash.lower()
        for banned in ("mario", "nintendo", "rainbow", "kart"):
            if banned in low:
                fails.append("splash " + banned)
        for need in ("grand dam", "race the bank", "boost the dam", "first to the crest", "fan game by a holder"):
            if need not in low:
                fails.append("copy " + need)
        tag = page.locator("#build-tag").inner_text().strip()
        tag_px = page.evaluate("() => parseFloat(getComputedStyle(document.getElementById('build-tag')).fontSize)")
        print("TAG", tag, tag_px)
        if tag != "gd47" or tag_px < 12:
            fails.append("build tag " + tag + " " + str(tag_px))
        shot(page, "splash-390.png")
        hero = box(page, "#splash img.hero")
        if hero["height"] > 844 * 0.82 or hero["height"] < 844 * 0.45:
            fails.append("phone hero " + str(round(hero["height"])))
        if page.locator("#roster-pick").is_visible():
            fails.append("roster on track step")
        if not page.locator("#track-pick").is_visible():
            fails.append("tracks hidden")
        page.click("#btn-continue")
        if page.locator("#track-pick").is_visible():
            fails.append("tracks on beaver step")
        if not page.locator("#roster-pick").is_visible():
            fails.append("beavers hidden")
        report = page.evaluate("() => window.__grand.selfTest()")
        print("SELF", report)
        if not report["ok"]:
            fails.append("selfTest " + ",".join(report["fails"]))
        cuts = page.evaluate("() => window.__grand.probeCuts()")
        print("CUTS", cuts)
        if not cuts["ok"]:
            fails.append("cuts " + ",".join(cuts["fails"]))
        frame = page.evaluate("() => window.__grand.frameCheck()")
        print("FRAME", frame)
        if not frame["ok"]:
            fails.append("frame " + str(frame))
        page.click("[data-driver=nib]")
        picked = page.evaluate("() => window.__grand.snapshot()")
        print("DRIVER", picked["driver"], picked["names"], picked["colors"])
        if picked["driver"] != "nib":
            fails.append("driver " + str(picked["driver"]))
        if sorted(picked["names"]) != ["Bober", "Mossback", "Pip", "Reed"]:
            fails.append("names " + str(picked["names"]))
        if len(set(picked["colors"])) != 4:
            fails.append("colors " + str(picked["colors"]))
        sigs = {}
        for driver in ("bober", "muscle", "tall", "nib"):
            show_beavers(page)
            page.click("[data-driver=%s]" % driver)
            begin_race(page)
            burn_open(page)
            body = page.evaluate("() => window.__grand.snapshot()")
            print("MODEL", driver, body["model"], body["sig"], body["driver"])
            if body["driver"] != driver or body["model"] != driver:
                fails.append("model " + driver + " " + str(body["model"]))
            sigs[driver] = body["sig"]
            page.click("#btn-quit")
            page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        if len(set(sigs.values())) != 4:
            fails.append("same mesh " + str(sigs))
        show_beavers(page)
        page.click("[data-driver=nib]")
        page.click("#btn-beaver-back")

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

        show_beavers(page)
        page.click("#btn-start")
        blocked = None
        for i in range(30):
            info = page.evaluate(
                """() => {
                  const s = window.__grand.snapshot();
                  return { clear: window.__grand.sightClear(s.x, s.y + 1.2, s.z), phase: s.phase, time: s.time };
                }"""
            )
            print("SIGHT", i, info["phase"], round(info["time"], 2), info["clear"])
            if not info["clear"]:
                blocked = i
                break
            if info["phase"] == "race" and info["time"] > 1:
                break
            sim_wait(page, 160)
        if blocked is not None:
            fails.append("dam start wall " + str(blocked))
        burn_open(page)
        assert_race_chrome(page, 390, 844)
        page.wait_for_timeout(80)
        if page.locator("#held-name").inner_text().strip() != "—":
            fails.append("hud not empty " + page.locator("#held-name").inner_text())
        if page.locator("#btn-fire").inner_text().strip() != "—":
            fails.append("fire not empty")
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
        for item in ("boost", "trap", "pine", "surge", "magnet", "buckler", "meteor", "slick"):
            if item in ("trap", "slick", "buckler"):
                page.evaluate("(k) => window.__grand.plant(k)", item)
            elif item != "boost":
                page.evaluate("() => window.__grand.draft(-14)")
            got = page.evaluate("(id) => { window.__grand.grant(id); return window.__grand.fireNow(); }", item)
            print("fx", item, got)
            if got != item:
                fails.append("fx " + item + " " + str(got))
                continue
            if item == "boost":
                continue
            sim_wait(page, 750 if item in ("pine", "surge", "meteor") else 400)
            hit = page.evaluate(
                """() => {
                  const s = window.__grand.snapshot();
                  const foe = (s.foes || []).find((f) => f.spin > 0.05 || f.dizzy > 0.05 || f.mark > 0.05);
                  return { toast: s.toast, foe: !!foe };
                }"""
            )
            print("HIT", item, hit)
            if not hit["foe"] or not str(hit["toast"]).startswith("HIT "):
                fails.append("react " + item + " " + str(hit))
        page.evaluate("() => window.__grand.exile(true)")
        for item in ("pine", "surge", "magnet", "meteor"):
            miss = page.evaluate(
                """(id) => {
                  window.__grand.grant(id);
                  const fired = window.__grand.fireNow();
                  const s = window.__grand.snapshot();
                  return { fired, held: s.held, toast: s.toast };
                }""",
                item,
            )
            print("MISS", item, miss)
            if miss["fired"] or miss["held"] != item or miss["toast"] != "NO TARGET":
                fails.append("miss " + item + " " + str(miss))
        page.evaluate("() => window.__grand.exile(false)")
        page.evaluate(
            """() => {
              window.__grand.seatCut('fence');
              window.__grand.setInput({ steer: 0, gas: 1, drift: false, brake: false, fire: false });
            }"""
        )
        sim_wait(page, 4500)
        broke = page.evaluate("() => window.__grand.cutBroken('fence')")
        print("FENCE", broke)
        if not broke:
            fails.append("visible fence")
        shot(page, "fence-dam.png")
        page.evaluate("() => { window.__grand.setInput(null); window.__grand.rewind(); }")
        page.evaluate("() => window.__grand.grant('boost')")
        sim_wait(page, 80)
        if page.locator("#held-name").inner_text().strip() != "BOOST":
            fails.append("hud boost " + page.locator("#held-name").inner_text())
        if page.locator("#held-mark").inner_text().strip() != "BOOST":
            fails.append("hud mark " + page.locator("#held-mark").inner_text())
        if page.locator("#btn-fire").inner_text().strip() != "BOOST":
            fails.append("fire label " + page.locator("#btn-fire").inner_text())
        page.evaluate("() => { window.__grand.draft(-14); window.__grand.grant('pine'); }")
        page.click("#btn-fire")
        sim_wait(page, 120)
        if page.evaluate("() => window.__grand.snapshot().held"):
            fails.append("fire button held")
        stick = box(page, "#stick")
        page.mouse.move(stick["x"] + stick["width"] / 2, stick["y"] + stick["height"] / 2)
        page.mouse.down()
        page.mouse.move(stick["x"] + stick["width"] / 2, stick["y"] + stick["height"] * 0.18)
        sim_wait(page, 500)
        speed = page.evaluate("() => window.__grand.snapshot().speed")
        page.mouse.up()
        print("gas speed", round(speed, 2))
        if speed < 2:
            fails.append("gas no speed " + str(speed))
        shot(page, "race-390.png")
        try:
            page._laps = set()
            key_race(page, 480)
        except Exception as exc:
            fails.append("keyboard race " + str(exc))
        if not ({1, 2, 3, 4} <= set(getattr(page, "_laps", set()))):
            fails.append("lap hud " + str(sorted(getattr(page, "_laps", []))))
        page.wait_for_function("() => window.__grand.snapshot().phase === 'podium'", timeout=8000)
        pod = page.evaluate("() => window.__grand.snapshot()")
        print("PODIUM", pod["place"], round(pod["time"], 2), pod["laps"], pod["lapTarget"])
        if pod["place"] < 1 or pod["place"] > 4:
            fails.append("place")
        if pod["time"] < 15 or pod["laps"] < 4 or pod.get("lapTarget") != 4:
            fails.append("short race %s laps %s target %s" % (pod["time"], pod["laps"], pod.get("lapTarget")))
        if (getattr(page, "_air", 0) or 0) < 0.8:
            fails.append("dam air %.2f" % (page._air or 0))
        if (getattr(page, "_falls", 0) or 0) > 0:
            fails.append("dam falls %s" % page._falls)
        assert_inside(box(page, "#btn-rematch"), 390, 844, "rematch", 44)
        assert_inside(box(page, "#btn-splash"), 390, 844, "splash-back", 40)
        you_row = page.locator("#podium-list li.me").inner_text()
        print("YOU ROW", you_row)
        if "Pip" not in you_row:
            fails.append("podium you " + you_row)
        shot(page, "podium-390.png")
        leave_splash(page)
        for side in ("outer", "inner"):
            begin_race(page)
            burn_open(page)
            fin = lane_finish(page, side)
            print("LANE 390", side, fin["phase"], fin["laps"], fin.get("lapTarget"), sorted(page._laps))
            if fin["phase"] != "podium" or fin["laps"] < 4 or fin.get("lapTarget") != 4 or not ({1, 2, 3, 4} <= page._laps):
                fails.append("lane 390 %s %s laps %s hud %s" % (side, fin["phase"], fin["laps"], sorted(page._laps)))
            if (page._air or 0) < 0.8:
                fails.append("lane 390 %s air %.2f" % (side, page._air or 0))
            if (page._falls or 0) > 0:
                fails.append("lane 390 %s falls %s" % (side, page._falls))
            leave_splash(page)
        auto_crest(page, fails, "frost", 4)
        auto_crest(page, fails, "clover", 4, shot_name="race-clover.png")
        auto_crest(page, fails, "oasis", 3, timeout_s=420, shot_name="race-oasis.png")
        auto_crest(page, fails, "sky", 3, shot_name="race-sky.png")
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
        page.evaluate("() => window.__grand.hold(true)")
        begin_race(page)
        burn_open(page)
        assert_race_chrome(page, 844, 390)
        shot(page, "race-land.png")

        page.set_viewport_size({"width": 1280, "height": 800})
        page.click("#btn-quit")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        page.wait_for_timeout(120)
        desk_hero = box(page, "#splash img.hero")
        desk_stage = box(page, "#stage")
        print("DESK FILL", desk_hero, desk_stage)
        if desk_hero["width"] < 1280 * 0.98 or desk_hero["height"] < 800 * 0.98:
            fails.append("desk hero " + str(desk_hero))
        desk_band = box(page, "#splash .band")
        if not desk_band or desk_band["width"] < 420:
            fails.append("menu card " + str(desk_band))
        if desk_stage["width"] < 1280 * 0.98 or desk_stage["height"] < 800 * 0.98:
            fails.append("desk stage " + str(desk_stage))
        shot(page, "splash-desk.png")
        try:
            museum_round(page, 1280, 800)
            clean_starts(page, 3)
        except Exception as exc:
            fails.append("desk museum/start " + str(exc))
        show_beavers(page)
        page.click("#btn-start")
        desk_blocked = None
        for i in range(30):
            info = page.evaluate(
                """() => {
                  const s = window.__grand.snapshot();
                  return { clear: window.__grand.sightClear(s.x, s.y + 1.2, s.z), phase: s.phase, time: s.time };
                }"""
            )
            print("DESK SIGHT", i, info["phase"], round(info["time"], 2), info["clear"])
            if not info["clear"]:
                desk_blocked = i
                break
            if info["phase"] == "race" and info["time"] > 1:
                break
            sim_wait(page, 160)
        if desk_blocked is not None:
            fails.append("desk start wall " + str(desk_blocked))
        burn_open(page)
        canvas = page.evaluate(
            """() => {
              const c = document.querySelector('#stage canvas');
              return { cw: c.clientWidth, ch: c.clientHeight, iw: innerWidth, ih: innerHeight };
            }"""
        )
        print("DESK CANVAS", canvas)
        if canvas["cw"] < canvas["iw"] * 0.98 or canvas["ch"] < canvas["ih"] * 0.98:
            fails.append("desk canvas " + str(canvas))
        if page.locator("#stick").is_visible() or page.locator("#btn-fire").is_visible():
            fails.append("desktop phone chrome")
        if not page.locator("#desk-fire").is_visible():
            fails.append("desk fire hidden")
        for sel in ("#desk-left", "#desk-right", "#desk-go", "#desk-brake", "#desk-fire"):
            b = box(page, sel)
            if not b or b["height"] < 48 or b["width"] < 48:
                fails.append("desk small " + sel + " " + str(b))
        hold(page, "#desk-go", 700)
        desk_speed = page.evaluate("() => window.__grand.snapshot().speed")
        print("desk go", round(desk_speed, 2))
        if desk_speed < 2:
            fails.append("desk go " + str(desk_speed))
        desk_left = steer_delta(page, "#desk-left", 500)
        print("desk left", round(desk_left, 3))
        if desk_left <= 0.05:
            fails.append("desk left " + str(desk_left))
        page.evaluate("() => window.__grand.grant('boost')")
        sim_wait(page, 80)
        if page.locator("#desk-fire").inner_text().strip() != "BOOST":
            fails.append("desk fire label " + page.locator("#desk-fire").inner_text())
        if page.locator("#held-name").inner_text().strip() != "BOOST":
            fails.append("desk hud " + page.locator("#held-name").inner_text())
        page.click("#desk-fire")
        sim_wait(page, 120)
        if page.evaluate("() => window.__grand.snapshot().held"):
            fails.append("desk fire held")
        if page.evaluate("() => window.__grand.snapshot().boost") <= 0:
            fails.append("desk boost")
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
        page.click("#btn-quit")
        page.wait_for_function("() => window.__grand.snapshot().phase === 'splash'")
        for side in ("outer", "inner"):
            begin_race(page)
            burn_open(page)
            fin = lane_finish(page, side)
            print("LANE DESK", side, fin["phase"], fin["laps"], fin.get("lapTarget"), sorted(page._laps))
            if fin["phase"] != "podium" or fin["laps"] < 4 or fin.get("lapTarget") != 4 or not ({1, 2, 3, 4} <= page._laps):
                fails.append("lane desk %s %s laps %s hud %s" % (side, fin["phase"], fin["laps"], sorted(page._laps)))
            if (page._air or 0) < 0.8:
                fails.append("lane desk %s air %.2f" % (side, page._air or 0))
            if (page._falls or 0) > 0:
                fails.append("lane desk %s falls %s" % (side, page._falls))
            leave_splash(page)
        for tid, laps in (("frost", 4), ("clover", 4), ("oasis", 3), ("sky", 3)):
            auto_crest(page, fails, tid, laps)
        browser.close()
    if fails:
        print("PLAYTEST_FAIL")
        for f in fails:
            print(" -", f)
        sys.exit(1)
    print("PLAYTEST_OK")


if __name__ == "__main__":
    main()
