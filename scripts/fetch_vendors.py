import os
import urllib.request

VENDOR_DIR = r"c:\Users\stdma\projetos\Site-Jl-Cacamas\assets\vendor"
os.makedirs(VENDOR_DIR, exist_ok=True)

FILES = {
    "gsap.min.js": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    "ScrollTrigger.min.js": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
    "Flip.min.js": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Flip.min.js",
    "lenis.min.js": "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js",
    "three.module.min.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js",
    "GLTFLoader.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js",
    "BufferGeometryUtils.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js",
    "RoomEnvironment.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js",
}

for fname, url in FILES.items():
    out = os.path.join(VENDOR_DIR, fname)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = r.read()
    # Rewrite relative jsm utils import inside GLTFLoader.js so all vendor files live flat in assets/vendor/
    if fname == "GLTFLoader.js":
        txt = data.decode("utf-8").replace("../utils/BufferGeometryUtils.js", "./BufferGeometryUtils.js")
        data = txt.encode("utf-8")
    with open(out, "wb") as f:
        f.write(data)
    print(f"VENDOR OK: {fname} ({len(data)//1024} KB)")
