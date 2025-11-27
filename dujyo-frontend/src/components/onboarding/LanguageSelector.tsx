import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation, Language } from '../../utils/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface LanguageSelectorProps {
  position?: 'header' | 'sidebar';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ position = 'header' }) => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  if (position === 'sidebar') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{currentLang.flag} {currentLang.name}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                    language === lang.code ? 'bg-purple-600/30 text-purple-400' : 'text-gray-300'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Header position (icon button)
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
        title={`Language: ${currentLang.name}`}
      >
        <Globe className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                    language === lang.code ? 'bg-purple-600/30 text-purple-400' : 'text-gray-300'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

