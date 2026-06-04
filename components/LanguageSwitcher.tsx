'use client';

import { useLanguage } from '@/lib/languageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => setLanguage('cs')}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
          language === 'cs'
            ? 'bg-orange-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="Čeština"
      >
        🇨🇿 CZ
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-orange-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="English"
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
