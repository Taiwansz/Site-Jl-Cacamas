import math
import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT_DIR = r"c:\Users\stdma\projetos\Site-Jl-Cacamas\blender\textures"
os.makedirs(OUT_DIR, exist_ok=True)


def load_font(size, bold=True):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\impact.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def value_noise_2d(h, w, scale, seed=0):
    rng = np.random.default_rng(seed)
    gh = max(2, h // scale + 2)
    gw = max(2, w // scale + 2)
    grid = rng.random((gh, gw), dtype=np.float32)
    img = Image.fromarray((grid * 255).astype(np.uint8), mode="L").resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def fbm(h, w, octaves=(64, 32, 16, 8, 4), weights=(0.38, 0.26, 0.18, 0.11, 0.07), seed=1):
    acc = np.zeros((h, w), dtype=np.float32)
    for i, (sc, wt) in enumerate(zip(octaves, weights)):
        acc += value_noise_2d(h, w, sc, seed + i * 37) * wt
    mn, mx = acc.min(), acc.max()
    return (acc - mn) / max(1e-5, mx - mn)


def height_to_normal(height_arr, strength=2.2):
    # Sobel-like gradient for crisp tangent-space normal map
    gy, gx = np.gradient(height_arr.astype(np.float32))
    nx = -gx * strength
    ny = -gy * strength
    nz = np.ones_like(nx)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6
    r = np.clip((nx / norm * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    g = np.clip((ny / norm * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    b = np.clip((nz / norm * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(np.stack([r, g, b], axis=-1), mode="RGB")


def build_painted_steel_pbr():
    """
    2048x1024 PBR set for outer painted steel decal panel:
    Albedo + Roughness + Normal Map with realistic orange-peel powdercoat,
    subtle paint chips/scratches, weld/plate seams, micro-prismatic safety chevrons,
    and razor-sharp JL CAÇAMBAS stencil.
    """
    W, H = 2048, 1024
    # Base safety yellow #F4B912
    n_macro = fbm(H, W, (128, 64, 32, 16), (0.4, 0.3, 0.2, 0.1), seed=11)
    n_peel = fbm(H, W, (8, 4), (0.6, 0.4), seed=23)

    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:, :, 0] = 243.0 + (n_macro - 0.5) * 16.0
    base[:, :, 1] = 185.0 + (n_macro - 0.5) * 14.0
    base[:, :, 2] = 18.0 + (n_macro - 0.5) * 10.0

    # Slight vertical dust / rain streak modulation (very realistic, subtle!)
    yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
    dust_mask = np.clip((yy - 0.78) / 0.22, 0.0, 1.0) * (0.4 + 0.6 * n_macro)
    base[:, :, 0] = base[:, :, 0] * (1.0 - dust_mask * 0.16) + 150.0 * (dust_mask * 0.16)
    base[:, :, 1] = base[:, :, 1] * (1.0 - dust_mask * 0.16) + 128.0 * (dust_mask * 0.16)
    base[:, :, 2] = base[:, :, 2] * (1.0 - dust_mask * 0.14) + 92.0 * (dust_mask * 0.14)

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")
    draw = ImageDraw.Draw(img)

    # Roughness canvas (0.34 base satin paint, rougher where dusty/scratched)
    rough = np.full((H, W), 0.34, dtype=np.float32) + (n_macro - 0.5) * 0.10 + dust_mask * 0.38
    # Height map for normal map
    height = n_peel * 0.18 + n_macro * 0.12

    # Realistic metallic scuffs & micro paint chips near bottom & corners
    rng = random.Random(2026)
    scratch_layer = Image.new("L", (W, H), 0)
    sdraw = ImageDraw.Draw(scratch_layer)
    for _ in range(220):
        x0 = rng.randint(50, W - 50)
        y0 = rng.randint(70, H - 55)
        ln = rng.randint(14, 95)
        dy = rng.randint(-14, 14)
        w_line = rng.randint(1, 3)
        # Edge bias: heavier wear near lower third
        if y0 > H * 0.68 or rng.random() < 0.35:
            col = (58, 56, 54, rng.randint(45, 110))
            draw.line([(x0, y0), (x0 + ln, y0 + dy)], fill=col, width=w_line)
            sdraw.line([(x0, y0), (x0 + ln, y0 + dy)], fill=rng.randint(120, 210), width=w_line)
        else:
            col = (255, 224, 108, rng.randint(25, 55))
            draw.line([(x0, y0), (x0 + ln, y0 + dy)], fill=col, width=1)
            sdraw.line([(x0, y0), (x0 + ln, y0 + dy)], fill=60, width=1)

    scratch_arr = np.asarray(scratch_layer, dtype=np.float32) / 255.0
    rough = np.clip(rough + scratch_arr * 0.35, 0.12, 0.96)
    height = height - scratch_arr * 0.35

    # Brand stencil in deep industrial navy (#0A1A3A)
    navy = (10, 26, 58, 246)
    f_reg = load_font(52, bold=True)
    f_title = load_font(198, bold=True)
    f_phone = load_font(132, bold=True)
    f_sub = load_font(60, bold=True)

    # Subtle steel plate border groove
    draw.rectangle([240, 70, W - 240, 82], fill=navy)
    draw.text((W // 2, 134), "CCM 139.7421   ·   CAPACIDADE 4,2 m³   ·   LEI 097/2017", fill=navy, font=f_reg, anchor="mm")
    draw.text((W // 2, 330), "JL CAÇAMBAS", fill=navy, font=f_title, anchor="mm")
    draw.rectangle([360, 456, W - 360, 470], fill=navy)
    draw.text((W // 2, 572), "(19) 3017-4670", fill=navy, font=f_phone, anchor="mm")
    draw.text((W // 2, 712), "(19) 98968-9696", fill=navy, font=f_phone, anchor="mm")
    draw.rounded_rectangle([440, 820, W - 440, 916], radius=16, fill=navy)
    draw.text((W // 2, 868), "jllocacao.com.br  ·  INDAIATUBA / SP", fill=(247, 196, 30, 255), font=f_sub, anchor="mm")

    # Micro-prismatic reflective safety chevrons on left & right
    stripe_w = 112
    for sx in (50, W - 50 - stripe_w):
        stripe_box = Image.new("RGBA", (stripe_w, 608), (244, 244, 244, 255))
        sd = ImageDraw.Draw(stripe_box)
        for offset in range(-608, 780, 96):
            poly = [(0, offset), (stripe_w, offset + 72), (stripe_w, offset + 120), (0, offset + 48)]
            sd.polygon(poly, fill=(214, 24, 24, 255))
        # Subtle diamond prismatic pattern lines
        for py in range(0, 608, 16):
            sd.line([(0, py), (stripe_w, py)], fill=(0, 0, 0, 18), width=1)
        sd.rectangle([0, 0, stripe_w - 1, 607], outline=(24, 24, 24, 255), width=6)
        img.alpha_composite(stripe_box, (sx, 206))
        # Reflective strips are glossy (low roughness) & slightly raised
        rough[206:814, sx:sx + stripe_w] = 0.16
        height[206:814, sx:sx + stripe_w] += 0.25

    img.convert("RGB").save(os.path.join(OUT_DIR, "jl_steel_albedo.png"), "PNG", optimize=True)
    Image.fromarray(np.clip(rough * 255.0, 0, 255).astype(np.uint8), mode="L").save(
        os.path.join(OUT_DIR, "jl_steel_roughness.png"), "PNG", optimize=True
    )
    height_to_normal(height, strength=3.4).save(os.path.join(OUT_DIR, "jl_steel_normal.png"), "PNG", optimize=True)

    # Also build seamless plain yellow painted steel PBR (for hull, ribs, rim)
    H2, W2 = 1024, 1024
    n2 = fbm(H2, W2, (64, 32, 16, 8), (0.38, 0.28, 0.20, 0.14), seed=71)
    n2_fine = fbm(H2, W2, (8, 4), (0.6, 0.4), seed=89)
    b2 = np.zeros((H2, W2, 3), dtype=np.float32)
    b2[:, :, 0] = 243.0 + (n2 - 0.5) * 18.0
    b2[:, :, 1] = 185.0 + (n2 - 0.5) * 16.0
    b2[:, :, 2] = 18.0 + (n2 - 0.5) * 10.0
    p2 = Image.fromarray(np.clip(b2, 0, 255).astype(np.uint8), mode="RGB")
    r2 = np.clip(0.33 + (n2 - 0.5) * 0.14 + n2_fine * 0.08, 0.18, 0.72)
    p2.save(os.path.join(OUT_DIR, "jl_hull_albedo.png"), "PNG", optimize=True)
    Image.fromarray((r2 * 255).astype(np.uint8), mode="L").save(os.path.join(OUT_DIR, "jl_hull_roughness.png"), "PNG", optimize=True)
    height_to_normal(n2_fine * 0.25 + n2 * 0.18, strength=2.6).save(os.path.join(OUT_DIR, "jl_hull_normal.png"), "PNG", optimize=True)


def build_inner_worn_steel_pbr():
    """Realistic worn dumpster interior: matte ochre-yellow steel with vertical rubble scrape streaks and subtle grey cement dust."""
    S = 1024
    # Vertical directional wear (rubble sliding in/out along walls)
    n_wide = fbm(S, S, (128, 64, 32), (0.5, 0.3, 0.2), seed=101)
    streak_src = value_noise_2d(S // 6, S, 4, seed=131)
    streaks = np.asarray(Image.fromarray((streak_src * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC), dtype=np.float32) / 255.0
    dust = np.clip((n_wide - 0.35) * 1.15, 0.0, 0.65)
    scrape = np.clip((streaks - 0.58) * 2.2, 0.0, 0.72)

    rgb = np.zeros((S, S, 3), dtype=np.float32)
    # Warm industrial mustard/ochre inner paint base (not mottled camo!)
    rgb[:, :, 0] = 178.0 * (1 - scrape * 0.45) + 92.0 * (scrape * 0.45)
    rgb[:, :, 1] = 132.0 * (1 - scrape * 0.45) + 88.0 * (scrape * 0.45)
    rgb[:, :, 2] = 32.0 * (1 - scrape * 0.45) + 84.0 * (scrape * 0.45)
    # Soft uniform cement dust patina
    rgb[:, :, 0] = rgb[:, :, 0] * (1 - dust * 0.38) + 138.0 * (dust * 0.38)
    rgb[:, :, 1] = rgb[:, :, 1] * (1 - dust * 0.38) + 134.0 * (dust * 0.38)
    rgb[:, :, 2] = rgb[:, :, 2] * (1 - dust * 0.38) + 126.0 * (dust * 0.38)

    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), mode="RGB")
    draw = ImageDraw.Draw(img)
    rng = random.Random(303)
    for _ in range(320):
        x0, y0 = rng.randint(0, S), rng.randint(0, S)
        # Mostly vertical/diagonal scrapes from bricks & shovels
        x1 = x0 + rng.randint(-28, 28)
        y1 = y0 + rng.randint(40, 180)
        draw.line([(x0, y0), (x1, y1)], fill=(112, 106, 98), width=rng.randint(1, 2))

    img.save(os.path.join(OUT_DIR, "inner_steel_albedo.png"), "PNG", optimize=True)
    rough = np.clip(0.62 + dust * 0.25 - scrape * 0.14, 0.38, 0.95)
    Image.fromarray((rough * 255).astype(np.uint8), mode="L").save(os.path.join(OUT_DIR, "inner_steel_roughness.png"), "PNG", optimize=True)
    height_to_normal(streaks * 0.65 + n_wide * 0.35, strength=3.0).save(os.path.join(OUT_DIR, "inner_steel_normal.png"), "PNG", optimize=True)


def build_concrete_pbr():
    """High-detail porous broken concrete with aggregate speckles & micro-cracks."""
    S = 512
    n1 = fbm(S, S, (32, 16, 8, 4, 2), (0.30, 0.25, 0.20, 0.15, 0.10), seed=211)
    speck = value_noise_2d(S, S, 2, seed=223)
    val = 128.0 + (n1 - 0.5) * 68.0 + (speck - 0.5) * 28.0
    rgb = np.stack([val * 1.01, val * 0.99, val * 0.95], axis=-1)
    Image.fromarray(np.clip(rgb, 45, 225).astype(np.uint8), mode="RGB").save(os.path.join(OUT_DIR, "concrete_albedo.png"), "PNG", optimize=True)
    height_to_normal(n1 * 0.65 + speck * 0.35, strength=5.5).save(os.path.join(OUT_DIR, "concrete_normal.png"), "PNG", optimize=True)


def build_brick_pbr():
    """Brazilian grooved ceramic brick (tijolo baiano) with mortar smears."""
    S = 512
    n1 = fbm(S, S, (32, 16, 8, 4), (0.35, 0.28, 0.22, 0.15), seed=313)
    # Horizontal ceramic grip grooves
    yy = np.linspace(0, 14 * math.pi, S, dtype=np.float32)[:, None]
    grooves = (np.sin(yy) * 0.5 + 0.5) * 0.35
    mortar = np.clip((fbm(S, S, (32, 16, 8), (0.5, 0.3, 0.2), seed=337) - 0.64) * 4.5, 0.0, 0.85)
    r = (176.0 + (n1 - 0.5) * 42.0) * (1 - mortar) + 178.0 * mortar
    g = (78.0 + (n1 - 0.5) * 24.0) * (1 - mortar) + 172.0 * mortar
    b = (42.0 + (n1 - 0.5) * 18.0) * (1 - mortar) + 162.0 * mortar
    rgb = np.stack([r, g, b], axis=-1)
    Image.fromarray(np.clip(rgb, 25, 235).astype(np.uint8), mode="RGB").save(os.path.join(OUT_DIR, "brick_albedo.png"), "PNG", optimize=True)
    height_to_normal(n1 * 0.45 + grooves + mortar * 0.25, strength=4.8).save(os.path.join(OUT_DIR, "brick_normal.png"), "PNG", optimize=True)


def build_wood_pbr():
    """Construction formwork pine plank with wood grain & white concrete splashes."""
    S = 512
    n_base = fbm(S, S, (64, 32, 16, 4), (0.35, 0.30, 0.20, 0.15), seed=409)
    # Stretched horizontal grain
    grain_src = value_noise_2d(S, S // 8, 4, seed=419)
    grain = np.asarray(Image.fromarray((grain_src * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC), dtype=np.float32) / 255.0
    yy = np.linspace(0, 26 * math.pi, S, dtype=np.float32)[:, None]
    rings = np.sin(yy + n_base * 6.5) * 0.5 + 0.5
    cement = np.clip((fbm(S, S, (32, 16, 8), (0.45, 0.35, 0.20), seed=431) - 0.68) * 5.0, 0.0, 0.85)
    r = (162.0 + (rings - 0.5) * 34.0 + (grain - 0.5) * 18.0) * (1 - cement) + 188.0 * cement
    g = (112.0 + (rings - 0.5) * 26.0 + (grain - 0.5) * 14.0) * (1 - cement) + 184.0 * cement
    b = (64.0 + (rings - 0.5) * 18.0) * (1 - cement) + 175.0 * cement
    rgb = np.stack([r, g, b], axis=-1)
    Image.fromarray(np.clip(rgb, 30, 235).astype(np.uint8), mode="RGB").save(os.path.join(OUT_DIR, "wood_albedo.png"), "PNG", optimize=True)
    height_to_normal(rings * 0.35 + grain * 0.35 + cement * 0.3, strength=3.6).save(os.path.join(OUT_DIR, "wood_normal.png"), "PNG", optimize=True)


def build_tarp_pbr():
    """Heavy woven PVC industrial canvas tarp (deep navy-slate weave)."""
    S = 512
    x = np.arange(S, dtype=np.float32)[None, :]
    y = np.arange(S, dtype=np.float32)[:, None]
    weave = (np.sin(x * 1.1) * 0.5 + 0.5) * 0.5 + (np.sin(y * 1.1) * 0.5 + 0.5) * 0.5
    folds = fbm(S, S, (64, 32, 16), (0.5, 0.3, 0.2), seed=503)
    r = 22.0 + folds * 18.0 + weave * 7.0
    g = 38.0 + folds * 24.0 + weave * 9.0
    b = 62.0 + folds * 30.0 + weave * 12.0
    rgb = np.stack([r, g, b], axis=-1)
    Image.fromarray(np.clip(rgb, 10, 140).astype(np.uint8), mode="RGB").save(os.path.join(OUT_DIR, "tarp_albedo.png"), "PNG", optimize=True)
    height_to_normal(weave * 0.38 + folds * 0.62, strength=3.2).save(os.path.join(OUT_DIR, "tarp_normal.png"), "PNG", optimize=True)


def build_gravel_pbr():
    """Dense dark construction rubble bed (crushed basalt gravel, broken brick bits, damp earth/concrete dust)."""
    S = 512
    n1 = fbm(S, S, (16, 8, 4, 2), (0.35, 0.30, 0.20, 0.15), seed=607)
    n2 = fbm(S, S, (8, 4, 2), (0.45, 0.35, 0.20), seed=619)
    red_bits = np.clip((n2 - 0.62) * 4.8, 0.0, 1.0)
    r = (58.0 + n1 * 56.0) * (1 - red_bits) + 132.0 * red_bits
    g = (55.0 + n1 * 52.0) * (1 - red_bits) + 60.0 * red_bits
    b = (50.0 + n1 * 48.0) * (1 - red_bits) + 36.0 * red_bits
    rgb = np.stack([r, g, b], axis=-1)
    Image.fromarray(np.clip(rgb, 24, 165).astype(np.uint8), mode="RGB").save(os.path.join(OUT_DIR, "gravel_albedo.png"), "PNG", optimize=True)
    height_to_normal(n1 * 0.55 + n2 * 0.45, strength=6.5).save(os.path.join(OUT_DIR, "gravel_normal.png"), "PNG", optimize=True)


if __name__ == "__main__":
    build_painted_steel_pbr()
    build_inner_worn_steel_pbr()
    build_concrete_pbr()
    build_brick_pbr()
    build_wood_pbr()
    build_tarp_pbr()
    build_gravel_pbr()
    print("ALL PBR TEXTURE MAPS GENERATED IN:", OUT_DIR)
