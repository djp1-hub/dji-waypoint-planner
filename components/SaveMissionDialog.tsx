'use client';

// Modal dialog for entering a mission name before saving
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/languageContext';

interface SaveMissionDialogProps {
  open: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function SaveMissionDialog({ open, onSave, onClose }: SaveMissionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(t('save.defaultName'));
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cancel the focus timer on unmount to prevent setting state on unmounted component
  useEffect(() => {
    return () => clearTimeout(focusTimerRef.current);
  }, []);

  // Focus the input and reset name whenever the dialog opens
  useEffect(() => {
    if (open) {
      setName(t('save.defaultName'));
      // Small timeout so the element is rendered before focusing
      focusTimerRef.current = setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, t]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  if (!open) return null;

  return (
    // Full-screen overlay — click outside = close
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Dialog box — stop click propagation so clicking inside doesn't close */}
      <div
        className="bg-[#1a1d27] border border-gray-700 rounded-xl p-6 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white font-semibold text-base mb-4">{t('save.title')}</h2>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('save.placeholder')}
          className="w-full bg-[#0f1117] text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none mb-5"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-400 bg-[#0f1117] border border-gray-700 rounded-lg hover:text-white transition-colors"
          >
            {t('btn.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
