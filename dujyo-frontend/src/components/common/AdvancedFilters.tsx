import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Search, SlidersHorizontal } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'search';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  value?: any;
}

interface AdvancedFiltersProps {
  filters: FilterOption[];
  onFilterChange: (filters: Record<string, any>) => void;
  className?: string;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ 
  filters, 
  onFilterChange, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach(filter => {
      if (filter.type === 'checkbox') {
        initial[filter.id] = [];
      } else if (filter.type === 'range') {
        initial[filter.id] = { min: filter.min || 0, max: filter.max || 100 };
      } else {
        initial[filter.id] = filter.value || '';
      }
    });
    return initial;
  });

  const handleFilterChange = (filterId: string, value: any) => {
    const newValues = { ...filterValues, [filterId]: value };
    setFilterValues(newValues);
    onFilterChange(newValues);
  };

  const clearFilters = () => {
    const cleared: Record<string, any> = {};
    filters.forEach(filter => {
      if (filter.type === 'checkbox') {
        cleared[filter.id] = [];
      } else if (filter.type === 'range') {
        cleared[filter.id] = { min: filter.min || 0, max: filter.max || 100 };
      } else {
        cleared[filter.id] = '';
      }
    });
    setFilterValues(cleared);
    onFilterChange(cleared);
  };

  const activeFiltersCount = Object.values(filterValues).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object' && v !== null) {
      return v.min !== (filters.find(f => f.id === Object.keys(filterValues).find(k => filterValues[k] === v))?.min || 0) ||
             v.max !== (filters.find(f => f.id === Object.keys(filterValues).find(k => filterValues[k] === v))?.max || 100);
    }
    return v !== '' && v !== null && v !== undefined;
  }).length;

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-white transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <SlidersHorizontal size={18} />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="absolute top-full mt-2 right-0 w-80 bg-gray-800 border border-gray-700 rounded-xl p-6 z-50 shadow-2xl"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Filter size={20} className="text-amber-400" />
                  Filters
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {filters.map((filter) => (
                  <div key={filter.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {filter.label}
                    </label>
                    
                    {filter.type === 'search' && (
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={filterValues[filter.id] || ''}
                          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                          placeholder={`Search ${filter.label.toLowerCase()}...`}
                        />
                      </div>
                    )}

                    {filter.type === 'checkbox' && filter.options && (
                      <div className="space-y-2">
                        {filter.options.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white transition-colors">
                            <input
                              type="checkbox"
                              checked={(filterValues[filter.id] || []).includes(option.value)}
                              onChange={(e) => {
                                const current = filterValues[filter.id] || [];
                                const newValue = e.target.checked
                                  ? [...current, option.value]
                                  : current.filter((v: string) => v !== option.value);
                                handleFilterChange(filter.id, newValue);
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {filter.type === 'radio' && filter.options && (
                      <div className="space-y-2">
                        {filter.options.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white transition-colors">
                            <input
                              type="radio"
                              name={filter.id}
                              value={option.value}
                              checked={filterValues[filter.id] === option.value}
                              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                              className="w-4 h-4 border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {filter.type === 'range' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{filter.min || 0}</span>
                          <span>{filter.max || 100}</span>
                        </div>
                        <input
                          type="range"
                          min={filter.min || 0}
                          max={filter.max || 100}
                          value={filterValues[filter.id]?.max || filter.max || 100}
                          onChange={(e) => handleFilterChange(filter.id, {
                            min: filterValues[filter.id]?.min || filter.min || 0,
                            max: parseInt(e.target.value)
                          })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 w-full py-2 text-sm text-amber-400 hover:text-amber-300 border border-amber-500/50 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilters;

