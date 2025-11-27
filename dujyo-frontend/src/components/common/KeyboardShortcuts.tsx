import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  category?: string;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  showHelp?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ shortcuts, showHelp = true }) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle help modal with '?' key
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setShowModal(prev => !prev);
        return;
      }

      // Execute shortcuts
      shortcuts.forEach(shortcut => {
        const keys = shortcut.key.toLowerCase().split('+');
        const ctrl = keys.includes('ctrl') || keys.includes('cmd');
        const shift = keys.includes('shift');
        const alt = keys.includes('alt');
        const mainKey = keys[keys.length - 1];

        if (
          (ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey) &&
          (shift ? e.shiftKey : !e.shiftKey) &&
          (alt ? e.altKey : !e.altKey) &&
          e.key.toLowerCase() === mainKey
        ) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const formatKey = (key: string) => {
    const parts = key.split('+');
    return parts.map(part => {
      if (part === 'ctrl' || part === 'cmd') return '⌘';
      if (part === 'shift') return '⇧';
      if (part === 'alt') return '⌥';
      return part.toUpperCase();
    }).join(' + ');
  };

  if (!showHelp) return null;

  return (
    <>
      {/* Help button */}
      <motion.button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-full text-white shadow-lg backdrop-blur-sm"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard size={20} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            >
              <motion.div
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Keyboard size={24} className="text-amber-400" />
                    Keyboard Shortcuts
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-amber-400 mb-3">{category}</h3>
                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut, index) => (
                          <motion.div
                            key={shortcut.key}
                            className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <span className="text-gray-300">{shortcut.description}</span>
                            <kbd className="px-3 py-1 bg-gray-700 text-amber-400 rounded font-mono text-sm border border-gray-600">
                              {formatKey(shortcut.key)}
                            </kbd>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
                  Press <kbd className="px-2 py-1 bg-gray-700 rounded text-amber-400">?</kbd> to toggle this help
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default KeyboardShortcuts;

