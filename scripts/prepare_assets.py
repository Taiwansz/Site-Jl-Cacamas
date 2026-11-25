import os
import shutil
from PIL import Image

RESEARCH_MEDIA = r"c:\Users\stdma\projetos\Site-Jl-Cacamas\research\full_media"
OUT_IMG = r"c:\Users\stdma\projetos\Site-Jl-Cacamas\assets\img"
OUT_PARTNERS = os.path.join(OUT_IMG, "partners")
os.makedirs(OUT_IMG, exist_ok=True)
os.makedirs(OUT_PARTNERS, exist_ok=True)

# 1. Official Logo (preserve full alpha PNG)
logo_src = os.path.join(RESEARCH_MEDIA, "2023_06_LOGO-CACAMBA.jpg-e1772068071250-removebg-preview.png")
if os.path.exists(logo_src):
    im = Image.open(logo_src).convert("RGBA")
    # Tight crop transparent borders
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.save(os.path.join(OUT_IMG, "logo-jl-cacambas.png"), "PNG", optimize=True)
    # Also create favicon 64x64
    fav = im.copy()
    fav.thumbnail((64, 64), Image.LANCZOS)
    canvas = Image.new("RGBA", (64, 64), (10, 33, 78, 255))
    canvas.alpha_composite(fav, ((64 - fav.width) // 2, (64 - fav.height) // 2))
    canvas.save(os.path.join(OUT_IMG, "favicon.png"), "PNG", optimize=True)
    print("LOGO OK:", im.size)

# 2. High-res curated authentic JL Cacambas photos (WebP/JPEG optimized for fast LCP)
photo_map = {
    "2023_06_Design-sem-nome-5.png": ("frota-parque-ecologico.jpg", 1600),
    "2023_06_02.jpg": ("cacambas-fileira.jpg", 1200),
    "2023_06_03.jpg": ("caminhao-lona-lei097.jpg", 1200),
    "2023_06_04.jpg": ("frota-patio.jpg", 1200),
    "2023_06_06.jpg": ("cacamba-obra-residencial.jpg", 1200),
    "2023_06_p-5-1.jpg": ("icamento-poliguindaste.jpg", 1100),
    "2023_06_c5.jpg": ("entrega-via-publica.jpg", 1100),
    "2023_06_c2.jpg": ("caminhao-vw-operacao.jpg", 1000),
    "2023_06_remocao-de-entulho-em-curitiba.jpg": ("entulho-macro.jpg", 1400),
}

for src_name, (dst_name, max_dim) in photo_map.items():
    sp = os.path.join(RESEARCH_MEDIA, src_name)
    if not os.path.exists(sp):
        print("MISSING PHOTO:", src_name)
        continue
    im = Image.open(sp).convert("RGB")
    if max(im.size) > max_dim:
        im.thumbnail((max_dim, max_dim), Image.LANCZOS)
    dp = os.path.join(OUT_IMG, dst_name)
    im.save(dp, "JPEG", quality=86, optimize=True, progressive=True)
    print(f"PHOTO OK: {dst_name} {im.size} ({os.path.getsize(dp)//1024} KB)")

# 3. 10 Real B2B Partners of JL Cacambas Indaiatuba (trimmed clean cards)
partner_map = {
    "2023_06_1-1.png": "polo-shopping-indaiatuba.png",
    "2023_06_3-1.png": "mrv-engenharia.png",
    "2023_06_7.png": "schott.png",
    "2023_06_5.png": "tmd-friction.png",
    "2023_06_2.png": "sonda-supermercados.png",
    "2023_06_8.png": "hcon-engenharia.png",
    "2023_06_6.png": "arboreal.png",
    "2023_06_10.png": "italo-decor.png",
    "2024_06_1-1.png": "marmoraria-prime.png",
    "2024_06_2-1.png": "grupo-vasconcelos.png",
}

for src_name, dst_name in partner_map.items():
    sp = os.path.join(RESEARCH_MEDIA, src_name)
    if not os.path.exists(sp):
        continue
    im = Image.open(sp).convert("RGBA")
    im.thumbnail((420, 180), Image.LANCZOS)
    dp = os.path.join(OUT_PARTNERS, dst_name)
    im.save(dp, "PNG", optimize=True)
    print(f"PARTNER OK: {dst_name} {im.size}")
