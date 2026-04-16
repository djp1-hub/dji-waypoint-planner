# Claude Code – DJI Waypoint Planner

## Na začátku každé session přečti
- PRD.md – aktuální stav projektu a architektura
- ROADMAP.md – plánované funkce a nápady do budoucna

## Klíčové informace o projektu
- PWA aplikace pro plánování misí DJI Mini 4 Pro
- Next.js 16.2.1 + TypeScript + Tailwind + Leaflet.js
- Vercel: dji-waypoint-planner-phi.vercel.app
- Aplikace je prozatím interní, plánuje se komercionalizace

## Před každým pushem vždy spusť
npx tsc --noEmit && npm run build

## Current Status
- **Last done** (2026-04-16): Fáze 1 před komercializací — 3 úkoly:
  1. Geocoding Nominatim → Mapy.cz API (lib/geocoding.ts, NEXT_PUBLIC_MAPY_API_KEY)
  2. droneEnumMap cleanup — odstraněny Air 3 a Mini 3 Pro (neověřený enum / Mini 3 Pro nepodporuje mise)
  3. PWA ikony — nový design (drone top-down view, orange accent), maskable ikony, scripts/generate-icons.py
  + Odstraněn Google Photorealistic 3D Tiles (EEA omezení od 8.7.2025, nefunguje pro CZ účty)
- **Next**: Push na GitHub ✅ hotovo — další priorita: Smart formulář žádosti o povolení letu (ROADMAP)
- **Known issues**:
  - Mapy.cz klíč má domain restriction jen na Vercel doménu — pro localhost přidat `localhost:3000` v developer.mapy.cz
  - Air 3 droneEnumValue neznámý — potřeba reálný KMZ export z DJI Fly pro Air 3
  - Google Cloud účet upgradován na plný (billing aktivní) — klíč smazán, projekt bez Google API

## Architektonická rozhodnutí která musíš znát
- Leaflet crosshair: používej classList (leaflet-crosshair),
  ne inline CSS cursor styly
- Map click eventy: vždy používej useRef pattern
  (ne přímé callbacky) – předchází stale closure bugům
- Geocoding: lib/geocoding.ts je abstrakční vrstva —
  aktuálně Mapy.cz API v1 (NEXT_PUBLIC_MAPY_API_KEY), klíč má domain restriction
- KMZ export: droneEnumValue 67 = DJI Mini 4 Pro (ověřeno), 68 = Mavic 3 Pro (ověřeno)
- Google Photorealistic 3D Tiles: ODSTRANĚNO — EEA omezení (Česká republika blokována)

## Na konci každé session
- Aktualizuj PRD.md sekci "Stav vývoje"
- Přesuň dokončené položky v ROADMAP.md do sekce ✅
