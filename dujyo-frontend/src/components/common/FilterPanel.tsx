import React from 'react';

interface FilterOption {
  type: string;
  dateRange: string;
  amount: string;
}

interface FilterPanelProps {
  options: {
    type: string[];
    dateRange: string[];
    amount: string[];
  };
  selectedFilters: FilterOption;  // Ahora es un objeto FilterOption, no un array de strings
  onFilterSelect: (newFilterOption: FilterOption) => void;  // Función que maneja la actualización del filtro
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ options, selectedFilters, onFilterSelect }) => {
  // Validaciones defensivas
  if (!options || !selectedFilters || !onFilterSelect) {
    return null;
  }

  // Maneja los cambios en los checkboxes
  const handleCheckboxChange = (category: keyof FilterOption, value: string) => {
    // Actualiza el estado de los filtros de acuerdo con la categoría
    onFilterSelect({
      ...selectedFilters,
      [category]: selectedFilters[category] === value ? 'all' : value,  // Alterna entre 'all' y el valor seleccionado
    });
  };

  // Validar que options tenga las propiedades necesarias
  const safeOptions = {
    type: Array.isArray(options.type) ? options.type : [],
    dateRange: Array.isArray(options.dateRange) ? options.dateRange : [],
    amount: Array.isArray(options.amount) ? options.amount : []
  };

  const safeFilters = {
    type: selectedFilters.type || 'all',
    dateRange: selectedFilters.dateRange || 'all',
    amount: selectedFilters.amount || 'all'
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold">Filters</h3>

      {/* Filtrar por tipo */}
      <div>
        <h4 className="text-md font-semibold">Type</h4>
        {safeOptions.type.map((value) => (
          <div key={value}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeFilters.type === value} // Marcar el checkbox si está seleccionado
                onChange={() => handleCheckboxChange('type', value)} // Llamar a la función de cambio de checkbox
                className="form-checkbox"
              />
              <span>{value}</span>
            </label>
          </div>
        ))}
      </div>

      {/* Filtrar por rango de fecha */}
      <div>
        <h4 className="text-md font-semibold">Date Range</h4>
        {safeOptions.dateRange.map((value) => (
          <div key={value}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeFilters.dateRange === value} // Marcar el checkbox si está seleccionado
                onChange={() => handleCheckboxChange('dateRange', value)} // Llamar a la función de cambio de checkbox
                className="form-checkbox"
              />
              <span>{value}</span>
            </label>
          </div>
        ))}
      </div>

      {/* Filtrar por cantidad */}
      <div>
        <h4 className="text-md font-semibold">Amount</h4>
        {safeOptions.amount.map((value) => (
          <div key={value}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={safeFilters.amount === value} // Marcar el checkbox si está seleccionado
                onChange={() => handleCheckboxChange('amount', value)} // Llamar a la función de cambio de checkbox
                className="form-checkbox"
              />
              <span>{value}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
