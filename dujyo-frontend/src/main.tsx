import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // La extensión .tsx puede omitirse
import './index.css';

// Importar Buffer y hacerlo global
import { Buffer } from 'buffer';

if (!window.Buffer) {
  window.Buffer = Buffer; // Hacer que Buffer esté disponible globalmente
}

// 🔍 DEBUG: Override temporal de Array.prototype.map para capturar errores de .type
// TEMPORALMENTE ACTIVADO EN PRODUCCIÓN PARA DEBUGGING
if (true) { // Cambiar a process.env.NODE_ENV === 'development' después de encontrar el bug
  const originalMap = Array.prototype.map;
  Array.prototype.map = function(callback: any, thisArg?: any) {
    try {
      // Verificar si el array contiene undefined/null antes de mapear
      const hasUndefined = this.some((item: any) => item === undefined || item === null);
      if (hasUndefined) {
        console.warn('🔍 DEBUG Array.map - Array contains undefined/null:', {
          length: this.length,
          undefinedCount: this.filter((item: any) => item === undefined).length,
          nullCount: this.filter((item: any) => item === null).length,
          sample: this.slice(0, 5)
        });
      }
      
      return originalMap.call(this, function(item: any, index: number, array: any[]) {
        // Si el item es undefined/null, loggear y retornar null
        if (item === undefined || item === null) {
          console.error('🔍 DEBUG Array.map - UNDEFINED/NULL ITEM DETECTED:', {
            index,
            arrayLength: array.length,
            arraySample: array.slice(0, 5),
            stackTrace: new Error().stack
          });
          return null;
        }
        
        // 🔍 DETECTAR SI EL ITEM ES UN ARRAY (resultado de Object.entries)
        // Si el item es un array de 2 elementos y el callback intenta acceder a .type,
        // probablemente es Object.entries() mal usado
        if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'string') {
          console.warn('🔍 DEBUG Array.map - DETECTED Object.entries() RESULT:', {
            index,
            item,
            itemIsArray: true,
            itemLength: item.length,
            firstElement: item[0],
            secondElement: item[1],
            arrayLength: array.length,
            arraySample: array.slice(0, 5),
            message: 'This looks like Object.entries() result. Make sure to destructure: ([key, value]) => ...'
          });
        }
        
        // Intentar ejecutar el callback
        try {
          return callback(item, index, array);
        } catch (error: any) {
          // Si el error es sobre .type, loggear información detallada
          if (error?.message?.includes('type') || error?.message?.includes('Cannot read properties')) {
            console.error('🔍 DEBUG Array.map - ERROR ACCESSING .type:', {
              error: error.message,
              item,
              itemType: typeof item,
              itemIsArray: Array.isArray(item),
              itemKeys: item && typeof item === 'object' && !Array.isArray(item) ? Object.keys(item) : 'N/A',
              hasType: item && typeof item === 'object' && !Array.isArray(item) ? 'type' in item : false,
              typeValue: item && typeof item === 'object' && !Array.isArray(item) && 'type' in item ? item.type : 'N/A',
              index,
              arrayLength: array.length,
              arraySample: array.slice(0, 5),
              stackTrace: error.stack,
              suggestion: Array.isArray(item) && item.length === 2 
                ? 'This is likely Object.entries() result. Use destructuring: ([key, value]) => value.type'
                : 'Check if item is undefined or null before accessing .type'
            });
          }
          throw error;
        }
      }, thisArg);
    } catch (error) {
      console.error('🔍 DEBUG Array.map - FATAL ERROR:', error);
      throw error;
    }
  };
  
  console.log('🔍 DEBUG: Array.prototype.map override activated for debugging');
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error('No se encontró el contenedor #root');
}
