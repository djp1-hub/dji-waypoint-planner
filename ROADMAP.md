# Roadmap – DJI Waypoint Planner

## 📋 Střední priorita
- [x] Sdílení misí jako URL odkaz (URL encode JSON mise)

## 💡 Nápady a budoucí rozvoj
- [x] Správa pilotů – více uložených pilotů
      (jméno, email, číslo provozovatele ÚCL,
      číslo průkazu A1/A3/A2), výběr aktivního
      pilota před misí, možnost přidat/upravit/smazat

- [x] Správa dronů – více uložených dronů
      (název, výrobce, hmotnost, třída C0/C1/C2,
      výrobní číslo, výdrž baterie Wh, průměrná spotřeba W,
      max výška, max rychlost), DJI Mini 4 Pro jako výchozí,
      výběr dronu při plánování mise, odhad
      baterie přepočítán dle vybraného dronu

- [x] Kombinace pilot + dron – aktivní pilot + dron
      zobrazeny v hlavičce sidebaru (badge), výběr přes /settings,
      odhad baterie přepočítán automaticky dle zvoleného dronu

- [ ] Smart formulář žádosti o povolení letu –
      předvyplnění z mise (GPS souřadnice, výška,
      typ zóny), profilu pilota a vybraného dronu.
      Odesílání přes mailto: na správný orgán dle
      typu zóny (ÚCL, správa NP/CHKO, provozovatel
      letiště, Správa železnic, AOPK).
      Šablony žádostí a kontakty pro každý typ zóny.

- [x] Drony — pouze ověřené modely (Mini 4 Pro=67, Mavic 3 Pro=68);
      Air 3 a Mini 3 Pro odstraněny (neověřený droneEnumValue / Mini 3 Pro
      nepodporuje waypoint mise)

- [ ] Standalone režim identifikátoru letových zón –
      aplikace použitelná bez plánování mise pouze
      jako nástroj pro:
      a) Identifikaci letových omezení na mapě
         (zobrazení zón v okolí aktuální polohy)
      b) Odeslání žádosti o povolení letu
         přes smart formulář
      c) Přímý kontakt dotčeného úřadu nebo správce
      Vhodné pro piloty kteří plánují mimo aplikaci
      ale potřebují rychle zkontrolovat zóny
      a vyřídit povolení.

- [ ] Komercionalizace – multi-user, přihlášení, Supabase
- [x] Help sekce – sekce #letzone (letové zóny, barevná legenda CTR/TRA,
      postup při kolizi, odkaz na dronemap.gov.cz) a #kolize (kolizní detekce,
      severity ⛔/⚠️/ℹ️, sidebar banner, KMZ warning) přidány do navigace i obsahu
- [ ] Help sekce – průběžně aktualizovat při každé
      nové funkci. Pravidlo: každá nová funkcionalita
      = nová nebo rozšířená sekce v /help.
- [x] Odhad spotřeby baterie a doby letu (Mini 4 Pro, Haversine 3D, progress bar)
- [ ] Mobilní notifikace při přiblížení se k CTR/TRA zónám

## 🔮 Budoucí rozšíření leteckých omezení
- [ ] NOTAMy – dočasná omezení v reálném čase
- [ ] Check-in do DroneMap (vyžaduje partnerství
      s ŘLP ČR)

## 🎨 Design a vzhled (až po dokončení funkcionalit)

- [ ] Finální redesign UI – konzistentní barevná paleta,
      typografie, ikony
- [ ] Sidebar – vizuální hierarchie, lepší spacing,
      aktivní stavy tlačítek
- [ ] Mobilní responzivita – přizpůsobení pro tablet/mobil
- [ ] Branding – logo, název, favicon
- [ ] Animace a přechody – plynulejší UX
- [ ] Dark/light mode (volitelné)
- [ ] 3D náhled – tmavší overlay UI, modernější tlačítka
- [ ] Anglická lokalizace (i18n) – až po finálním
      designu, poslední krok před vydáním

*Poznámka: Design se dělá až po dokončení všech funkcionalit.*

## ✅ Dokončeno (přesunuto z plánů)
- [x] Geocoding Nominatim → Mapy.cz API v1 (lib/geocoding.ts, NEXT_PUBLIC_MAPY_API_KEY)
      Nominatim zakázán pro komerční provoz — nahrazen Mapy.cz (nejlepší pokrytí ČR)
- [x] PWA ikony — nový brand design (drone top-down view, #f97316 orange accent)
      icon-192/512 + maskable varianty, scripts/generate-icons.py, icon-source.svg
- [x] droneEnumMap cleanup — pouze ověřené modely Mini 4 Pro (67) a Mavic 3 Pro (68)
      Air 3 (neověřený enum) a Mini 3 Pro (nepodporuje waypoint mise) odstraněny
- [x] Google Photorealistic 3D Tiles — ODSTRANĚNO
      EEA omezení Google od 8.7.2025 — Česká republika blokována, nefunguje pro žádného CZ uživatele
- [x] Správa pilotů + dronů + kombinace pilot/dron
      (/settings, lib/profileStore.ts, Pilot + Drone typy,
       ActiveProfileBadge v sidebaru, batteryEstimate dle dronu,
       DJI Mini 4 Pro jako výchozí dron, localStorage)
- [x] Fix kolizního panelu – seskupení dle zóny
      (groupCollisionsByZone(), jedna karta = jedna zóna,
       badge "WP 1, 2, 3", banner "X zón v omezené oblasti")
- [x] Help sekce – #letzone a #kolize sekce přidány
      (kotvy v navigačním pásu, barevná legenda letových zón,
       severity karty ⛔/⚠️/ℹ️, postup při kolizi)
- [x] Silnice/dálnice – 50 m výška + šířka (LKR310)
      (6226 features: 3811 motorway + 2265 trunk + 150 national I. třída,
       chain-building algoritmus, toggle 🛣️, kolizní detekce WARNING, help #silnice;
       II. třída vynechána – 15 MB → dokumentována jako ruční kontrola)
- [x] Železnice – buffer 60 m od osy koleje (LKR311)
      (889 tras, LineString GeoJSON, OSM route relations, toggle 🚂,
       kolizní detekce WARNING/CAUTION, help #zeleznice)
- [x] Elektrické vedení – 7–30 m dle napětí (LKR312)
      (5310 linií + 1567 trafostanic, 5 napěťových tříd EHV/HV400/HV220/HV110/SUBSTATION,
       way merging algoritmus, toggle ⚡, kolizní detekce WARNING/CAUTION, help #elektro)
- [x] Export do formátu Litchi CSV (lib/exportLitchi.ts, 35 sloupců, 10 action slotů, tlačítko v Sidebaru)
- [x] Vodní zdroje – ochranná pásma (LKR313) (1877 nádrží, scripts/fetch-water-sources.js,
      public/data/water-sources-cz.json, toggle 💧, kolizní detekce CAUTION, help #voda)
- [x] NPR/NPP/PR/PP – menší přírodní rezervace (2290 lokalit, scripts/fetch-small-reserves.js,
      public/data/small-reserves-cz.json, toggle 🌱, kolizní detekce, help sekce #rezervace)
- [x] Kompletní code review celé codebase (Opus 4.6, všechny soubory lib/ + components/ + film/ + scripts/ + konfigurace)
- [x] Systém průběžného code review — šablona a postup uloženy v globálním ~/.claude/CLAUDE.md (sekce Code Review System)
- [x] Code review #2 (tag review-20260330b) — 4 opravy: DroneForm.set() ternary bug
      (číselná pole ukládala objekt místo čísla), duplicate Drone import sloučen,
      powerlines-cz.json jednorázový fetch přes sdílenou loadPowerlinesData() cache,
      ActiveProfileBadge refresh() wrapped v useCallback
- [x] CTR/TRA letové zóny na mapě
      (OpenAIP Core API → statický GeoJSON public/data/airspaces-cz.json,
       352 zón, barevné polygony, tooltip, toggle 🚧, caching)
- [x] NP a CHKO přírodní ochranná území na mapě
      (OSM Overpass API → statický GeoJSON public/data/protected-areas-cz.json,
       4 NP zelená + 26 CHKO modrá = 30 features, tooltip s omezením, toggle 🌿)
- [x] Fasáda 360° – celá budova v jedné misi
- [x] Filmařský modul Fáze 1 (Dronie, Reveal, Top-down,
      Crane Up)
- [x] Filmařský modul Fáze 2 (Hyperlapse, Arc Shot)
- [x] Help sekce – fotogrammetrie + filmařský modul
- [x] Vyhledávání adresy (Nominatim, abstrakční vrstva)
- [x] Filmařský modul Fáze 3 (Boomerang, Rocket, POI Sequence)
- [x] Terrain Following (Open-Meteo API, batching, safety floor 2 m)
- [x] 3D náhled mise (CesiumJS, World Terrain, OSM Buildings, trasa ve vzduchu)
- [x] Import KMZ zpět do aplikace (JSZip + DOMParser, WPML namespace, flyTo centroid)
- [x] CTR/TRA zóny – zobrazení na mapě (OpenAIP API, toggle tlačítko, barevné polygony, tooltip, caching)

---
*Aktualizuj tento soubor při každé session kdy se
implementuje nová funkce nebo vznikne nový nápad.*
