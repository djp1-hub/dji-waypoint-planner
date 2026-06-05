'use client';

// Guide page — step-by-step instructions for transferring a mission to DJI RC 2
import Link from 'next/link';
import { useTranslation } from '@/lib/languageContext';

/** A single step in the transfer guide */
interface Step {
  number: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Export KMZ file',
    description:
      'Set the waypoints in the main app and click “Export KMZ”. The file will be downloaded to your computer.',
  },
  {
    number: 2,
    title: 'Create a dummy mission in DJI Fly',
    description:
      'Open DJI Fly on RC 2. Create a new empty mission, for example with one waypoint, and save it. This mission will be replaced by the exported one.',
  },
  {
    number: 3,
    title: 'Connect RC 2 to the computer',
    description:
      'Connect DJI RC 2 to the computer using a USB-C data cable. Confirm file access on RC 2 if a dialog appears.',
  },
  {
    number: 4,
    title: 'Find the waypoint folder',
    description:
      'In the file manager, open: Internal storage → Android → data → dji.go.v5 → files → waypoint',
  },
  {
    number: 5,
    title: 'Replace the KMZ file',
    description:
      'Find the dummy mission folder, usually the newest one. Inside it there is a .kmz file with a random name. Copy the exported .kmz into that folder and keep the original file name; replace the contents, do not rename it.',
  },
  {
    number: 6,
    title: 'Open the mission in DJI Fly',
    description:
      'Disconnect the USB cable and open DJI Fly on RC 2. Go to the missions section and open the dummy mission. The route should match your waypoints. Always check heights and route before flight.',
  },
];

export default function GuidePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Page header */}
      <header className="bg-[#1a1d27] border-b border-gray-700 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          {t('app.backToMap')}
        </Link>
        <h1 className="text-white font-bold">{t('guide.pageTitle')}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info box */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-8">
          <p className="text-blue-300 text-sm">
            {t('guide.intro')}
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
          <p className="text-yellow-300 text-sm font-semibold mb-1">{t('guide.importantTitle')}</p>
          <p className="text-yellow-200/80 text-sm">
            {t('guide.importantText')}
          </p>
        </div>
      </main>
    </div>
  );
}
