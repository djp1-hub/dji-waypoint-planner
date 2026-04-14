'use client';

// Saved missions list page — /missions
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MissionList from '@/components/MissionList';
import { Mission } from '@/lib/types';
import { loadMissions, deleteMission } from '@/lib/missionStore';

export default function MissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);

  // Load missions from localStorage on mount (client-side only)
  useEffect(() => {
    setMissions(loadMissions());
  }, []);

  /** Load a mission back into the map editor */
  function handleLoad(mission: Mission) {
    // Store the selected mission in sessionStorage so the home page can pick it up
    sessionStorage.setItem('loadMission', JSON.stringify(mission));
    router.push('/');
  }

  /** Delete a mission and refresh the list */
  function handleDelete(id: string) {
    deleteMission(id);
    setMissions(loadMissions());
  }

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
        <h1 className="text-white font-bold">Uložené mise</h1>
      </header>

      {/* Mission list */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <MissionList
          missions={missions}
          onLoad={handleLoad}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
