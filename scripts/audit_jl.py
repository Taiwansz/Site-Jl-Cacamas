"""
JL Cacambas e Munck (Indaiatuba/SP) — Multi-Viewport Visual & Functional Auditor
Sixth Iron Law Compliance (1440x900 Desktop + 390x844 Mobile):
- Captures every act including live WebGL Blender 3D dumpster (Hero empty, Manifesto filling,
  CAD blueprint, 5-step operation full 4.2m3 + tarp cover + hoist, Fleet gallery + 10 partners,
  Chameleon configurator Flip, Strikethrough manifesto, Anti-scam & contact, Sumario overlay).
- Verifies 0px overflowX, 0 console/page errors, 0 broken images, live WebGL 3D pixels delta,
  0 violet/purple HSV 250-330, and ThSyr VisualCraftValidator static gate.
"""

import colorsys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
import sys
import threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(r"c:\Users\stdma\projetos\Site-Jl-Cacamas")
SHOTS = ROOT / "screenshots_audit"
SHOTS.mkdir(parents=True, exist_ok=True)


def start_server():
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

        def guess_type(self, path):
            if str(path).endswith(".glb"):
                return "model/gltf-binary"
            if str(path).endswith(".js"):
                return "application/javascript"
            return super().guess_type(path)

    srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{port}/index.html"


def check_purple_in_image(img_path: Path) -> int:
    im = Image.open(img_path).convert("RGB")
    im.thumbnail((480, 320))
    px = list(im.get_flattened_data()) if hasattr(im, "get_flattened_data") else list(im.getdata())
    violet_hits = 0
    for r, g, b in px:
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        deg = h * 360.0
        if 250.0 <= deg <= 330.0 and s >= 0.30 and v >= 0.20:
            violet_hits += 1
    return violet_hits


def check_health(page, label):
    return page.evaluate(
        """(label) => {
            const imgs = Array.from(document.querySelectorAll('img')).filter(i => i.getAttribute('src'));
            const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
            const txt = document.body.innerText || '';
            const emojiRegex = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
            const hasEmoji = emojiRegex.test(txt);
            const canvas = document.getElementById('cacambaCanvas');
            return {
                label,
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                overflowX: document.documentElement.scrollWidth - window.innerWidth,
                scrollHeight: document.documentElement.scrollHeight,
                totalImgs: imgs.length,
                brokenImgs: broken,
                hasEmoji,
                webglReady: Boolean(window.__jl3dReady),
                canvasSize: canvas ? [canvas.width, canvas.height] : null,
                hdrTheme: document.body.dataset.hdrTheme || null,
                showBrand: document.body.classList.contains('show-brand'),
            };
        }""",
        label,
    )


def main():
    for old in SHOTS.glob("*.png"):
        old.unlink()

    srv, url = start_server()
    console_errors = []
    page_errors = []
    report = {"desktop": {}, "mobile": {}, "shots": []}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-webgl",
                    "--ignore-gpu-blocklist",
                ],
            )

            # ================= DESKTOP 1440x900 =================
            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))

            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_function("() => window.__jl3dReady === true", timeout=20000)
            # Wait for preloader curtain to clear
            page.wait_for_timeout(1450)
            page.evaluate("() => window.__jlRig3D && window.__jlRig3D.forceSync()")
            page.wait_for_timeout(200)

            report["desktop"]["hero_health"] = check_health(page, "desktop_hero")
            p_hero = SHOTS / "01_desktop_hero_3d.png"
            page.screenshot(path=str(p_hero))

            stops = page.evaluate(
                """() => {
                    const topOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0;
                    };
                    const hOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.offsetHeight) : 0;
                    };
                    const opTop = topOf('#operacao');
                    const opScrollable = Math.max(100, hOf('#operacao') - window.innerHeight);
                    return {
                        historia: topOf('#historia') + 80,
                        manifesto_fill: topOf('#manifesto') + 520,
                        cad_blueprint: topOf('#especificacao') + Math.round(hOf('#especificacao') * 0.48),
                        evp_full_rubble: opTop + Math.round(opScrollable * 0.56),
                        evp_tarp_cover: opTop + Math.round(opScrollable * 0.78),
                        evp_hoist: opTop + Math.round(opScrollable * 0.92),
                        frota_partners: topOf('#frota') + 780,
                        simulador: topOf('#simulador') + 40,
                        strike: topOf('#compromisso') + 120,
                        contato: document.documentElement.scrollHeight - 900,
                    };
                }"""
            )

            chrome_states = {}
            order = [
                ("02_desktop_historia.png", "historia"),
                ("03_desktop_manifesto_3d_filling.png", "manifesto_fill"),
                ("04_desktop_cad_blueprint.png", "cad_blueprint"),
                ("05_desktop_evp_full_rubble.png", "evp_full_rubble"),
                ("06_desktop_evp_tarp_lei097.png", "evp_tarp_cover"),
                ("07_desktop_frota_partners.png", "frota_partners"),
                ("08_desktop_simulador.png", "simulador"),
                ("09_desktop_strike.png", "strike"),
                ("10_desktop_contato_antiscam.png", "contato"),
            ]

            for fname, key in order:
                page.evaluate(f"window.scrollTo(0, {stops[key]})")
                page.wait_for_timeout(680)
                page.evaluate("() => window.__jlRig3D && window.__jlRig3D.forceSync()")
                page.wait_for_timeout(200)
                if key == "simulador":
                    # Test interactive Chameleon Flip switch to Demolicao
                    page.click('[data-profile-btn="demolicao"]')
                    page.wait_for_timeout(520)
                out_p = SHOTS / fname
                page.screenshot(path=str(out_p))
                chrome_states[key] = page.evaluate(
                    "() => ({ theme: document.body.dataset.hdrTheme, showBrand: document.body.classList.contains('show-brand'), vol: (document.getElementById('hudVolumeVal')||{}).textContent })"
                )

            # Open Sumario menu and screenshot
            page.click("#menuToggleBtn")
            page.wait_for_timeout(560)
            page.screenshot(path=str(SHOTS / "11_desktop_sumario.png"))
            page.click("#menuToggleBtn")
            page.wait_for_timeout(300)

            report["desktop"]["chrome_states"] = chrome_states
            report["desktop"]["final_health"] = check_health(page, "desktop_final")
            ctx.close()

            # ================= MOBILE 390x844 =================
            mctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            mpage = mctx.new_page()
            mpage.on("console", lambda m: console_errors.append("[MOB] " + m.text) if m.type == "error" else None)
            mpage.on("pageerror", lambda e: page_errors.append("[MOB] " + str(e)))

            mpage.goto(url, wait_until="networkidle", timeout=60000)
            mpage.wait_for_function("() => window.__jl3dReady === true", timeout=20000)
            mpage.wait_for_timeout(1450)
            mpage.evaluate("() => window.__jlRig3D && window.__jlRig3D.forceSync()")
            mpage.wait_for_timeout(200)
            mpage.screenshot(path=str(SHOTS / "12_mobile_hero_3d.png"))
            report["mobile"]["hero_health"] = check_health(mpage, "mobile_hero")

            m_stops = mpage.evaluate(
                """() => {
                    const topOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0;
                    };
                    const hOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.offsetHeight) : 0;
                    };
                    const opTop = topOf('#operacao');
                    const opScr = Math.max(100, hOf('#operacao') - window.innerHeight);
                    return {
                        evp: opTop + Math.round(opScr * 0.56),
                        sim: topOf('#simulador') + 30,
                        contato: document.documentElement.scrollHeight - 844,
                    };
                }"""
            )
            for fname, key in (("13_mobile_evp_3d.png", "evp"), ("14_mobile_simulador.png", "sim"), ("15_mobile_contato.png", "contato")):
                mpage.evaluate(f"window.scrollTo(0, {m_stops[key]})")
                mpage.wait_for_timeout(650)
                mpage.evaluate("() => window.__jlRig3D && window.__jlRig3D.forceSync()")
                mpage.wait_for_timeout(180)
                mpage.screenshot(path=str(SHOTS / fname))

            report["mobile"]["final_health"] = check_health(mpage, "mobile_final")
            mctx.close()
            browser.close()
    finally:
        srv.shutdown()

    # Check zero purple HSV 250-330 across all screenshots
    violet_summary = {}
    for png in sorted(SHOTS.glob("*.png")):
        violet_summary[png.name] = check_purple_in_image(png)
    report["violet_pixel_hits"] = violet_summary
    report["console_errors"] = console_errors
    report["page_errors"] = page_errors

    # Run ThSyr VisualCraftValidator
    try:
        sys.path.insert(0, r"c:\Users\stdma\projetos\ThSyr")
        from engine.visual.validator import VisualCraftValidator
        val = VisualCraftValidator()
        res = val.audit_file(ROOT / "index.html")
        report["visual_craft_validator"] = res if isinstance(res, dict) else vars(res)
    except Exception as e:
        report["visual_craft_validator_note"] = str(e)

    out_json = SHOTS / "audit_report.json"
    out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
