// Guide page — step-by-step instructions for transferring a mission to DJI RC 2
import Link from 'next/link';

/** A single step in the transfer guide */
interface Step {
  number: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Exportuj KMZ soubor',
    description:
      'V hlavní aplikaci nastav waypointy a klikni na „Exportovat KMZ". Soubor se stáhne do složky Stažené (Downloads) na tvém počítači.',
  },
  {
    number: 2,
    title: 'Vytvoř dummy misi v DJI Fly',
    description:
      'Na RC 2 otevři aplikaci DJI Fly. Vytvoř novou prázdnou misi (např. jedním waypointem) a ulož ji. Tato mise bude nahrazena tou exportovanou.',
  },
  {
    number: 3,
    title: 'Připoj RC 2 k počítači',
    description:
      'Připoj DJI RC 2 k počítači pomocí USB-C datového kabelu (ne nabíjecího). Na RC 2 potvrďte povolení přístupu k souborům, pokud se zobrazí dialog.',
  },
  {
    number: 4,
    title: 'Najdi složku waypoint',
    description:
      'V průzkumníku Windows naviguj do: Internal storage → Android → data → dji.go.v5 → files → waypoint',
  },
  {
    number: 5,
    title: 'Nahraď KMZ soubor',
    description:
      'Najdi složku dummy mise (nejnovější datum). Uvnitř nalezneš .kmz soubor s náhodným názvem. Zkopíruj exportovaný .kmz soubor do této složky a ZACHOVEJ původní název souboru (jen nahraď obsah, nepřejmenuj).',
  },
  {
    number: 6,
    title: 'Otevři misi v DJI Fly',
    description:
      'Odpoj USB kabel a otevři DJI Fly na RC 2. Přejdi do sekce misií a otevři dummy misi. Trasa by měla odpovídat tvým waypointům. Před letem vždy zkontroluj výšky a trasu!',
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Page header */}
      <header className="bg-[#1a1d27] border-b border-gray-700 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Zpět na mapu
        </Link>
        <h1 className="text-white font-bold">Návod: Přenos mise do DJI RC 2</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info box */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-8">
          <p className="text-blue-300 text-sm">
            DJI Mini 4 Pro nepodporuje přímé nahrávání misí přes aplikaci. Tento postup
            umožní nahrát misi přes nahrazení souboru v úložišti RC 2.
          </p>
        </div>

        {/* Steps */}
        <ol className="flex flex-col gap-6">
          {STEPS.map((step) => (
            <li key={step.number} className="flex gap-4">
              {/* Step number circle */}
              <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-sm">
                {step.number}
              </div>

              {/* Step content */}
              <div className="flex-1 bg-[#1a1d27] rounded-lg p-4 border border-gray-700">
                <h2 className="text-white font-semibold mb-1">{step.title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>

                {/* Highlight the path for step 4 */}
                {step.number === 4 && (
                  <code className="mt-2 block bg-[#0f1117] text-green-400 text-xs rounded px-3 py-2 font-mono">
                    Internal storage/Android/data/dji.go.v5/files/waypoint/
                  </code>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* Warning */}
        <div className="mt-8 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-300 text-sm font-semibold mb-1">Důležité upozornění</p>
          <p className="text-yellow-200/80 text-sm">
            Vždy zkontroluj trasu a výšky před vzletem. Ujisti se, že letová oblast je
            v souladu s platnou legislativou a není v zákazu létání (CTR, TRA apod.).
          </p>
        </div>
      </main>
    </div>
  );
}
