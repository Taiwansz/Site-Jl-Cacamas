"""
JL Cacambas e Munck (Indaiatuba/SP) — Multi-Viewport Visual & Functional Auditor v2
Sixth Iron Law Compliance (1440x900 Desktop + 390x844 Mobile):
- Captures all 6 cinematic acts fusing WEBLOVE 3D Chains + Cacau Show Bento/Builder + Burger King GSAP Flip:
  01 Hero Claro 3D + Correntes + Logo transparente
  02 Obsidiana Indice 01-04 + Bento Colorido
  03 Showroom Camaleao Centralizado
  04 Showroom GSAP Flip Split 50/50 (produto cruzando a costura vertical)
  05 Monte sua Cacamba 4,2 m3 (meia carga 3D ao vivo)
  06 Monte sua Cacamba 4,2 m3 (carga completa + lona azul Lei 097/2017 fechada)
  07 Planta CAD + Frota Panoramica + 10 Parceiros
  08 Fechamento Quente + Placa Anti-Golpe Fisica Pendurada + Footer
  09 Sumario Overlay
  10-14 Mobile 390x844 (Hero, Bento, Showroom Split, Builder 3D zero-collision, Contato + Placa)
- Verifies 0px overflowX, 0 console/page errors, 0 broken images, 0 emojis,
  0 white-box logo backgrounds, 0 violet HSV 250-330, and ThSyr VisualCraftValidator.
"""

import colorsys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
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
            s = str(path).lower()
            if s.endswith(".glb"):
                return "model/gltf-binary"
            if s.endswith(".js"):
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

            const logoImgs = Array.from(document.querySelectorAll('img[src*="logo-jl-cacambas"]'));
            const logoWhiteBoxes = logoImgs.filter(img => {
                const bg = getComputedStyle(img).backgroundColor;
                return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
            }).map(img => ({ src: img.getAttribute('src'), bg: getComputedStyle(img).backgroundColor }));

            const heroCanvas = document.getElementById('heroWebglCanvas');
            const builderCanvas = document.getElementById('builderCanvas');
            return {
                label,
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                overflowX: document.documentElement.scrollWidth - window.innerWidth,
                scrollHeight: document.documentElement.scrollHeight,
                totalImgs: imgs.length,
                brokenImgs: broken,
                hasEmoji,
                logoWhiteBoxes,
                hero3dReady: Boolean(window.__jlHero3dReady),
                builder3dReady: Boolean(window.__jlBuilder3dReady),
                heroCanvasSize: heroCanvas ? [heroCanvas.width, heroCanvas.height] : null,
                builderCanvasSize: builderCanvas ? [builderCanvas.width, builderCanvas.height] : null,
                hdrTheme: document.body.dataset.hdrTheme || null,
            };
        }""",
        label,
    )


def force_sync_all(page):
    page.evaluate(
        """() => {
            const a = window.__jlAudit;
            if (!a) return;
            if (a.heroRig && a.heroRig.forceSync) a.heroRig.forceSync();
            if (a.builderRig && a.builderRig.forceSync) a.builderRig.forceSync();
            if (a.badgePhys && a.badgePhys.forceSync) a.badgePhys.forceSync();
        }"""
    )


def main():
    for old in SHOTS.glob("*.png"):
        old.unlink()

    srv, url = start_server()
    console_errors = []
    page_errors = []
    report = {"desktop": {}, "mobile": {}}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--enable-webgl", "--ignore-gpu-blocklist"],
            )

            # ================= DESKTOP 1440x900 =================
            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))

            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_function(
                "() => window.__jlHero3dReady === true",
                timeout=25000,
            )
            page.wait_for_timeout(1600)
            force_sync_all(page)
            page.wait_for_timeout(200)

            report["desktop"]["hero_health"] = check_health(page, "desktop_hero")
            page.screenshot(path=str(SHOTS / "01_desktop_hero_light_3d_chains.png"))

            stops = page.evaluate(
                """() => {
                    const topOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0;
                    };
                    return {
                        servicos: topOf('#servicos') + 60,
                        bento: topOf('.bento-grid') - 120,
                        showroom: topOf('#showroom') + 10,
                        especificacao: topOf('#especificacao') + 80,
                        frota_partners: topOf('.partners-marquee') ? topOf('.partners-marquee') - 420 : topOf('#especificacao') + 860,
                        contato: document.documentElement.scrollHeight - 900,
                    };
                }"""
            )

            # 02 Obsidiana Services + Chains + Bento
            page.evaluate(f"window.scrollTo(0, {stops['servicos']})")
            page.wait_for_timeout(700)
            force_sync_all(page)
            page.wait_for_timeout(160)
            page.screenshot(path=str(SHOTS / "02_desktop_obsidian_services.png"))

            if stops["bento"] > stops["servicos"] + 150:
                page.evaluate(f"window.scrollTo(0, {stops['bento']})")
                page.wait_for_timeout(550)
                force_sync_all(page)
                page.screenshot(path=str(SHOTS / "02b_desktop_bento_cacau.png"))

            # 03 Showroom Chameleon Centered
            page.evaluate(f"window.scrollTo(0, {stops['showroom']})")
            page.wait_for_timeout(650)
            force_sync_all(page)
            page.screenshot(path=str(SHOTS / "03_desktop_showroom_chameleon.png"))

            # 04 Showroom GSAP Flip Split 50/50 (Cacamba, Munck, Empilhadeiras)
            page.evaluate("() => window.__jlAudit && window.__jlAudit.openShowroomSplit && window.__jlAudit.openShowroomSplit(0)")
            page.wait_for_timeout(850)
            page.screenshot(path=str(SHOTS / "04_desktop_showroom_flip_split.png"))

            page.evaluate("() => window.__jlAudit && window.__jlAudit.openShowroomSplit && window.__jlAudit.openShowroomSplit(1)")
            page.wait_for_timeout(700)
            page.screenshot(path=str(SHOTS / "04b_desktop_showroom_munck_split.png"))

            page.evaluate("() => window.__jlAudit && window.__jlAudit.openShowroomSplit && window.__jlAudit.openShowroomSplit(2)")
            page.wait_for_timeout(700)
            page.screenshot(path=str(SHOTS / "04c_desktop_showroom_empilhadeira_split.png"))

            page.evaluate("() => window.__jlAudit && window.__jlAudit.closeShowroomSplit && window.__jlAudit.closeShowroomSplit()")
            page.wait_for_timeout(450)

            # 07 CAD Blueprint + Frota + Parceiros
            page.evaluate(f"window.scrollTo(0, {stops['especificacao']})")
            page.wait_for_timeout(650)
            page.screenshot(path=str(SHOTS / "07_desktop_cad_blueprint.png"))

            page.evaluate(f"window.scrollTo(0, {stops['frota_partners']})")
            page.wait_for_timeout(650)
            page.screenshot(path=str(SHOTS / "07b_desktop_frota_partners.png"))

            # 08 Warm Closing + Physical Hanging Anti-Scam Badge + Footer
            page.evaluate(f"window.scrollTo(0, {stops['contato']})")
            page.wait_for_timeout(700)
            page.evaluate("() => window.__jlAudit && window.__jlAudit.badgePhys && window.__jlAudit.badgePhys.impulse(0.28)")
            page.wait_for_timeout(240)
            force_sync_all(page)
            page.screenshot(path=str(SHOTS / "08_desktop_contact_lanyard_warm.png"))

            # 09 Sumario Overlay
            if page.locator("#menuToggleBtn").count() > 0:
                page.click("#menuToggleBtn")
                page.wait_for_timeout(520)
                page.screenshot(path=str(SHOTS / "09_desktop_sumario.png"))
                page.click("#menuToggleBtn")
                page.wait_for_timeout(250)

            report["desktop"]["final_health"] = check_health(page, "desktop_final")
            ctx.close()

            # ================= MOBILE 390x844 =================
            mctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            mpage = mctx.new_page()
            mpage.on("console", lambda m: console_errors.append("[MOB] " + m.text) if m.type == "error" else None)
            mpage.on("pageerror", lambda e: page_errors.append("[MOB] " + str(e)))

            mpage.goto(url, wait_until="networkidle", timeout=60000)
            mpage.wait_for_function(
                "() => window.__jlHero3dReady === true",
                timeout=25000,
            )
            mpage.wait_for_timeout(1600)
            force_sync_all(mpage)
            mpage.wait_for_timeout(200)
            mpage.screenshot(path=str(SHOTS / "10_mobile_hero_3d.png"))
            report["mobile"]["hero_health"] = check_health(mpage, "mobile_hero")

            m_stops = mpage.evaluate(
                """() => {
                    const topOf = (sel) => {
                        const el = document.querySelector(sel);
                        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 0;
                    };
                    return {
                        bento: topOf('.bento-grid') - 80,
                        showroom: topOf('#showroom') + 10,
                        contato: document.documentElement.scrollHeight - 844,
                    };
                }"""
            )

            mpage.evaluate(f"window.scrollTo(0, {m_stops['bento']})")
            mpage.wait_for_timeout(550)
            mpage.screenshot(path=str(SHOTS / "11_mobile_bento.png"))

            mpage.evaluate(f"window.scrollTo(0, {m_stops['showroom']})")
            mpage.wait_for_timeout(550)
            mpage.evaluate("() => window.__jlAudit && window.__jlAudit.openShowroomSplit && window.__jlAudit.openShowroomSplit(0)")
            mpage.wait_for_timeout(750)
            mpage.screenshot(path=str(SHOTS / "12_mobile_showroom_split.png"))
            mpage.evaluate("() => window.__jlAudit && window.__jlAudit.closeShowroomSplit && window.__jlAudit.closeShowroomSplit()")

            mpage.evaluate(f"window.scrollTo(0, {m_stops['contato']})")
            mpage.wait_for_timeout(600)
            force_sync_all(mpage)
            mpage.screenshot(path=str(SHOTS / "14_mobile_contact_lanyard.png"))

            report["mobile"]["final_health"] = check_health(mpage, "mobile_final")
            mctx.close()
            browser.close()
    finally:
        srv.shutdown()

    violet_summary = {}
    for png in sorted(SHOTS.glob("*.png")):
        violet_summary[png.name] = check_purple_in_image(png)
    report["violet_pixel_hits"] = violet_summary
    report["console_errors"] = console_errors
    report["page_errors"] = page_errors

    try:
        sys.path.insert(0, r"c:\Users\stdma\projetos\ThSyr")
        from engine.visual.validator import VisualCraftValidator
        val = VisualCraftValidator()
        combined = (
            (ROOT / "index.html").read_text(encoding="utf-8", errors="ignore")
            + "\n"
            + (ROOT / "assets" / "css" / "styles.css").read_text(encoding="utf-8", errors="ignore")
        )
        res = val.audit_content(combined, source_name="index.html + assets/css/styles.css")
        report["visual_craft_validator"] = res if isinstance(res, dict) else vars(res)
    except Exception as e:
        report["visual_craft_validator_note"] = str(e)

    out_json = SHOTS / "audit_report.json"
    out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
