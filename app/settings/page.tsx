'use client';

// Settings page — manage pilots and drones stored in localStorage.
// Route: /settings

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  loadPilots, savePilot, updatePilot, deletePilot,
  loadActivePilotId, setActivePilotId,
  loadDrones, saveDrone, updateDrone, deleteDrone,
  loadActiveDroneId, setActiveDroneId,
} from '@/lib/profileStore';
import { Pilot, Drone } from '@/lib/types';
import { useTranslation } from '@/lib/languageContext';

// ── Blank form states ─────────────────────────────────────────────────────────

const BLANK_PILOT: Omit<Pilot, 'id'> = {
  firstName: '', lastName: '', email: '', phone: '',
  uclOperatorId: '', licenseNumber: '', isDefault: false,
};

const BLANK_DRONE: Omit<Drone, 'id'> = {
  name: '', manufacturer: 'DJI', model: '',
  weightG: 0, droneClass: 'C0', serialNumber: '',
  batteryWh: 0, avgPowerW: 0, maxAltitudeM: 120, maxSpeedMs: 16,
  isDefault: false,
};

// ── Reusable field component ──────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

// ── Pilot form ────────────────────────────────────────────────────────────────

function PilotForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Pilot, 'id'>;
  onSave: (data: Omit<Pilot, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (key: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="bg-[#1a1d27] border border-gray-700 rounded-lg p-4 mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('settings.firstName')} value={form.firstName} onChange={set('firstName')} placeholder="Jan" />
        <Field label={t('settings.lastName')} value={form.lastName} onChange={set('lastName')} placeholder="Smith" />
        <Field label="E-mail" value={form.email} onChange={set('email')} type="email" placeholder="jan@example.com" />
        <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="+420 xxx xxx xxx" />
        <Field label={t('settings.operatorNumber')} value={form.uclOperatorId} onChange={set('uclOperatorId')} placeholder="CZE000000000" />
        <Field label={t('settings.licenseNumber')} value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="CZE-A1A3-0000000" />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
        >
          {t('btn.save')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded font-medium transition-colors"
        >
          {t('btn.cancel')}
        </button>
      </div>
    </div>
  );
}

// ── Drone form ────────────────────────────────────────────────────────────────

function DroneForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Drone, 'id'>;
  onSave: (data: Omit<Drone, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (key: keyof typeof form) => (v: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: ['weightG', 'batteryWh', 'avgPowerW', 'maxAltitudeM', 'maxSpeedMs'].includes(key as string)
        ? parseFloat(v) || 0
        : v,
    }));

  return (
    <div className="bg-[#1a1d27] border border-gray-700 rounded-lg p-4 mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('settings.displayName')} value={form.name} onChange={set('name')} placeholder="DJI Mini 4 Pro" />
        <Field label={t('settings.manufacturer')} value={form.manufacturer} onChange={set('manufacturer')} placeholder="DJI" />
        <Field label="Model" value={form.model} onChange={set('model')} placeholder="Mini 4 Pro" />
        <Field label="Weight (g)" value={form.weightG || ''} onChange={set('weightG')} type="number" placeholder="249" />
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('settings.euClass')}</label>
          <select
            value={form.droneClass}
            onChange={(e) => setForm((prev) => ({ ...prev, droneClass: e.target.value as Drone['droneClass'] }))}
            className="w-full bg-[#0f1117] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="C0">C0 (pod 250 g)</option>
            <option value="C1">C1 (250 g – 900 g)</option>
            <option value="C2">C2 (900 g – 4 kg)</option>
          </select>
        </div>
        <Field label={t('settings.serialNumber')} value={form.serialNumber} onChange={set('serialNumber')} placeholder={t('settings.optional')} />
        <Field label="Battery capacity (Wh)" value={form.batteryWh || ''} onChange={set('batteryWh')} type="number" placeholder="33.48" />
        <Field label={t('settings.avgPower')} value={form.avgPowerW || ''} onChange={set('avgPowerW')} type="number" placeholder="7" />
        <Field label={t('settings.maxHeight')} value={form.maxAltitudeM || ''} onChange={set('maxAltitudeM')} type="number" placeholder="120" />
        <Field label="Max speed (m/s)" value={form.maxSpeedMs || ''} onChange={set('maxSpeedMs')} type="number" placeholder="16" />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
        >
          {t('btn.save')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded font-medium transition-colors"
        >
          {t('btn.cancel')}
        </button>
      </div>
    </div>
  );
}

// ── Main settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'pilots' | 'drones'>('pilots');

  // ── Pilots state ──────────────────────────────────────────────
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [activePilotId, setActivePilotIdState] = useState<string | null>(null);
  const [pilotFormMode, setPilotFormMode] = useState<'none' | 'add' | { edit: Pilot }>('none');

  // ── Drones state ──────────────────────────────────────────────
  const [drones, setDrones] = useState<Drone[]>([]);
  const [activeDroneId, setActiveDroneIdState] = useState<string | null>(null);
  const [droneFormMode, setDroneFormMode] = useState<'none' | 'add' | { edit: Drone }>('none');

  // Load from localStorage on mount
  useEffect(() => {
    setPilots(loadPilots());
    setActivePilotIdState(loadActivePilotId());
    setDrones(loadDrones());
    setActiveDroneIdState(loadActiveDroneId());
  }, []);

  // ── Pilot handlers ────────────────────────────────────────────

  const handleSavePilot = useCallback((data: Omit<Pilot, 'id'>) => {
    if (pilotFormMode === 'add') {
      const created = savePilot(data);
      setPilots(loadPilots());
      // Auto-activate first pilot
      if (pilots.length === 0) {
        setActivePilotId(created.id);
        setActivePilotIdState(created.id);
      }
    } else if (typeof pilotFormMode === 'object') {
      updatePilot({ ...data, id: pilotFormMode.edit.id });
      setPilots(loadPilots());
    }
    setPilotFormMode('none');
  }, [pilotFormMode, pilots.length]);

  const handleDeletePilot = useCallback((id: string) => {
    deletePilot(id);
    setPilots(loadPilots());
    if (activePilotId === id) setActivePilotIdState(null);
  }, [activePilotId]);

  const handleSetActivePilot = useCallback((id: string) => {
    setActivePilotId(id);
    setActivePilotIdState(id);
  }, []);

  // ── Drone handlers ────────────────────────────────────────────

  const handleSaveDrone = useCallback((data: Omit<Drone, 'id'>) => {
    if (droneFormMode === 'add') {
      saveDrone(data);
      setDrones(loadDrones());
    } else if (typeof droneFormMode === 'object') {
      updateDrone({ ...data, id: droneFormMode.edit.id });
      setDrones(loadDrones());
    }
    setDroneFormMode('none');
  }, [droneFormMode]);

  const handleDeleteDrone = useCallback((id: string) => {
    if (drones.length <= 1) return; // cannot delete last drone
    deleteDrone(id);
    setDrones(loadDrones());
    if (activeDroneId === id) setActiveDroneIdState(null);
  }, [drones.length, activeDroneId]);

  const handleSetActiveDrone = useCallback((id: string) => {
    setActiveDroneId(id);
    setActiveDroneIdState(id);
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300 transition-colors">
            {t('app.backToMap')}
          </Link>
          <h1 className="text-2xl font-bold mt-4 mb-1">{t('settings.title')}</h1>
          <p className="text-gray-500 text-sm">{t('settings.manage')}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded overflow-hidden border border-gray-700 mb-6">
          <button
            onClick={() => setTab('pilots')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'pilots' ? 'bg-blue-600 text-white' : 'bg-[#1a1d27] text-gray-400 hover:text-white'}`}
          >
            👤 Piloti
          </button>
          <button
            onClick={() => setTab('drones')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'drones' ? 'bg-blue-600 text-white' : 'bg-[#1a1d27] text-gray-400 hover:text-white'}`}
          >
            🚁 Drony
          </button>
        </div>

        {/* ── Pilots tab ── */}
        {tab === 'pilots' && (
          <div>
            {pilots.length === 0 && (
              <p className="text-gray-500 text-sm mb-4">{t('settings.noPilots')}</p>
            )}

            {/* Pilot list */}
            <div className="space-y-3">
              {pilots.map((pilot) => (
                <div
                  key={pilot.id}
                  className={`rounded-lg border p-4 flex flex-col gap-2 ${activePilotId === pilot.id ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 bg-[#1a1d27]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {pilot.firstName} {pilot.lastName}
                        {activePilotId === pilot.id && (
                          <span className="ml-2 text-xs bg-blue-600/30 border border-blue-500 text-blue-300 rounded px-1.5 py-0.5">{t('settings.active')}</span>
                        )}
                      </p>
                      {pilot.email && <p className="text-xs text-gray-400 mt-0.5">{pilot.email}</p>}
                      {pilot.uclOperatorId && <p className="text-xs text-gray-500">{t('settings.ucl')}: {pilot.uclOperatorId}</p>}
                      {pilot.licenseNumber && <p className="text-xs text-gray-500">{t('settings.license')}: {pilot.licenseNumber}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {activePilotId !== pilot.id && (
                        <button
                          onClick={() => handleSetActivePilot(pilot.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-700/30 border border-blue-600 text-blue-300 hover:bg-blue-700/50 transition-colors"
                        >
                          Aktivovat
                        </button>
                      )}
                      <button
                        onClick={() => setPilotFormMode({ edit: pilot })}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePilot(pilot.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit form */}
            {pilotFormMode === 'add' && (
              <PilotForm
                initial={BLANK_PILOT}
                onSave={handleSavePilot}
                onCancel={() => setPilotFormMode('none')}
              />
            )}
            {typeof pilotFormMode === 'object' && 'edit' in pilotFormMode && (
              <PilotForm
                initial={pilotFormMode.edit}
                onSave={handleSavePilot}
                onCancel={() => setPilotFormMode('none')}
              />
            )}

            {pilotFormMode === 'none' && (
              <button
                onClick={() => setPilotFormMode('add')}
                className="mt-4 w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
              >
                {t('settings.addPilotButton')}
              </button>
            )}
          </div>
        )}

        {/* ── Drones tab ── */}
        {tab === 'drones' && (
          <div>
            {/* Drone list */}
            <div className="space-y-3">
              {drones.map((drone) => (
                <div
                  key={drone.id}
                  className={`rounded-lg border p-4 flex flex-col gap-2 ${activeDroneId === drone.id ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 bg-[#1a1d27]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {drone.name}
                        {activeDroneId === drone.id && (
                          <span className="ml-2 text-xs bg-blue-600/30 border border-blue-500 text-blue-300 rounded px-1.5 py-0.5">{t('settings.active')}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {drone.manufacturer} · {drone.droneClass} · {drone.weightG} g
                      </p>
                      <p className="text-xs text-gray-500">
                        Baterie: {drone.batteryWh} Wh · Max: {drone.maxAltitudeM} m / {drone.maxSpeedMs} m/s
                      </p>
                      {drone.serialNumber && (
                        <p className="text-xs text-gray-600">S/N: {drone.serialNumber}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {activeDroneId !== drone.id && (
                        <button
                          onClick={() => handleSetActiveDrone(drone.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-700/30 border border-blue-600 text-blue-300 hover:bg-blue-700/50 transition-colors"
                        >
                          Aktivovat
                        </button>
                      )}
                      <button
                        onClick={() => setDroneFormMode({ edit: drone })}
                        className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDrone(drone.id)}
                        disabled={drones.length <= 1}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit form */}
            {droneFormMode === 'add' && (
              <DroneForm
                initial={BLANK_DRONE}
                onSave={handleSaveDrone}
                onCancel={() => setDroneFormMode('none')}
              />
            )}
            {typeof droneFormMode === 'object' && 'edit' in droneFormMode && (
              <DroneForm
                initial={droneFormMode.edit}
                onSave={handleSaveDrone}
                onCancel={() => setDroneFormMode('none')}
              />
            )}

            {droneFormMode === 'none' && (
              <button
                onClick={() => setDroneFormMode('add')}
                className="mt-4 w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
              >
                {t('settings.addDroneButton')}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
