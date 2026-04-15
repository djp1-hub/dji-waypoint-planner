// Help page — visual guide to the DJI Waypoint Planner
// Static server component (no client-side state needed)
import Link from 'next/link';

// ── Photogrammetry mission card data ─────────────────────────

const MISSION_TYPES: {
  type: string;
  tab: string;
  color: string;
  when: string;
  example: string;
}[] = [
  {
    type: 'Body',
    tab: 'záložka Body',
    color: '#3b82f6',
    when: 'Chceš ručně naplánovat vlastní trasu bod po bodu',
    example: 'Kreativní let, průlet kolem objektu, vlastní trajektorie',
  },
  {
    type: 'Spirála',
    tab: 'záložka Spirála',
    color: '#8b5cf6',
    when: 'Chceš kroužit kolem objektu se stoupáním nebo klesáním',
    example: 'Věž, strom, komín, rozhledna',
  },
  {
    type: 'Grid',
    tab: 'záložka Grid',
    color: '#22c55e',
    when: 'Chceš automaticky zmapovat plochu shora (fotogrammetrie)',
    example: 'Pole, střecha, staveniště, pozemek',
  },
  {
    type: 'Orbit',
    tab: 'záložka Orbit',
    color: '#06b6d4',
    when: 'Chceš kroužit kolem jednoho bodu ve stejné výšce',
    example: 'Záběr fasády z výšky, objezd POI, architektura',
  },
  {
    type: 'Fasáda',
    tab: 'záložka Fasáda → Jedna strana',
    color: '#f97316',
    when: 'Chceš zdokumentovat jednu stěnu budovy (lawn-mower)',
    example: 'Fasáda pro opravu, stavební projekt, pojistná událost',
  },
  {
    type: 'Fasáda 360°',
    tab: 'záložka Fasáda → Celá budova 360°',
    color: '#f59e0b',
    when: 'Chceš nafotit celou budovu dokola v jedné misi',
    example: 'Celková dokumentace budovy, 3D rekonstrukce',
  },
];

// ── Film shot card data ───────────────────────────────────────

const FILM_SHOT_TYPES: {
  type: string;
  tab: string;
  when: string;
  example: string;
}[] = [
  {
    type: 'Dronie',
    tab: 'Film → Dronie',
    when: 'Chceš odletový záběr od subjektu',
    example: 'Odlet od budovy, osoby, auta',
  },
  {
    type: 'Reveal',
    tab: 'Film → Reveal',
    when: 'Chceš postupně odhalit scénu',
    example: 'Let k POI zpoza překážky',
  },
  {
    type: 'Top-down',
    tab: 'Film → Top-down',
    when: 'Chceš pohled přímo shora',
    example: 'Přelet nad krajinou, střechou',
  },
  {
    type: 'Crane Up',
    tab: 'Film → Crane Up',
    when: 'Chceš imitovat filmový jeřáb',
    example: 'Vertikální stoupání na místě',
  },
  {
    type: 'Hyperlapse',
    tab: 'Film → Hyperlapse',
    when: 'Chceš časosběrné video z pohybu',
    example: 'Let při západu slunce',
  },
  {
    type: 'Arc Shot',
    tab: 'Film → Arc Shot',
    when: 'Chceš dramatický obletový záběr',
    example: 'Oblet budovy s měnící se výškou',
  },
  {
    type: 'Boomerang',
    tab: 'Film → Boomerang',
    when: 'Chceš záběr tam a zpět po stejné trase',
    example: 'Let nad řekou, přes pole, kolem budovy',
  },
  {
    type: 'Rocket',
    tab: 'Film → Rocket',
    when: 'Chceš dramatický vzlet kolmo nahoru',
    example: 'Rocket shot při úvodu videa',
  },
  {
    type: 'POI Sequence',
    tab: 'Film → POI Seq',
    when: 'Chceš objekt z více perspektiv za sebou',
    example: 'Budova ze 4 světových stran',
  },
];

// ── Film speed recommendations ────────────────────────────────

const FILM_SPEEDS: { shot: string; speed: string; why: string }[] = [
  { shot: 'Dronie',     speed: '2–4 m/s',   why: 'Plynulý odlet, ne trhavý' },
  { shot: 'Reveal',     speed: '1–3 m/s',   why: 'Pomalé odhalení budí napětí' },
  { shot: 'Top-down',   speed: '1–3 m/s',   why: 'Stabilní obraz při pohledu dolů' },
  { shot: 'Crane Up',   speed: '0.5–1.5 m/s', why: 'Velmi pomalé = dramatické' },
  { shot: 'Hyperlapse', speed: '0.5–2 m/s', why: 'Závisí na intervalu focení' },
  { shot: 'Arc Shot',      speed: '1–3 m/s',   why: 'Plynulý oblet bez rozmazání' },
  { shot: 'Boomerang',     speed: '2–4 m/s',   why: 'Plynulý pohyb tam i zpět' },
  { shot: 'Rocket',        speed: '3–6 m/s',   why: 'Rychlejší = dramatičtější efekt' },
  { shot: 'POI Sequence',  speed: '1–3 m/s',   why: 'Pomalý přechod mezi perspektivami' },
];

// ── Shared style helpers ─────────────────────────────────────

const sectionClass = 'mb-12';
const h2Class = 'text-lg font-semibold mb-4 text-blue-400 border-b border-gray-800 pb-2';
const h2FilmClass = 'text-lg font-semibold mb-4 text-purple-400 border-b border-gray-800 pb-2';
const tableClass = 'w-full text-sm border-collapse mt-4';
const thClass = 'text-left text-xs text-gray-500 font-medium py-2 px-3 border-b border-gray-700';
const tdClass = 'py-2 px-3 text-gray-300 border-b border-gray-800';

// ── Page component ───────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300 transition-colors"
          >
            ← Zpět na mapu
          </Link>
          <h1 className="text-2xl font-bold mt-4 mb-1">Nápověda</h1>
          <p className="text-gray-500 text-sm">DJI Waypoint Planner · Mini 4 Pro</p>
        </div>

        {/* ── Navigation anchors ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-10 scrollbar-none">
          <a
            href="#funkce"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            🗂 Přehled funkcí
          </a>
          <a
            href="#letzone"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-orange-700 text-orange-400 hover:bg-orange-900/30 transition-colors"
          >
            🚧 Letové zóny
          </a>
          <a
            href="#kolize"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-orange-700 text-orange-400 hover:bg-orange-900/30 transition-colors"
          >
            ⚠️ Kolize
          </a>
          <a
            href="#foto"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-blue-700 text-blue-400 hover:bg-blue-900/30 transition-colors"
          >
            📷 Fotogrammetrie
          </a>
          <a
            href="#film"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-purple-700 text-purple-400 hover:bg-purple-900/30 transition-colors"
          >
            🎬 Filmařský modul
          </a>
          <a
            href="#parametry"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-blue-700 text-blue-400 hover:bg-blue-900/30 transition-colors"
          >
            ⚙ Parametry WP
          </a>
          <a
            href="#terrain"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-green-800 text-green-400 hover:bg-green-900/30 transition-colors"
          >
            🏔 Terrain Following
          </a>
          <a
            href="#sdileni-baterie"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            🔗 Sdílení &amp; baterie
          </a>
          <a
            href="#prenos"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            📡 Přenos do RC 2
          </a>
          <a
            href="#priroda"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-green-700 text-green-400 hover:bg-green-900/30 transition-colors"
          >
            🌿 NP a CHKO
          </a>
          <a
            href="#rezervace"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 transition-colors"
          >
            🌱 Rezervace
          </a>
          <a
            href="#voda"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-sky-700 text-sky-400 hover:bg-sky-900/30 transition-colors"
          >
            💧 Vodní zdroje
          </a>
          <a
            href="#zeleznice"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-red-700 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            🚂 Železnice
          </a>
          <a
            href="#silnice"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-amber-700 text-amber-400 hover:bg-amber-900/30 transition-colors"
          >
            🛣️ Silnice
          </a>
          <a
            href="#elektro"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-yellow-700 text-yellow-400 hover:bg-yellow-900/30 transition-colors"
          >
            ⚡ El. vedení
          </a>
          <a
            href="#legislativa"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-[#1a1d27] border border-yellow-700 text-yellow-400 hover:bg-yellow-900/30 transition-colors"
          >
            ⚖️ Legislativa
          </a>
        </div>

        {/* ── 0: Co aplikace umí ── */}
        <section id="funkce" className={sectionClass}>
          <h2 className={h2Class}>Co aplikace umí</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '📍', title: 'Plánování trasy', desc: 'Ruční body, spirála, grid, orbit, fasáda jedné strany i celé budovy 360°' },
              { icon: '🎬', title: 'Filmařský modul', desc: '9 cinematic záběrů: Dronie, Reveal, Top-down, Crane Up, Hyperlapse, Arc Shot, Boomerang, Rocket, POI Sequence' },
              { icon: '📤', title: 'Export KMZ', desc: 'Stažení souboru kompatibilního s DJI Fly (WPML formát, Mini 4 Pro)' },
              { icon: '📂', title: 'Import KMZ', desc: 'Načtení existující mise zpět do editoru k úpravám' },
              { icon: '🔗', title: 'Sdílení mise', desc: 'Zkopírování odkazu s celou misí zakódovanou v URL — otevře se přímo v prohlížeči' },
              { icon: '🏔', title: 'Terrain Following', desc: 'Automatické přizpůsobení výšek waypointů skutečnému terénu (Open-Meteo)' },
              { icon: '🔭', title: '3D náhled', desc: 'Interaktivní vizualizace trasy v reálném terénu s 3D budovami (CesiumJS)' },
              { icon: '🔋', title: 'Odhad baterie', desc: 'Přibližná spotřeba a čas letu pro DJI Mini 4 Pro s barevným progress barem' },
              { icon: '🗺', title: 'Přepínač map', desc: 'Tři podkladové mapy: klasická (OSM), satelitní snímky (Esri), topografická mapa' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#1a1d27] rounded-lg p-3 border border-gray-700 flex gap-3 items-start"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Letové zóny ── */}
        <section id="letzone" className={sectionClass}>
          <h2 className={h2Class}>🚧 Letové zóny a vzdušný prostor</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Aplikace zobrazuje letecká omezení přímo v mapě. Stiskni tlačítko{' '}
            <span className="text-orange-400 font-medium">🚧 Letové zóny</span> v sidebaru
            a na mapě se zobrazí barevné polygony CTR, TRA a dalších omezených zón platných pro ČR.
            Data pochází z <span className="text-gray-300">OpenAIP</span> (352 zón, statická cache).
          </p>

          {/* Barevná legenda */}
          <div className="space-y-2 mb-4">
            {[
              { color: 'bg-red-500/30 border-red-500', label: '🔴 PROHIBITED / RESTRICTED', desc: 'Zakázané zóny — vstup bez výjimky nepovolen (vojenské prostory, zakázané oblasti)' },
              { color: 'bg-orange-500/30 border-orange-500', label: '🟠 CTR / DANGER', desc: 'Řízené prostory letišť a nebezpečné zóny — nutné povolení ATC nebo provozovatele letiště' },
              { color: 'bg-yellow-400/20 border-yellow-400', label: '🟡 TMA / ATZ / TRA / TSA', desc: 'Terminální oblasti, letištní provozní zóny a dočasně rezervované prostory — omezený přístup' },
              { color: 'bg-white/10 border-gray-400', label: '⬜ RMZ / kluzáky / sport', desc: 'Zóny povinného hlášení, kluzákové oblasti a sportovní letecké prostory — zvýšená opatrnost' },
            ].map((item) => (
              <div key={item.label} className={`flex gap-3 items-start p-3 rounded-lg border ${item.color}`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white mb-0.5">{item.label}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1d27] rounded-lg p-4 border border-orange-800/50">
            <p className="text-sm font-semibold text-orange-300 mb-1">Co dělat, když trasa zasahuje do zóny?</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Klikni na polygon zóny v mapě — zobrazí se název, třída a platné omezení</li>
              <li>Ověř zónu na portálu <span className="text-blue-400">dronemap.gov.cz</span> (DroneMap ŘLP ČR)</li>
              <li>Pro CTR/letiště kontaktuj ATC dané letiště nebo požádej o povolení přes DroneMap</li>
              <li>Pro NP/CHKO a jiné zóny kontaktuj příslušný úřad nebo správu území</li>
            </ol>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Aktuální NOTAMy (dočasná omezení) aplikace nezobrazuje — před letem vždy zkontroluj{' '}
            <span className="text-gray-400">dronemap.gov.cz</span> nebo <span className="text-gray-400">aisview.rlp.cz</span>.
          </p>
        </section>

        {/* ── Kolizní detekce ── */}
        <section id="kolize" className={sectionClass}>
          <h2 className={h2Class}>⚠️ Kolizní detekce waypointů</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Po každé změně trasy aplikace automaticky zkontroluje všechny waypointy vůči
            letovým zónám, přírodním rezervacím, vodním zdrojům, železnicím, silnicím
            a elektrickému vedení — bez ohledu na to, které vrstvy máš aktuálně zapnuté.
          </p>

          {/* Závažnosti */}
          <div className="space-y-2 mb-4">
            {[
              {
                icon: '⛔',
                label: 'DANGER',
                border: 'border-red-600',
                bg: 'bg-red-900/20',
                text: 'text-red-400',
                desc: 'Let zakázán — waypoint je v zóně s absolutním zákazem létání (PROHIBITED, RESTRICTED). KMZ export zobrazí varování.',
              },
              {
                icon: '⚠️',
                label: 'WARNING',
                border: 'border-orange-500',
                bg: 'bg-orange-900/20',
                text: 'text-orange-400',
                desc: 'Vyžaduje povolení — ochranné pásmo dálnice, silnice I. třídy, železnice nebo vedení VVN/VN400. Bez povolení nelze létat.',
              },
              {
                icon: 'ℹ️',
                label: 'CAUTION',
                border: 'border-yellow-500',
                bg: 'bg-yellow-900/20',
                text: 'text-yellow-400',
                desc: 'Zvýšená opatrnost — blízkost vodního zdroje, přírodní rezervace nebo vedení nižšího napětí. Let může být možný, prověř legislativu.',
              },
            ].map((item) => (
              <div key={item.label} className={`flex gap-3 items-start p-3 rounded-lg border ${item.border} ${item.bg}`}>
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className={`text-sm font-semibold mb-0.5 ${item.text}`}>{item.label}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 space-y-2 text-sm text-gray-300">
            <p className="font-semibold text-white text-sm">Jak kolize vidíš v aplikaci</p>
            <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
              <li>V sidebaru se zobrazí červený banner s počtem kolizí (např. <span className="text-red-400 font-medium">⚠️ 3 kolize</span>)</li>
              <li>Kliknutím na banner otevřeš seznam všech kolizí s popisem zóny a doporučením</li>
              <li>Pokud trasa obsahuje DANGER kolizi, export KMZ zobrazí varovný dialog</li>
              <li>Kolizní kontrola běží na pozadí — vrstvy v mapě nemusíš mít zapnuté</li>
            </ul>
          </div>
        </section>

        {/* ── A: Jak začít ── */}
        <section className={sectionClass}>
          <h2 className={h2Class}>Jak začít</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Aplikace slouží k plánování autonomních letových misí pro DJI Mini 4 Pro.
            Naplánuješ trasu v mapě, nastavíš parametry a exportuješ KMZ soubor kompatibilní s DJI Fly.
          </p>
          <ol className="space-y-2 text-sm text-gray-300 list-none">
            {[
              'Najdi lokaci pomocí vyhledávacího pole adresy nahoře v panelu, nebo přibliž mapu ručně',
              'Vyber režim (📷 Foto nebo 🎬 Film) a typ mise v záložkách',
              'Nastav parametry a klikni na mapu nebo stiskni Generovat',
              'Zkontroluj trasu zobrazenou na mapě',
              'Klikni Exportovat KMZ a ulož soubor do počítače',
              'Přenes soubor do RC 2 přes USB-C a otevři v DJI Fly',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-gray-500">
            Podrobný postup přenosu souboru do RC 2:{' '}
            <Link href="/guide" className="text-blue-400 hover:underline">
              Zobrazit detailní návod →
            </Link>
          </p>
        </section>

        {/* ── A2: Parametry waypointu ── */}
        <section id="parametry" className={sectionClass}>
          <h2 className={h2Class}>Parametry waypointu</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Každý waypoint (bod trasy) má čtyři nastavitelné parametry. Zobrazují se v sidebaru
            po kliknutí na waypoint nebo v seznamu bodů.
          </p>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Parametr</th>
                <th className={thClass}>Popis</th>
                <th className={thClass}>Doporučená hodnota</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}><span className="text-white font-medium">Výška (m)</span></td>
                <td className={tdClass}>
                  Výška letu v metrech nad místem vzletu{' '}
                  <span className="text-gray-500 text-xs">(AGL — Above Ground Level)</span>
                </td>
                <td className={tdClass}><span className="text-blue-300">30–120 m</span><span className="text-gray-500 text-xs"> (max DJI Mini 4 Pro: 120 m dle předpisů)</span></td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-white font-medium">Rychlost (m/s)</span></td>
                <td className={tdClass}>Rychlost letu mezi waypointy (1–15 m/s)</td>
                <td className={tdClass}>
                  <span className="text-blue-300">3–5 m/s</span>
                  <span className="text-gray-500 text-xs"> foto, </span>
                  <span className="text-purple-300">1–4 m/s</span>
                  <span className="text-gray-500 text-xs"> film</span>
                </td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-white font-medium">Čekání (s)</span></td>
                <td className={tdClass}>Doba stání na waypointu před pokračováním trasy</td>
                <td className={tdClass}><span className="text-blue-300">0 s</span><span className="text-gray-500 text-xs"> (nebo 1–3 s pro focení / otočení)</span></td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-white font-medium">Kamera</span></td>
                <td className={tdClass}>
                  Akce kamery při dosažení bodu:{' '}
                  <span className="text-gray-300">Žádná · Foto · Začít video · Zastavit video</span>
                </td>
                <td className={tdClass}><span className="text-gray-500 text-xs">Záleží na typu mise — grid → Foto, film → automaticky</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── B: Výběr typu mise ── */}
        <section id="foto" className={sectionClass}>
          <h2 className={h2Class}>Výběr typu mise</h2>

          {/* Photogrammetry subheading */}
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
            📷 Fotogrammetrie
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MISSION_TYPES.map((m) => (
              <div
                key={m.type}
                className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="font-semibold text-sm text-white">{m.type}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{m.when}</p>
                <p className="text-gray-600 text-xs italic">{m.example}</p>
                <p className="text-xs mt-auto pt-1" style={{ color: m.color }}>
                  → {m.tab}
                </p>
              </div>
            ))}
          </div>

          {/* Detail: Orbit / Fasáda / Grid */}
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Jak fungují vybrané typy misí</p>
            {[
              {
                type: 'Orbit',
                color: '#06b6d4',
                body: 'Dron krouží kolem středového bodu (POI) v konstantní vzdálenosti a výšce. Gimbal je automaticky nasměrován na střed. Střed definuješ kliknutím na mapu, pak nastavíš poloměr, výšku, rychlost a počet otáček.',
              },
              {
                type: 'Fasáda',
                color: '#f97316',
                body: 'Dron letí podél stěny budovy v lawn-mower vzoru (sem a tam v řadách) pro kompletní fotodokumentaci. Režim „Jedna strana" — 2 kliknutí na mapu definují linii fasády. Režim „360°" — 4 kliknutí definují rohy budovy, aplikace vygeneruje 4 strany v jedné misi.',
              },
              {
                type: 'Grid',
                color: '#22c55e',
                body: 'Dron systematicky přelétá vybranou plochu v mřížkovém vzoru (lawn-mower) pro fotogrammetrii. 2 kliknutí definují roh oblasti. Nastavíš výšku, překryv (%) a směr řad (°). Ideální pro mapování polí, střech a stavenišť.',
              },
            ].map((item) => (
              <div key={item.type} className="bg-[#1a1d27] rounded-lg px-4 py-3 border border-gray-700">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-semibold text-white">{item.type}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Film module teaser */}
          <div className="mt-5 flex items-center justify-between bg-purple-900/10 border border-purple-800/40 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              🎬 Filmařský modul
            </p>
            <a
              href="#film"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              Zobrazit filmařské záběry →
            </a>
          </div>
        </section>

        {/* ── FILM: Filmařský modul ── */}
        <section id="film" className={sectionClass}>
          <h2 className={h2FilmClass}>Filmařský modul</h2>

          {/* 2a — Úvod */}
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Film mód slouží pro cinematic záběry, ne fotogrammetrii. Každý záběr generuje waypointy
            s akcemi <span className="text-purple-300 font-mono text-xs">startVideo</span> /{' '}
            <span className="text-purple-300 font-mono text-xs">stopVideo</span> pro automatické
            ovládání kamery. Přepni na{' '}
            <span className="text-white font-medium">Film</span> v horní části sidebaru a vyber typ záběru.
          </p>

          {/* 2b — 6 karet záběrů */}
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
            Přehled záběrů
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {FILM_SHOT_TYPES.map((s) => (
              <div
                key={s.type}
                className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0 bg-purple-500" />
                  <span className="font-semibold text-sm text-white">{s.type}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{s.when}</p>
                <p className="text-gray-600 text-xs italic">{s.example}</p>
                <p className="text-xs mt-auto pt-1 text-purple-400">→ {s.tab}</p>
              </div>
            ))}
          </div>

          {/* 2c — Doporučené rychlosti */}
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
            Doporučené rychlosti pro cinematic záběry
          </p>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Záběr</th>
                <th className={thClass}>Rychlost</th>
                <th className={thClass}>Proč</th>
              </tr>
            </thead>
            <tbody>
              {FILM_SPEEDS.map((row) => (
                <tr key={row.shot}>
                  <td className={tdClass}>
                    <span className="text-white font-medium">{row.shot}</span>
                  </td>
                  <td className={tdClass}>
                    <span className="text-purple-300 font-medium">{row.speed}</span>
                  </td>
                  <td className={tdClass + ' text-gray-500'}>{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 2d — Gimbal diagram */}
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-8 mb-3">
            Jak funguje gimbal v film módu
          </p>
          <div className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex justify-center">
            <svg
              viewBox="0 0 260 215"
              className="w-full"
              style={{ maxWidth: '420px' }}
              aria-label="Diagram úhlů gimbalu kamery dronu"
            >
              {/* ── Row 1: 0° ── */}
              {/* Drone body */}
              <rect x="12" y="23" width="30" height="10" rx="2" fill="#1d4ed8" />
              {/* Arms */}
              <line x1="20" y1="23" x2="20" y2="11" stroke="#374151" strokeWidth="2" />
              <line x1="34" y1="23" x2="34" y2="11" stroke="#374151" strokeWidth="2" />
              {/* Props */}
              <ellipse cx="20" cy="11" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <ellipse cx="34" cy="11" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              {/* Camera */}
              <rect x="42" y="24" width="7" height="8" rx="1" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.8" />
              {/* Direction line — 0° horizontal */}
              <line x1="49" y1="28" x2="90" y2="28" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
              <circle cx="90" cy="28" r="2.5" fill="#d1d5db" />
              {/* Labels */}
              <text x="100" y="25" fill="#9ca3af" fontSize="10" fontFamily="sans-serif" fontWeight="bold">0°</text>
              <text x="118" y="25" fill="#6b7280" fontSize="9" fontFamily="sans-serif"> — horizontální pohled (rovina)</text>

              {/* ── Row 2: -30° ── */}
              <rect x="12" y="71" width="30" height="10" rx="2" fill="#1d4ed8" />
              <line x1="20" y1="71" x2="20" y2="59" stroke="#374151" strokeWidth="2" />
              <line x1="34" y1="71" x2="34" y2="59" stroke="#374151" strokeWidth="2" />
              <ellipse cx="20" cy="59" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <ellipse cx="34" cy="59" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <rect x="42" y="72" width="7" height="8" rx="1" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.8" />
              {/* Direction line — -30° (in SVG: dx=35, dy=20) */}
              <line x1="49" y1="76" x2="84" y2="96" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
              <circle cx="84" cy="96" r="2.5" fill="#a78bfa" />
              <text x="100" y="73" fill="#a78bfa" fontSize="10" fontFamily="sans-serif" fontWeight="bold">-30°</text>
              <text x="124" y="73" fill="#6b7280" fontSize="9" fontFamily="sans-serif"> — mírně dolů (typický let)</text>

              {/* ── Row 3: -60° ── */}
              <rect x="12" y="119" width="30" height="10" rx="2" fill="#1d4ed8" />
              <line x1="20" y1="119" x2="20" y2="107" stroke="#374151" strokeWidth="2" />
              <line x1="34" y1="119" x2="34" y2="107" stroke="#374151" strokeWidth="2" />
              <ellipse cx="20" cy="107" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <ellipse cx="34" cy="107" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <rect x="42" y="120" width="7" height="8" rx="1" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.8" />
              {/* Direction line — -60° (in SVG: dx=19, dy=33) */}
              <line x1="49" y1="124" x2="68" y2="157" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
              <circle cx="68" cy="157" r="2.5" fill="#8b5cf6" />
              <text x="100" y="121" fill="#8b5cf6" fontSize="10" fontFamily="sans-serif" fontWeight="bold">-60°</text>
              <text x="124" y="121" fill="#6b7280" fontSize="9" fontFamily="sans-serif"> — strmě dolů (dramatický)</text>

              {/* ── Row 4: -90° ── */}
              <rect x="12" y="167" width="30" height="10" rx="2" fill="#1d4ed8" />
              <line x1="20" y1="167" x2="20" y2="155" stroke="#374151" strokeWidth="2" />
              <line x1="34" y1="167" x2="34" y2="155" stroke="#374151" strokeWidth="2" />
              <ellipse cx="20" cy="155" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <ellipse cx="34" cy="155" rx="9" ry="3" fill="none" stroke="#4b5563" strokeWidth="1.5" />
              <rect x="42" y="168" width="7" height="8" rx="1" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.8" />
              {/* Direction line — -90° straight down */}
              <line x1="49" y1="172" x2="49" y2="208" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
              <circle cx="49" cy="208" r="2.5" fill="#7c3aed" />
              <text x="100" y="169" fill="#7c3aed" fontSize="10" fontFamily="sans-serif" fontWeight="bold">-90°</text>
              <text x="124" y="169" fill="#6b7280" fontSize="9" fontFamily="sans-serif"> — přímo dolů (Top-down)</text>

              {/* Legend note */}
              <text x="10" y="213" fill="#4b5563" fontSize="8" fontFamily="sans-serif">
                ● = směr pohledu kamery
              </text>
            </svg>
          </div>

          {/* 2e — Hyperlapse výpočet */}
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-8 mb-3">
            Hyperlapse — výpočet délky videa
          </p>
          <div className="bg-purple-900/15 border border-purple-800/50 rounded-lg px-4 py-4 text-sm">
            <div className="font-mono text-xs text-purple-300 space-y-1 mb-4">
              <p>počet fotek  =  délka trasy ÷ (rychlost × interval)</p>
              <p>délka videa  =  počet fotek ÷ 25 fps</p>
            </div>
            <div className="border-t border-purple-800/40 pt-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-white font-medium">Příklad:</span>{' '}
                Trasa 300 m, rychlost 1 m/s, interval 3 s
                <br />
                = 300 ÷ (1 × 3) = <span className="text-purple-300 font-medium">100 fotek</span>{' '}
                = ~<span className="text-purple-300 font-medium">4 sekundy videa</span> při 25 fps
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Aplikace zobrazuje live výpočet v info boxu a zablokuje generování při překročení 200 fotek.
            </p>
          </div>
        </section>

        {/* ── C: Překryv ── */}
        <section className={sectionClass}>
          <h2 className={h2Class}>Jak funguje překryv (%)</h2>
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            Překryv určuje, jak moc se sousední fotografie překrývají. Vyšší překryv = více fotek,
            lepší podklady pro 3D rekonstrukci, ale delší mise.
          </p>

          {/* SVG overlap diagram */}
          <div className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex justify-center">
            <svg
              viewBox="0 0 290 115"
              className="w-full"
              style={{ maxWidth: '460px' }}
              aria-label="Diagram překryvu fotografií"
            >
              {/* Overlap fill regions (behind frame borders) */}
              <rect x="44" y="30" width="56" height="52" fill="#3b82f6" fillOpacity="0.18" />
              <rect x="68" y="30" width="56" height="52" fill="#3b82f6" fillOpacity="0.18" />
              <rect x="92" y="30" width="56" height="52" fill="#3b82f6" fillOpacity="0.18" />

              {/* Camera frame outlines */}
              <rect x="20" y="30" width="80" height="52" fill="none" stroke="#6b7280" strokeWidth="1.5" rx="1" />
              <rect x="44" y="30" width="80" height="52" fill="none" stroke="#6b7280" strokeWidth="1.5" rx="1" />
              <rect x="68" y="30" width="80" height="52" fill="none" stroke="#6b7280" strokeWidth="1.5" rx="1" />
              <rect x="92" y="30" width="80" height="52" fill="none" stroke="#6b7280" strokeWidth="1.5" rx="1" />

              {/* "záběr kamery" label with pointer to first frame */}
              <line x1="60" y1="22" x2="60" y2="30" stroke="#4b5563" strokeWidth="0.8" strokeDasharray="2 1.5" />
              <text x="60" y="18" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">
                záběr kamery
              </text>

              {/* "70%" label in the second overlap zone */}
              <text x="96" y="61" textAnchor="middle" fill="#60a5fa" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
                70%
              </text>
              <text x="96" y="73" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="sans-serif">
                překryv
              </text>

              {/* "posun" measurement at bottom — tick + line + tick */}
              <line x1="20" y1="94" x2="44" y2="94" stroke="#4b5563" strokeWidth="1" />
              <line x1="20" y1="90" x2="20" y2="98" stroke="#4b5563" strokeWidth="1" />
              <line x1="44" y1="90" x2="44" y2="98" stroke="#4b5563" strokeWidth="1" />
              <text x="32" y="108" textAnchor="middle" fill="#6b7280" fontSize="8.5" fontFamily="sans-serif">
                posun (30%)
              </text>

              {/* Right-side note */}
              <text x="200" y="52" fill="#6b7280" fontSize="8.5" fontFamily="sans-serif">4 záběry,</text>
              <text x="200" y="63" fill="#6b7280" fontSize="8.5" fontFamily="sans-serif">70% překryv</text>
            </svg>
          </div>

          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Překryv</th>
                <th className={thClass}>Kdy použít</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}><span className="text-yellow-400 font-medium">60 %</span></td>
                <td className={tdClass}>Rychlý průzkum, orientační záběry</td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-green-400 font-medium">70–80 %</span></td>
                <td className={tdClass}>Standard pro fotogrammetrii a dokumentaci</td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-blue-400 font-medium">85 %+</span></td>
                <td className={tdClass}>Detailní 3D rekonstrukce, přesné modely</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── D: Vzdálenost od fasády ── */}
        <section className={sectionClass}>
          <h2 className={h2Class}>Vzdálenost od fasády</h2>
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            Vzdálenost určuje jak daleko od stěny dron letí. Ovlivňuje velikost záběru na fotkách
            a tím i počet potřebných fotografií.
          </p>

          {/* SVG side-view diagram */}
          <div className="bg-[#1a1d27] rounded-lg p-4 border border-gray-700 flex justify-center">
            <svg
              viewBox="0 0 360 160"
              className="w-full"
              style={{ maxWidth: '500px' }}
              aria-label="Pohled zboku — vzdálenost dronu od fasády"
            >
              <defs>
                <marker id="arr" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#6b7280" />
                </marker>
                <marker id="arr-l" markerWidth="7" markerHeight="5" refX="1" refY="2.5" orient="auto-start-reverse">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#6b7280" />
                </marker>
              </defs>

              {/* Building wall (right side) */}
              <rect x="290" y="18" width="22" height="118" fill="#374151" stroke="#6b7280" strokeWidth="1" rx="1" />
              <text x="316" y="80" fill="#9ca3af" fontSize="9" fontFamily="sans-serif" dominantBaseline="middle">
                zeď
              </text>

              {/* Camera FOV cone (light blue triangle) */}
              <polygon
                points="124,77 290,32 290,122"
                fill="#3b82f6"
                fillOpacity="0.06"
                stroke="#3b82f6"
                strokeOpacity="0.3"
                strokeWidth="0.8"
                strokeDasharray="5 3"
              />

              {/* Drone body (side view) */}
              <rect x="82" y="70" width="38" height="14" rx="3" fill="#1d4ed8" />
              <line x1="92" y1="70" x2="92" y2="55" stroke="#374151" strokeWidth="2" />
              <line x1="112" y1="70" x2="112" y2="55" stroke="#374151" strokeWidth="2" />
              <ellipse cx="92" cy="54" rx="14" ry="3.5" fill="none" stroke="#6b7280" strokeWidth="1.5" />
              <ellipse cx="112" cy="54" rx="14" ry="3.5" fill="none" stroke="#6b7280" strokeWidth="1.5" />
              <rect x="118" y="72" width="9" height="9" rx="1.5" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.8" />

              {/* "dron" label */}
              <text x="101" y="100" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">
                dron
              </text>

              {/* Distance arrow (horizontal, with double arrowheads) */}
              <line
                x1="128" y1="130" x2="289" y2="130"
                stroke="#6b7280" strokeWidth="1"
                markerEnd="url(#arr)"
                markerStart="url(#arr-l)"
              />
              <line x1="127" y1="84" x2="127" y2="128" stroke="#4b5563" strokeWidth="0.6" strokeDasharray="3 2" />
              <line x1="290" y1="136" x2="290" y2="128" stroke="#4b5563" strokeWidth="0.6" strokeDasharray="3 2" />

              {/* Distance label */}
              <rect x="188" y="120" width="34" height="16" rx="3" fill="#1a1d27" />
              <text x="205" y="131" textAnchor="middle" fill="#f9fafb" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                8 m
              </text>
            </svg>
          </div>

          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Vzdálenost</th>
                <th className={thClass}>Vhodné pro</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}><span className="text-green-400 font-medium">5–8 m</span></td>
                <td className={tdClass}>Detailní záběry, bytový dům, menší fasáda</td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-yellow-400 font-medium">10–15 m</span></td>
                <td className={tdClass}>Větší budova, bezpečnostní rezerva</td>
              </tr>
              <tr>
                <td className={tdClass}><span className="text-gray-400 font-medium">20+ m</span></td>
                <td className={tdClass}>Přehledový záběr, minimální detail, velký objekt</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            Čím menší vzdálenost → menší záběr kamery na stěnu → více fotek → více waypointů.
            Při překročení limitu 200 waypointů zvětši vzdálenost nebo sniž překryv.
          </p>
        </section>

        {/* ── E: Limit 200 waypointů ── */}
        <section className={sectionClass}>
          <h2 className={h2Class}>Limit 200 waypointů</h2>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            DJI Fly podporuje maximálně 200 waypointů v jedné misi. Aplikace zobrazuje barevné
            varování v info boxu a zablokuje generování při překročení.
          </p>

          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-gray-400">≤ 150 waypointů — v pořádku</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="text-gray-400">151–200 waypointů — blíží se limitu</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-gray-400">&gt; 200 waypointů — generování zablokováno</span>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
            ⚠ Červené varování = mise má více než 200 waypointů a nelze ji exportovat.
          </div>

          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Problém</th>
                <th className={thClass}>Řešení</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Příliš mnoho waypointů', 'Sniž překryv z 80 % na 60 %'],
                ['Příliš mnoho waypointů', 'Zvětši vzdálenost od fasády (více m)'],
                ['Příliš mnoho waypointů', 'Zmenši výškový rozsah (start/konec)'],
                ['Příliš mnoho waypointů', 'Rozděl misi na 2 části (např. spodní / horní polovina)'],
              ].map(([prob, sol], i) => (
                <tr key={i}>
                  <td className={tdClass + ' text-red-400'}>{prob}</td>
                  <td className={tdClass}>{sol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── E2: Sdílení mise + Odhad baterie ── */}
        <section id="sdileni-baterie" className={sectionClass}>
          <h2 className={h2Class}>Sdílení mise</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-white font-medium">🔗</span> vedle „Uložit misi"
            zkopíruje odkaz do schránky. Odkaz obsahuje celou misi zakódovanou přímo v URL —
            příjemce ji otevře v prohlížeči bez nutnosti přenosu souborů.
          </p>
          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-3 text-sm mb-2">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Typické použití</p>
            <ul className="flex flex-col gap-1.5 text-gray-300 text-sm list-none">
              <li className="flex gap-2"><span className="text-blue-400">●</span> Sdílení plánu letu s klientem nebo kolegou pilotem</li>
              <li className="flex gap-2"><span className="text-blue-400">●</span> Záloha mise jako URL (ulož odkaz do poznámek nebo e-mailu)</li>
              <li className="flex gap-2"><span className="text-blue-400">●</span> Rychlé předání mise bez nutnosti exportu KMZ souboru</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Odkaz funguje pro všechny typy misí. Filmové mise se sdílí jako waypointy — příjemce
            vidí body na mapě, ale filmové parametry záběru nejsou přenášeny.
          </p>

          <h2 className={`${h2Class} mt-10`}>Odhad spotřeby baterie</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Panel se zobrazí automaticky po přidání 2 a více waypointů. Počítá přibližnou spotřebu
            baterie a dobu letu pro DJI Mini 4 Pro na základě délky trasy a nastavených rychlostí.
          </p>
          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-3 text-sm mb-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Parametry výpočtu (DJI Mini 4 Pro)</p>
            <table className={tableClass}>
              <tbody>
                <tr>
                  <td className={tdClass + ' text-gray-400'}>Kapacita baterie</td>
                  <td className={tdClass}><span className="text-white font-medium">33.48 Wh</span></td>
                </tr>
                <tr>
                  <td className={tdClass + ' text-gray-400'}>Průměrná spotřeba při letu</td>
                  <td className={tdClass}><span className="text-white font-medium">~7 W</span></td>
                </tr>
                <tr>
                  <td className={tdClass + ' text-gray-400'}>Bezpečnostní rezerva</td>
                  <td className={tdClass}><span className="text-white font-medium">20 %</span> <span className="text-gray-500 text-xs">(doporučeno nikdy neklesat pod tuto hranici)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-4 py-3 text-xs text-yellow-400 leading-relaxed">
            ⚠ <span className="font-medium">Upozornění:</span> Odhad je přibližný a nezohledňuje
            vítr, vzlet/přistání, hovering ani teplotu baterie. Ve větru spotřeba výrazně roste.
            Vždy nechej alespoň 20–25 % rezervu a sleduj stav baterie v DJI Fly.
          </div>
        </section>

        {/* ── F: Terrain Following ── */}
        <section id="terrain" className={sectionClass}>
          <h2 className={h2Class}>Terrain Following</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Terrain Following automaticky upraví výšky waypointů podle skutečného terénu pod trasou.
            Dron tak letí ve stejné výšce nad zemí po celou trasu — pokud trasa překračuje kopec,
            výška se automaticky zvýší, aby dron neklesl příliš blízko terénu.
          </p>

          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-4 text-sm mb-4">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
              Jak aktivovat
            </p>
            <ol className="flex flex-col gap-2 text-gray-300 text-sm">
              <li className="flex gap-2"><span className="text-green-500 font-bold">1.</span> Vygeneruj misi (waypoints, grid, film...)</li>
              <li className="flex gap-2"><span className="text-green-500 font-bold">2.</span> V panelu klikni na tlačítko <span className="text-white font-medium">&quot;🏔 Přizpůsobit terénu&quot;</span></li>
              <li className="flex gap-2"><span className="text-green-500 font-bold">3.</span> Aplikace stáhne data výšky terénu (Open-Meteo, zdarma)</li>
              <li className="flex gap-2"><span className="text-green-500 font-bold">4.</span> Výšky waypointů se automaticky upraví</li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              Aktivní terrain following zobrazí zelený badge <span className="text-green-400">🏔 Terrain</span> v hlavičce panelu.
              Tlačítkem <span className="text-white">&quot;Resetovat výšky&quot;</span> se vrátíš k původním hodnotám.
            </p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-4 py-3 text-xs text-yellow-400 leading-relaxed">
            ⚠ <span className="font-medium">Upozornění:</span> Výšky waypointů jsou vždy relativní od místa vzletu.
            Terrain following kompenzuje převýšení terénu oproti startovní pozici — nezaručuje však
            bezpečnou vzdálenost od stromů, budov ani jiných překážek nad terénem.
            Vždy vizuálně zkontroluj trasu před letem.
          </div>
        </section>

        {/* ── G: 3D náhled mise ── */}
        <section id="nahled-3d" className={sectionClass}>
          <h2 className={h2Class}>3D náhled mise</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-white font-medium">🔭 3D náhled</span> otevře interaktivní
            3D vizualizaci naplánované trasy v reálném terénu (CesiumJS). Trasa se zobrazí
            v přesné výšce nad zemí díky datům z Open-Meteo.
          </p>

          {/* Google 3D info box */}
          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-4 text-sm mb-4">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
              Pokrytí Google Photorealistic 3D Tiles
            </p>
            <ul className="flex flex-col gap-2 text-gray-300 text-sm list-none">
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5">●</span>
                Google 3D modely jsou dostupné pouze ve větších městech a turisticky významných oblastech
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5">●</span>
                V oblastech bez pokrytí se automaticky zobrazí OSM Buildings (šedé 3D bloky)
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5">●</span>
                Přepínání: tlačítko <span className="text-white font-medium">🌍 Google 3D</span> / <span className="text-white font-medium">🏢 Budovy</span> vpravo nahoře v 3D náhledu
              </li>
            </ul>
          </div>

          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-4 text-sm mb-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
              Ovládání 3D náhledu
            </p>
            <ul className="flex flex-col gap-1.5 text-gray-300 text-sm">
              <li><span className="text-gray-500">Orbit (otáčení):</span> levé tlačítko myši</li>
              <li><span className="text-gray-500">Pan (posun):</span> prostřední tlačítko / Ctrl + levé</li>
              <li><span className="text-gray-500">Zoom:</span> pravé tlačítko / kolečko myši</li>
              <li><span className="text-gray-500">Kompas:</span> rotuje spolu s kamerou — červená šipka = sever</li>
            </ul>
          </div>

          <div className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-4 text-sm">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
              Severka a kompas
            </p>
            <ul className="flex flex-col gap-2 text-gray-300 text-sm list-none">
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">●</span>
                <span>
                  <span className="text-white font-medium">V mapě (2D):</span>{' '}
                  Severka vpravo dole vždy ukazuje sever.
                  Dvojklik → mapa přiletí na aktuální misi (nebo střed ČR, pokud nejsou žádné waypointy).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">●</span>
                <span>
                  <span className="text-white font-medium">V 3D náhledu:</span>{' '}
                  Kompas vpravo dole se otáčí podle orientace kamery.
                  Dvojklik → kamera se srovná na sever při zachování aktuálního pitche.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── G2: Přepínač vrstev mapy ── */}
        <section className={sectionClass}>
          <h2 className={h2Class}>Přepínání podkladové mapy</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Ikona vrstev vpravo nahoře na mapě umožňuje přepínat mezi třemi podkladovými mapami.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: '🗺', label: 'Mapa', color: 'text-blue-400', desc: 'Klasická OpenStreetMap s názvy ulic, obcí a bodů zájmu. Vhodná pro orientaci a plánování tras.' },
              { icon: '🛰', label: 'Satelit', color: 'text-green-400', desc: 'Letecké ortofoto snímky (Esri World Imagery). Ideální pro kontrolu překážek — stromy, budovy, terén — před letem.' },
              { icon: '🏔', label: 'Terén', color: 'text-yellow-400', desc: 'Topografická mapa s vrstevnicemi, výškami a názvy obcí (Esri World Topo Map). Užitečná při plánování misí v terénu.' },
            ].map((item) => (
              <div key={item.label} className="bg-[#1a1d27] border border-gray-700 rounded-lg px-4 py-3 flex gap-3 items-start">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className={`text-sm font-semibold mb-0.5 ${item.color}`}>{item.label}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            Tip: Satelitní vrstva je nejvíce užitečná při finální kontrole trasy před exportem —
            vidíš přesné polohy stromů a budov v záběru.
          </p>
        </section>

        {/* ── H: Přenos do RC 2 ── */}
        <section id="prenos" className={sectionClass}>
          <h2 className={h2Class}>Přenos mise do RC 2</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Po exportu KMZ souboru ho přenese přes USB-C do ovladače RC 2. V DJI Fly otevři
            existující dummy misi a přepiš její KMZ soubor tím exportovaným — zachovej původní
            název souboru.
          </p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300 transition-colors font-medium"
          >
            Zobrazit detailní návod krok za krokem →
          </Link>

          <h3 className="text-white font-medium text-sm mt-5 mb-2">📂 Import KMZ</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Exportovaný KMZ soubor můžeš kdykoli načíst zpět do editoru tlačítkem{' '}
            <span className="text-gray-100 font-medium">📂 Import KMZ</span> v dolní liště.
            Mise se načte jako sada ručních waypointů připravených k editaci.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed mt-2">
            Omezení: filmové mise (Spirála, Grid, Orbit, Dronie…) se importují jako základní
            waypointy — speciální parametry záběru nejsou zachovány. Podporován je standardní
            DJI WPML formát (waylines.wpml) i obecné KML soubory.
          </p>
        </section>

        {/* ── NP a CHKO ──────────────────────────────────────────────────── */}
        <section id="priroda" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">🌿 Národní parky a CHKO</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-green-400 font-medium">🌿 Zobrazit NP a CHKO</span> v postranním
            panelu přidá do mapy vrstvu přírodních ochranných území ČR — národních parků (zeleně)
            a chráněných krajinných oblastí (modře).
          </p>

          {/* Type cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#22c55e' }} />
                <span className="text-green-400 font-medium text-sm">Národní parky (NP)</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                4 parky: Šumava, Krkonoše, České Švýcarsko, Podyjí.
                Létání dronem je <strong className="text-red-400">zakázáno</strong> mimo
                zastavěná území bez výjimky (§ 29 zákona č. 114/1992 Sb.).
              </p>
            </div>
            <div className="bg-[#0f1117] border border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#3b82f6' }} />
                <span className="text-blue-400 font-medium text-sm">CHKO (26 oblastí)</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Chráněné krajinné oblasti: Šumava, Beskydy, Jeseníky a další.
                Létání je <strong className="text-yellow-400">omezeno</strong> — záleží na
                konkrétní zóně. Vždy ověřte aktuální podmínky před letem.
              </p>
            </div>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">📋 Pravidla pro drony v NP</h3>
          <ul className="text-gray-300 text-sm space-y-1 mb-4 list-disc list-inside">
            <li>Zákaz létání v celém území NP bez výjimky udělené správou parku</li>
            <li>Výjimka se nevztahuje na záchranné složky a vědecký výzkum</li>
            <li>Přistávání i vzlet dronu v NP je zakázán</li>
            <li>Pokuty za porušení: až 100 000 Kč pro fyzické osoby</li>
          </ul>

          <h3 className="text-white font-medium text-sm mb-2">📋 Pravidla pro drony v CHKO</h3>
          <ul className="text-gray-300 text-sm space-y-1 mb-4 list-disc list-inside">
            <li>Záleží na zóně CHKO — 1. zóna (nejpřísnější) = faktický zákaz</li>
            <li>Ve 2.–4. zóně jsou drony zpravidla povoleny se zdravým rozumem</li>
            <li>Vždy dodržujte klid přírody, neplaší zvěř, nevstupujte do porostů</li>
            <li>Doporučeno: informovat správu CHKO před plánovaným letem</li>
          </ul>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Data NP a CHKO jsou orientační (zdroj: OpenStreetMap).
              Před letem vždy ověřte aktuální legislativu a podmínky správy území.
              Aktuální pravidla:{' '}
              <a
                href="https://www.letejtezodpovedne.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                letejtezodpovedne.cz
              </a>
            </p>
          </div>
        </section>

        {/* ── Malé přírodní rezervace ── */}
        <section id="rezervace" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">🌱 Přírodní rezervace (NPR/NPP/PR/PP)</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-emerald-400 font-medium">🌱 Přírodní rezervace</span> zobrazí
            na mapě vrstvu malých přírodních rezervací ČR spravovaných AOPK ČR. Jsou přísněji chráněné
            než CHKO, ale menší než národní parky.
          </p>

          {/* 4 type cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#15803d' }} />
                <span className="text-green-400 font-medium text-sm">NPR – Národní přírodní rezervace</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Nejpřísněji chráněná území mimo NP.{' '}
                <strong className="text-red-400">Zákaz létání dronem</strong> — vyžaduje výjimku AOPK ČR.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#15803d' }} />
                <span className="text-green-400 font-medium text-sm">NPP – Národní přírodní památka</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Geologické, paleontologické nebo biologicky cenné lokality.{' '}
                <strong className="text-red-400">Zákaz létání dronem</strong> bez povolení AOPK ČR.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-emerald-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#86efac' }} />
                <span className="text-emerald-400 font-medium text-sm">PR – Přírodní rezervace</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Regionálně cenná území. Létání dronem je{' '}
                <strong className="text-yellow-400">omezeno</strong> — ověřte podmínky správy území.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-emerald-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#86efac' }} />
                <span className="text-emerald-400 font-medium text-sm">PP – Přírodní památka</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Lokálně cenné přírodní útvary. Doporučujeme ověřit podmínky před letem.
              </p>
            </div>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">🔔 Kolizní detekce</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Aplikace automaticky detekuje waypointy uvnitř rezervací (stejně jako u letových zón).
            Barevné označení: <span className="text-red-400">⛔ DANGER</span> pro NPR/NPP,{' '}
            <span className="text-orange-400">⚠️ WARNING</span> pro PR,{' '}
            <span className="text-yellow-400">ℹ️ CAUTION</span> pro PP.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Data rezervací jsou orientační (zdroj: OpenStreetMap / AOPK ČR).
              Před letem vždy ověřte aktuální podmínky na{' '}
              <a
                href="https://www.ochranaprirody.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                ochranaprirody.cz
              </a>.
            </p>
          </div>
        </section>

        {/* ── Vodní zdroje a ochranná pásma ── */}
        <section id="voda" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">💧 Vodní zdroje (nádrže a ochranná pásma)</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-sky-400 font-medium">💧 Vodní zdroje</span> zobrazí
            na mapě vrstvu vodních nádrží a rezervoárů ČR. Zákon o vodách (č. 254/2001 Sb.)
            stanovuje ochranná pásma vodních zdrojů, ve kterých může být létání dronem omezeno
            nebo podmíněno souhlasem správce.
          </p>

          {/* 2 tier cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-sky-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#0369a1' }} />
                <span className="text-sky-300 font-medium text-sm">💧 Pitná voda</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Vodní zdroj označený jako zdroj pitné vody.{' '}
                <strong className="text-yellow-400">Doporučujeme ověřit</strong> podmínky u správce
                vodárenské soustavy před letem v okolí nádrže.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-sky-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#7dd3fc' }} />
                <span className="text-sky-400 font-medium text-sm">🌊 Ostatní nádrže</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Přehrady, retenční nádrže a rybníky bez explicitního označení pitné vody.
                Ověřte zda se nachází v ochranném pásmu vodního zdroje.
              </p>
            </div>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">📋 Ochranná pásma I. a II. stupně</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Česká legislativa rozlišuje dvě pásma ochrany vodních zdrojů:
          </p>
          <div className="space-y-2 mb-5">
            <div className="bg-[#0f1117] border border-gray-700 rounded p-3">
              <p className="text-sm font-medium text-sky-300 mb-1">I. stupeň ochrany</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Bezprostřední okolí odběrného místa. Vstup a jakákoliv činnost je přísně omezena.
                Létání dronem je prakticky vyloučeno bez povolení správce.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-gray-700 rounded p-3">
              <p className="text-sm font-medium text-sky-400 mb-1">II. stupeň ochrany</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Širší oblast kolem vodního zdroje. Létání dronem může být omezeno —
                vždy kontaktujte správce vodárenské soustavy nebo krajský vodoprávní úřad.
              </p>
            </div>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">🔔 Kolizní detekce</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Aplikace detekuje waypointy uvnitř vodních nádrží a zobrazí{' '}
            <span className="text-yellow-400">ℹ️ CAUTION</span> upozornění.
            Přesné hranice ochranných pásem I./II. stupně nejsou dostupné v OpenStreetMap —
            zobrazená plocha je samotná nádrž, nikoli pásmo ochrany.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Data vodních nádrží jsou orientační (zdroj: OpenStreetMap).
              Přesná ochranná pásma vodních zdrojů vyhledejte ve Veřejném registru práv a povinností
              (VPRP) nebo na portálu{' '}
              <a
                href="https://www.vuv.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                vuv.cz
              </a>{' '}
              (Výzkumný ústav vodohospodářský T. G. Masaryka).
            </p>
          </div>
        </section>

        {/* ── Železnice a ochranná pásma ── */}
        <section id="zeleznice" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">🚂 Železnice a ochranná pásma (LKR311)</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-red-400 font-medium">🚂 Železnice</span> zobrazí
            na mapě barevné koridory reprezentující ochranná pásma kolem železničních tratí ČR.
            Letecký předpis LKR311 zakazuje létání dronem v těchto pásmech bez souhlasu
            správce infrastruktury.
          </p>

          {/* 2 type cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#dc2626' }} />
                <span className="text-red-400 font-medium text-sm">🚂 Železniční tratě</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Celostátní a regionální tratě, rychlodráhy, úzkorozchodné tratě.{' '}
                <strong className="text-red-400">Ochranné pásmo 60 m</strong> od osy koleje.
                Správce: Správa železnic.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#f97316' }} />
                <span className="text-orange-400 font-medium text-sm">🚋 Tramvajové tratě</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Tramvajové tratě v městských oblastech.{' '}
                <strong className="text-yellow-400">Ochranné pásmo 30 m</strong> od osy koleje.
                Ověřte podmínky u provozovatele MHD.
              </p>
            </div>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">📐 Co je zobrazeno na mapě</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Barevné koridory jsou předpočítané buffer polygony — červená plocha = 60 m od osy koleje
            na obě strany, oranžová = 30 m. Vrstvy nezahrnují depa, seřadiště a vlečky (ty nejsou
            pro veřejný provoz relevantní).
          </p>

          <h3 className="text-white font-medium text-sm mb-2">🔔 Kolizní detekce</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Pokud waypoint leží uvnitř bufferu železnice, aplikace zobrazí:{' '}
            <span className="text-orange-400">⚠️ WARNING</span> pro hlavní tratě (60 m),{' '}
            <span className="text-yellow-400">ℹ️ CAUTION</span> pro tramvaje (30 m).
          </p>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Zobrazené koridory jsou orientační (zdroj: OpenStreetMap).
              Přesná ochranná pásma ověřte u{' '}
              <a
                href="https://www.spravazeleznic.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                Správy železnic
              </a>{' '}
              nebo provozovatele tramvajové sítě.
            </p>
          </div>
        </section>

        {/* ── Silnice a dálnice — ochranná pásma ── */}
        <section id="silnice" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">🛣️ Silnice a dálnice — ochranná pásma (LKR310)</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-amber-400 font-medium">🛣️ Silnice</span> zobrazí
            na mapě barevné koridory ochranných pásem kolem dálnic, rychlostních silnic a
            silnic I. a II. třídy ČR. Letecký předpis LKR310 zakazuje provoz
            dronů v těchto pásmech bez povolení správce komunikace.
          </p>

          {/* 3 road class cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-amber-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#f59e0b' }} />
                <span className="text-amber-400 font-medium text-sm">🛣️ Dálnice / R-silnice</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Dálnice D* a rychlostní silnice R*/S*.{' '}
                <strong className="text-amber-400">Ochranné pásmo 50 m</strong> od osy krajního pruhu,{' '}
                výška do <strong className="text-amber-400">50 m</strong>.
                Správce: ŘSD ČR.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-amber-700/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#fbbf24' }} />
                <span className="text-amber-300 font-medium text-sm">Silnice I. třídy</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Státní silnice I/*.{' '}
                <strong className="text-amber-300">Ochranné pásmo 50 m</strong> od osy, výška do{' '}
                <strong className="text-amber-300">50 m</strong>.
                Správce: ŘSD ČR.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-amber-700/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#fde68a' }} />
                <span className="text-amber-200 font-medium text-sm">Silnice II. třídy</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Krajské silnice II/*.{' '}
                <strong className="text-amber-200">Ochranné pásmo 15 m</strong> od osy.
                Správce: příslušná správa a údržba silnic kraje.
              </p>
            </div>
          </div>

          <div className="bg-[#0f1117] border border-gray-700 rounded-lg p-3 mb-4">
            <p className="text-gray-300 text-xs leading-relaxed">
              <strong className="text-white">ℹ Místní komunikace III. a IV. třídy</strong>{' '}
              (ulice, polní cesty) nejsou zobrazeny — pro drony kategorie C0 bez omezení.
            </p>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">🔔 Kolizní detekce</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Pokud waypoint leží v ochranném pásmu silnice, aplikace zobrazí:{' '}
            <span className="text-orange-400">⚠️ WARNING</span> pro dálnice, rychlostní silnice a silnice I. třídy (50 m),{' '}
            <span className="text-yellow-400">ℹ️ CAUTION</span> pro silnice II. třídy (15 m).
          </p>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Zobrazeny jsou pouze číslované státní a krajské silnice
              (zdroj: OpenStreetMap). Místní komunikace nejsou zahrnuty.
              Přesná ochranná pásma ověřte u{' '}
              <a
                href="https://www.rsd.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                ŘSD ČR
              </a>
              {' '}nebo správy silnic příslušného kraje.
            </p>
          </div>
        </section>

        {/* ── Elektrické vedení a ochranná pásma ── */}
        <section id="elektro" className={sectionClass}>
          <h2 className="text-white font-semibold text-base mb-4">⚡ Elektrické vedení a ochranná pásma (LKR312)</h2>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Tlačítko <span className="text-yellow-400 font-medium">⚡ El. vedení</span> zobrazí
            na mapě barevné koridory a plochy ochranných pásem kolem vysokonapěťových vedení a
            trafostanic v ČR. Zákon č. 458/2000 Sb. (energetický zákon) zakazuje provoz
            dronů v těchto pásmech bez souhlasu provozovatele.
          </p>

          {/* Voltage class cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-violet-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#7c3aed' }} />
                <span className="text-violet-400 font-medium text-sm">EHV &gt; 400 kV</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Velmi vysoké napětí — přenosová soustava ČEPS.{' '}
                <strong className="text-violet-400">Ochranné pásmo 30 m</strong> od osy vedení.
                Nebezpečí elektromagnetické indukce.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-purple-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#a855f7' }} />
                <span className="text-purple-400 font-medium text-sm">HV 220–400 kV</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Vysoké napětí — přenosová a distribuční soustava.{' '}
                <strong className="text-purple-400">Ochranné pásmo 20 m</strong> od osy vedení.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-pink-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#ec4899' }} />
                <span className="text-pink-400 font-medium text-sm">HV 110–220 kV</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Regionální přenosové vedení.{' '}
                <strong className="text-pink-400">Ochranné pásmo 15 m</strong> od osy vedení.
              </p>
            </div>
            <div className="bg-[#0f1117] border border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-2 rounded flex-shrink-0" style={{ background: '#f97316' }} />
                <span className="text-orange-400 font-medium text-sm">HV 35–110 kV</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Distribuční vedení vysokého napětí.{' '}
                <strong className="text-orange-400">Ochranné pásmo 12 m</strong> od osy vedení.
              </p>
            </div>
          </div>

          {/* Substation card */}
          <div className="bg-[#0f1117] border border-yellow-800 rounded-lg p-3 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded flex-shrink-0" style={{ background: '#eab308', opacity: 0.5 }} />
              <span className="text-yellow-400 font-medium text-sm">⚡ Trafostanice a rozvodny</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Elektrické stanice zobrazeny jako žluté polygony.{' '}
              <strong className="text-yellow-400">Ochranné pásmo 20 m</strong> od oplocení.
              Silné elektromagnetické pole — dodržte bezpečnou vzdálenost.
            </p>
          </div>

          <h3 className="text-white font-medium text-sm mb-2">🔔 Kolizní detekce</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Pokud waypoint leží v ochranném pásmu vedení nebo trafostanice, aplikace zobrazí:{' '}
            <span className="text-orange-400">⚠️ WARNING</span> pro vedení EHV a 220–400 kV,{' '}
            <span className="text-yellow-400">ℹ️ CAUTION</span> pro ostatní třídy.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Zobrazena jsou vedení s napětím ≥ 35 kV (zdroj: OpenStreetMap).
              Distribuční vedení nízkého napětí nejsou zahrnuta. Přesná ochranná pásma
              ověřte u provozovatele distribuční soustavy —{' '}
              <a
                href="https://www.ceps.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                ČEPS
              </a>
              ,{' '}
              <a
                href="https://www.eon.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                E.ON
              </a>
              ,{' '}
              <a
                href="https://www.cezdistribuce.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                ČEZ Distribuce
              </a>
              .
            </p>
          </div>
        </section>

        {/* ── Legislativa a povinnosti pilota ── */}
        <section id="legislativa" className={sectionClass}>
          <h2 className="text-lg font-semibold mb-4 text-yellow-400 border-b border-gray-800 pb-2">
            ⚖️ Legislativa a povinnosti pilota
          </h2>

          {/* C0 kategorie */}
          <h3 className="text-white font-medium text-sm mb-2">DJI Mini 4 Pro – kategorie C0</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            DJI Mini 4 Pro váží 249 g a nese štítek <strong className="text-yellow-300">C0</strong> —
            nejvolnější regulační kategorie v Evropě (EASA Open A1). Platí od 31. 12. 2023.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {[
              { ok: true,  text: 'Nevyžaduje zkoušku pilota (pod 250 g bez C1 štítku)' },
              { ok: true,  text: 'Nevyžaduje registraci provozovatele' },
              { ok: true,  text: 'Lze létat prakticky kdekoliv mimo zakázané zóny' },
              { ok: true,  text: 'Dron musí být stále na dohled (VLOS)' },
              { ok: false, text: 'Max výška: 120 m nad terénem' },
              { ok: false, text: 'Nesmí přelétat shromáždění lidí' },
              { ok: false, text: 'Musí dát přednost pilotovaným letadlům' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#1a1d27] rounded-lg px-3 py-2 border border-gray-700">
                <span className={`flex-shrink-0 text-sm font-bold ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {item.ok ? '✓' : '✗'}
                </span>
                <span className="text-gray-300 text-xs leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Předletová příprava */}
          <h3 className="text-white font-medium text-sm mb-2">📋 Povinná předletová příprava</h3>
          <p className="text-gray-400 text-xs mb-3">
            Platí od <strong className="text-white">1. 9. 2025</strong> dle nového zákona č. 49/1997 Sb.
          </p>
          <ol className="space-y-2 text-sm text-gray-300 list-none mb-5">
            {[
              <>Zkontroluj letové zóny v aplikaci <strong className="text-white">DroneMap</strong>{' '}(<a href="https://www.dronemap.gov.cz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">dronemap.gov.cz</a>) — povinná od 1. 9. 2025</>,
              <>V některých zónách povinný <strong className="text-white">check-in</strong> — vložení info o letu do DroneMap před vzletem</>,
              'Zkontroluj počasí, vítr a stav baterie',
              'Ověř vizuálně že dron není poškozen (vrtule, tělo, kamera)',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-700 text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm">{step}</span>
              </li>
            ))}
          </ol>

          {/* Zakázané oblasti */}
          <h3 className="text-white font-medium text-sm mb-2">🚫 Zakázané oblasti</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#0f1117] border border-red-800 rounded-lg p-3">
              <p className="text-red-400 font-medium text-xs mb-2">Bez povolení NELZE létat</p>
              <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
                <li>CTR – řízený vzdušný prostor kolem letišť</li>
                <li>PROHIBITED / RESTRICTED – vojenské a zakázané zóny</li>
                <li>Nad Pražským hradem a dalšími chráněnými objekty</li>
                <li>Nad hustě obsazenými shromážděními lidí</li>
                <li>NP – národní parky (mimo zastavěná území)</li>
                <li>Výšky nad 120 m bez zvláštního povolení</li>
              </ul>
            </div>
            <div className="bg-[#0f1117] border border-yellow-800 rounded-lg p-3">
              <p className="text-yellow-400 font-medium text-xs mb-2">Se souhlasem správce zóny</p>
              <ul className="text-gray-300 text-xs space-y-1 list-disc list-inside">
                <li>CHKO (záleží na zóně I–IV)</li>
                <li>Blízkost silnic, železnic, vodních zdrojů</li>
                <li>Ochranná pásma (vedení, vysílače)</li>
                <li className="text-gray-500">Od 1. 9. 2025: souhlas přes DroneMap místo žádosti na ÚCL</li>
              </ul>
            </div>
          </div>

          {/* Sankce */}
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-5">
            <p className="text-red-300 text-xs leading-relaxed">
              <strong>⚠ Sankce:</strong> Pokuta až <strong className="text-white">3 000 000 Kč</strong> za
              porušení zákona č. 49/1997 Sb. o civilním letectví. Za létání v zakázaných zónách hrozí
              také trestní odpovědnost.
            </p>
          </div>

          {/* Užitečné odkazy */}
          <h3 className="text-white font-medium text-sm mb-2">🔗 Užitečné odkazy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {[
              { label: 'DroneMap – předletová příprava', url: 'https://www.dronemap.gov.cz', note: 'dronemap.gov.cz' },
              { label: 'ÚCL – registrace, zkoušky', url: 'https://www.caa.gov.cz', note: 'caa.gov.cz' },
              { label: 'Pravidla srozumitelně', url: 'https://www.letejtezodpovedne.cz', note: 'letejtezodpovedne.cz' },
              { label: 'Nová pravidla od 1. 9. 2025', url: 'https://www.djishop.cz/blog/nova-pravidla', note: 'djishop.cz/blog' },
            ].map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#1a1d27] rounded-lg px-3 py-2.5 border border-gray-700 hover:border-gray-500 transition-colors group"
              >
                <span className="text-base flex-shrink-0">↗</span>
                <div>
                  <p className="text-white text-xs font-medium group-hover:text-blue-300 transition-colors">{link.label}</p>
                  <p className="text-gray-500 text-xs">{link.note}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <strong>⚠ Upozornění:</strong> Tato aplikace slouží k plánování tras a neposkytuje
              právní poradenství. Vždy si ověřte aktuální pravidla na{' '}
              <a
                href="https://www.dronemap.gov.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 underline hover:text-white"
              >
                dronemap.gov.cz
              </a>{' '}
              před každým letem. <strong>Legislativa se mění.</strong>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
