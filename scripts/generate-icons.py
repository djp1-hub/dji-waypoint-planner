"""
generate-icons.py — generuje PWA ikony DJI Waypoint Planner pomocí Pillow.

Použití:
    python scripts/generate-icons.py

Výstup (public/icons/):
    icon-192.png          — standardní ikona 192×192
    icon-512.png          — standardní ikona 512×512
    icon-maskable-192.png — maskable 192×192 (12.5 % padding na každé straně)
    icon-maskable-512.png — maskable 512×512

Design:
    Čelní pohled dronu shora (quadcopter X layout)
    Pozadí: #0f1117 (dark), tělo: #ffffff, ramena+vrtule: #9ca3af
    Akcent: #f97316 (orange-500) — waypointy pod dronem
"""

import math
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Chyba: Nainstaluj Pillow: pip install Pillow")
    sys.exit(1)

# ── Barvy ────────────────────────────────────────────────────────────────────
BG         = (15,  17,  23,  255)   # #0f1117
BODY_COLOR = (255, 255, 255, 255)   # #ffffff
ARM_COLOR  = (156, 163, 175, 255)   # #9ca3af  (gray-400)
PROP_FILL  = (15,  17,  23,  255)   # #0f1117  (překryje konec ramena)
PROP_STROKE= (156, 163, 175, 255)   # #9ca3af
ORANGE     = (249, 115,  22, 255)   # #f97316  (orange-500)
ORANGE_MID = (249, 115,  22, 230)   # mírně průhledný pro route linku

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR   = os.path.join(PROJECT_ROOT, "public", "icons")


def draw_icon(size: int) -> Image.Image:
    """
    Nakreslí ikonu o rozměrech size×size px.
    Všechny souřadnice jsou relativní k size (0.0–1.0 scale).
    """
    img = Image.new("RGBA", (size, size), BG)
    d   = ImageDraw.Draw(img)
    s   = size  # zkratka

    # ── Pomocné funkce ────────────────────────────────────────────────────
    def sc(v: float) -> float:
        """Škáluje relativní souřadnici (0–1) na pixely."""
        return v * s

    def circle(cx: float, cy: float, r: float,
               fill=None, outline=None, width: int = 1) -> None:
        """Nakreslí kruh (souřadnice relativní 0–1)."""
        x0, y0 = sc(cx - r), sc(cy - r)
        x1, y1 = sc(cx + r), sc(cy + r)
        d.ellipse([x0, y0, x1, y1], fill=fill, outline=outline, width=width)

    def line(x0: float, y0: float, x1: float, y1: float,
             color=ARM_COLOR, width: float = 0.04) -> None:
        """Nakreslí linii (souřadnice relativní 0–1)."""
        d.line(
            [sc(x0), sc(y0), sc(x1), sc(y1)],
            fill=color,
            width=max(1, int(width * s))
        )

    def rect(x0: float, y0: float, x1: float, y1: float,
             fill=None, radius: float = 0.025) -> None:
        """Nakreslí zaoblený obdélník (souřadnice relativní 0–1)."""
        d.rounded_rectangle(
            [sc(x0), sc(y0), sc(x1), sc(y1)],
            radius=max(1, int(radius * s)),
            fill=fill
        )

    # ── Ramena dronu (od rohů těla k vrtulím, tloušťka 4.3 %) ─────────────
    # Střed: (0.5, 0.5), tělo: ±0.082 od středu, vrtule středy: ±0.305 od středu
    arm_w = 0.043
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        x0 = 0.5 + dx * 0.082
        y0 = 0.5 + dy * 0.082
        x1 = 0.5 + dx * 0.305
        y1 = 0.5 + dy * 0.305
        line(x0, y0, x1, y1, color=ARM_COLOR, width=arm_w)

    # ── Vrtulové kruhy (outline, přesně na koci ramene) ───────────────────
    prop_r      = 0.094   # poloměr kruhu
    prop_stroke = max(2, int(0.027 * s))
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        cx = 0.5 + dx * 0.305
        cy = 0.5 + dy * 0.305
        # Dark fill překryje konec ramena
        circle(cx, cy, prop_r, fill=PROP_FILL)
        circle(cx, cy, prop_r, outline=PROP_STROKE, width=prop_stroke)

    # ── Tělo dronu (bílý čtverec ve středu) ──────────────────────────────
    body_half = 0.082
    rect(
        0.5 - body_half, 0.5 - body_half,
        0.5 + body_half, 0.5 + body_half,
        fill=BODY_COLOR,
        radius=0.027
    )

    # ── Oranžový waypointový bod (středový marker) ─────────────────────────
    circle(0.5, 0.5, 0.043, fill=ORANGE)

    # ── Waypointová trasa (3 body + linka ve spodní části) ────────────────
    # Linka od 0.27 do 0.73 ve výšce 0.835
    route_y  = 0.835
    route_x0 = 0.26
    route_x1 = 0.74
    route_w  = max(1, int(0.008 * s))
    d.line(
        [sc(route_x0), sc(route_y), sc(route_x1), sc(route_y)],
        fill=ORANGE_MID,
        width=route_w
    )
    # Tři waypointové body na lince
    for wpx in (0.295, 0.5, 0.705):
        circle(wpx, route_y, 0.018, fill=ORANGE)

    return img


def make_maskable(img: Image.Image) -> Image.Image:
    """
    Vytvoří maskable verzi — obsah zmenšen na 75 %, centrován na tmavém pozadí.
    Padding 12.5 % na každou stranu = 25 % total → obsah v centrálních 75 %.
    Android safe zone vyžaduje obsah v centrálních 80 %, takže 75 % je bezpečné.
    """
    size = img.width
    pad_ratio  = 0.125
    inner_size = int(size * (1 - 2 * pad_ratio))
    padding    = int(size * pad_ratio)

    inner  = img.resize((inner_size, inner_size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), BG)
    canvas.paste(inner, (padding, padding), inner)
    return canvas


def save(img: Image.Image, path: str) -> None:
    img.save(path, "PNG", optimize=True)
    kb = os.path.getsize(path) / 1024
    rel = os.path.relpath(path, PROJECT_ROOT)
    print(f"  OK {rel}  ({img.width}x{img.height}px, {kb:.1f} KB)")


def main() -> None:
    print("Generuji PWA ikony DJI Waypoint Planner...\n")
    for size in (192, 512):
        base = draw_icon(size)
        save(base, os.path.join(OUTPUT_DIR, f"icon-{size}.png"))

        maskable = make_maskable(base)
        save(maskable, os.path.join(OUTPUT_DIR, f"icon-maskable-{size}.png"))

    print("\nHotovo. Zkontroluj vystup v public/icons/")


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    main()
