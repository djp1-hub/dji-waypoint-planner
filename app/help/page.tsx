'use client';

// Help page — translated UI guide to the DJI Waypoint Planner
import Link from 'next/link';
import { useTranslation } from '@/lib/languageContext';

export default function HelpPage() {
  const { t } = useTranslation();

  const sections = [
    {
      title: t('help.photo'),
      body:
        'Use Photo mode for waypoint missions, polygon/grid mapping, orbit flights and facade scans. For mapping, verify altitude, speed, overlap and camera pitch before exporting KMZ.',
    },
    {
      title: t('help.film'),
      body:
        'Use Film mode for cinematic presets such as Dronie, Reveal, Top-down, Crane Up, Hyperlapse, Arc Shot, Boomerang, Rocket and POI Sequence.',
    },
    {
      title: t('help.airspace'),
      body:
        'Airspace and restriction layers are advisory overlays. Always verify the final legal status in the official pre-flight tools before flying.',
    },
    {
      title: t('help.terrain'),
      body:
        'Terrain following adjusts waypoint heights using elevation data so the mission keeps a more consistent height above ground.',
    },
    {
      title: t('help.transfer'),
      body:
        'Export the KMZ, create a placeholder waypoint mission in DJI Fly, connect RC 2 by USB-C/MTP, and replace the placeholder KMZ while keeping the original file name.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f1117] text-gray-300 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          {t('app.backToMap')}
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{t('help.title')}</h1>
          <p className="text-sm text-gray-500">
            DJI Waypoint Planner — mission planning, KMZ export, airspace checks and RC 2 transfer workflow.
          </p>
        </header>

        <div className="grid gap-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="bg-[#1a1d27] border border-gray-700 rounded-xl p-5"
            >
              <h2 className="text-white font-semibold mb-2">{section.title}</h2>
              <p className="text-sm leading-relaxed text-gray-400">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 bg-yellow-900/20 border border-yellow-700 rounded-xl p-4">
          <h2 className="text-yellow-300 font-semibold text-sm mb-2">{t('msg.warning')}</h2>
          <p className="text-yellow-200 text-sm leading-relaxed">
            This application helps with route planning but does not provide legal advice.
            Check current rules, local restrictions, weather, obstacles, battery reserve and RC 2 mission preview before every flight.
          </p>
        </section>
      </div>
    </main>
  );
}
