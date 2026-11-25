# JL Caçambas e Munck — Indaiatuba / SP

Landing page de alta engenharia visual desenvolvida para a **JL Caçambas e Munck** (JL Locação, fundada em 2013 em Indaiatuba/SP — CNPJ `19.810.393/0001-27`).

## Arquitetura Técnica

- **Modelagem 3D PBR no Blender 5.3.0 (`blender/build_jl_cacamba.py`):**
  - Caçamba estacionária Brooks 4,2 m³ (NBR 14728 / Lei Municipal 097/2017 de Indaiatuba) com bevels estruturais, longarinas I-beam, 6 pinos forjados com placas aparafusadas, olhais de amarração, estêncil oficial (`JL CAÇAMBAS · (19) 3017-4670 · (19) 98968-9696 · CCM 139.7421`) e texturas PBR 2K (Albedo + Roughness + Normal Map).
  - Sistema de 74 peças individuais de entulho (tijolos baianos vazados de 6 furos, blocos de concreto vazados, lajes com vergalhões CA-50 expostos, pedras orgânicas, tábuas de caixaria, tubos PVC ocos e fragmentos cerâmicos) + lona impermeável texturizada com ilhoses e cintas catraca.
  - Exportado em formato `.glb` otimizado (`assets/models/jl_cacamba.glb`) com animações nativas e controle contínuo por scroll via Three.js (`PMREMGenerator` + `RoomEnvironment`).
- **Coreografia Web Motion (Fusão dos 3 Arquétipos + 7 Leis Hero-Poster):**
  - Hero-Poster em 4 camadas Z (`L0` atmosfera -> `L1` tipografia monumental de cartaz -> `L2` caçamba 3D WebGL em entrelaçamento no eixo Z -> `L3` micro-HUD nos 4 cantos).
  - Macro-scrollytelling com `Lenis` + `GSAP 3` (`ScrollTrigger` + `Flip`), sonda de polaridade do header via `elementsFromPoint()`, trilho vertical de capítulos, Sumário fullscreen com `clip-path`, planta técnica CAD SVG desenhada no scroll (`pathLength="1"`), máquina de estados discreta em 5 etapas (`.s-evp`), manifesto riscado (`--strike`) e configurador camaleão conectado ao WhatsApp oficial `(19) 98968-9696`.
- **Acessibilidade e Compliance:**
  - Zero dependências CDN para bibliotecas JS (vendors empacotados em `assets/vendor/`).
  - Degradação limpa sob `prefers-reduced-motion: reduce`.
  - Paleta cromática fiel à marca e à Lei Municipal 097/2017 (zero violeta/roxo `HSV 250-330`).
  - Selo explícito de verificação de segurança anti-golpe para o canal oficial `(19) 98968-9696` / `(19) 3017-4670`.

## Execução Local

```bash
python -m http.server 8080
```

Abra `http://127.0.0.1:8080`.
