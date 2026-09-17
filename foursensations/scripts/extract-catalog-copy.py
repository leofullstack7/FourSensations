from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
text = re.sub(r"\s+", " ", (ROOT / "docs/_catalogo-flat.txt").read_text(encoding="utf-8"))

MARKERS = [
    ("Dulce Renacer", "DULCE RENACER Tratamiento Capilar Nutritivo"),
    ("Sensación Primaveral", "SENSACIÓN PRIMAVERAL Repolarizador"),
    ("Tentación Equilibrio", "TENTACIÓN EQUILIBRIO Shampoo"),
    ("Tentación Nutrición", "TENTACIÓN NUTRICIÓN Shampoo"),
    ("Scalp Therapy", "SCALP THERAPY Shampoo"),
    ("Scrub Glow", "SCRUB GLOW"),
    ("Botanical", "SHAMPOO BOTANICAL"),
    ("Cepillo Masajeador Capilar", "CEPILLO MASAJEADOR"),
    ("Fantasía Natural", "FANTASÍA NATURAL Bloqueador Capilar es") if "FANTASÍA NATURAL Bloqueador Capilar es" in text else ("Fantasía Natural", "FANTASÍA NATURAL"),
    ("Luna Llena", "LUNA LLENA SOS"),
    ("Suspiros", "SUSPIROS"),
    ("Secreto de Primavera", "SECRETO DE PRIMAVERA Tónico"),
    ("Proteína 10 en 1", "PROTEÍNA CAPILAR 10 EN 1 Tratamiento"),
    ("Shine Gloss", "Óleo Capilar Ultraligero"),
    ("Brumas capilares", "Los Perfumes Capilares"),
    ("Bloom Shine", "BLOOM SHINE"),
    ("Sweet Love", "SWEET LOVE"),
    ("Scarlette", "SCARLETTE"),
    ("Golden Glow", "GOLDEN GLOW"),
    ("Shots", "Los Shots Capilares Four Sensations son"),
]

# Prefer the product start of Fantasía (first header, not later mention)
MARKERS = [m for m in MARKERS if m[0] != "Fantasía Natural"] + [("Fantasía Natural", "FANTASÍA NATURAL")]

found = []
used = set()
for name, needle in MARKERS:
    i = text.upper().find(needle.upper())
    if i < 0:
        print("MISSING", name)
        continue
    if name in used:
        continue
    used.add(name)
    found.append((i, name))

# Fantasía: first occurrence at 15505 is the product page
found = [(i, n) for i, n in found]
found.sort()

ALIASES = {
    "Proteína 10 en 1": ["Proteína Capilar", "Proteina Capilar", "Proteína Capilar 10 en 1"],
    "Shots": ["Shots Capilares", "Shots x3"],
    "Scalp Therapy": ["Exfoliante Capilar Detox"],
    "Botanical": ["Shampoo Botanical"],
    "Shine Gloss": ["2. Shine Gloss"],
    "Fantasía Natural": ["Fantasia Natural", "1. Fantasia Natural"],
    "Scrub Glow": ["3. Scrub glow", "Scrub glow"],
    "Brumas capilares": ["4. Brumas capilares", "Perfumes Capilares"],
}

def clean(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip(" _")
    s = s.replace(" ,", ",").replace(" .", ".")
    return s

catalog = {}
for idx, (start, name) in enumerate(found):
    end = found[idx + 1][0] if idx + 1 < len(found) else min(len(text), start + 4500)
    chunk = text[start:end]

    hook_m = re.search(r"¿([^?]{10,180})\?", chunk)
    hook = f"¿{clean(hook_m.group(1))}?" if hook_m else ""

    tagline = ""
    tm = re.search(
        r"(Tratamiento Capilar Nutritivo|Repolarizador Capilar|Óleo Capilar Ultraligero(?: de Bioinnovación Capilar)?|Tónico Capilar|Exfoliante Capilar Detox|Bloqueador Capilar|SOS Nocturno para Puntas en Emergencia Capilar|Tratamiento Capilar Multifuncional|Shampoo \+ Acondicionador[^?]{0,60}|Brumas Capilares Sin Alcohol)",
        chunk,
        re.I,
    )
    if tm:
        tagline = clean(tm.group(1))

    desc = ""
    dm = re.search(r"((?:[A-ZÁÉÍÓÚÑ][^\s]{2,}(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9]{1,20}){0,6})\s+es(?: un[a]?)? .+?)(?=\s+Ideal para:|\s+Beneficios\b)", chunk)
    if not dm:
        dm = re.search(r"((?:Los|El|La|Un)\s+.{8,80}?\s(?:es|son)\s+.+?)(?=\s+Ideal para:|\s+Beneficios\b)", chunk)
    if dm:
        desc = clean(dm.group(1))[:780]

    ideal = ""
    im = re.search(r"Ideal para:\s*(.+?)(?=\s+Beneficios\b)", chunk)
    if im:
        ideal = clean(im.group(1))[:280]

    bens = []
    bb = re.search(r"Beneficios\s*(.+?)(?=\s+Modo de uso|\s+CONTENIDO:)", chunk)
    if bb:
        bens = [clean(b) for b in re.findall(r"●\s*([^●]{8,180})", bb.group(1))]
        bens = [b.rstrip(".") for b in bens if "CONTENIDO" not in b and len(b) > 12][:8]

    how = ""
    hm = re.search(r"Modo de uso\s*(.+?)(?=\s+CONTENIDO:|\s+PRECIO PÚBLICO:)", chunk)
    if hm:
        how = clean(hm.group(1))
        how = re.sub(r"(?<!\d)(\d+)\.\s+", r"\1. ", how)
        if len(how) > 780:
            how = how[:780].rsplit(" ", 1)[0] + "…"

    content = ""
    cm = re.search(r"CONTENIDO:\s*([0-9][^P]{1,50}?)(?=\s+PRECIO|\s+CATEGORÍA|$)", chunk)
    if cm:
        content = clean(cm.group(1))

    price = ""
    pm = re.search(r"PRECIO PÚBLICO:\s*([\d\.]+)", chunk)
    if pm:
        price = pm.group(1)

    catalog[name] = {
        "tagline": tagline[:110],
        "hook": hook,
        "description": desc,
        "idealFor": ideal,
        "benefits": bens,
        "howTo": how,
        "content": content[:70],
        "pricePublicHint": price,
        "aliases": ALIASES.get(name, []),
    }

(ROOT / "lib/catalog-product-copy.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("count", len(catalog))
for k, v in catalog.items():
    print(f"{k:28} d={len(v['description']):3} b={len(v['benefits'])} h={len(v['howTo']):3} {v['tagline'][:40]!r} {v['content']!r} ${v['pricePublicHint']}")
