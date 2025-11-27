import React, { createContext, useContext, useRef, ReactNode } from 'react';

// Tipos de eventos del sistema blockchain
export interface BlockchainEvent {
  type: 'BALANCE_UPDATED' | 'STAKING_SUCCESS' | 'STREAM_EARNED' | 'SWAP_COMPLETED' | 'NFT_PURCHASED' | 'ERROR_OCCURRED';
  data: any;
  timestamp: number;
  source: string; // Componente que emitió el evento
}

// Clase EventBus para manejo centralizado de eventos
class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  private eventHistory: BlockchainEvent[] = [];

  // Emitir evento a todos los listeners registrados
  emit(event: Omit<BlockchainEvent, 'timestamp'>) {
    const fullEvent: BlockchainEvent = {
      ...event,
      timestamp: Date.now()
    };

    console.log(`🔔 [EVENT_BUS] Emitting event: ${event.type}`, fullEvent);
    
    // Agregar al historial
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-50); // Mantener solo los últimos 50
    }

    // Notificar a todos los listeners
    const eventListeners = this.listeners.get(event.type) || [];
    eventListeners.forEach(callback => {
      try {
        callback(fullEvent);
      } catch (error) {
        console.error(`❌ [EVENT_BUS] Error in listener for ${event.type}:`, error);
      }
    });
  }

  // Registrar listener para un tipo de evento
  on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    console.log(`👂 [EVENT_BUS] Registered listener for ${eventType}`);

    // Retornar función de cleanup
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
          console.log(`🔇 [EVENT_BUS] Unregistered listener for ${eventType}`);
        }
      }
    };
  }

  // Obtener historial de eventos (útil para debugging)
  getEventHistory(): BlockchainEvent[] {
    return [...this.eventHistory];
  }

  // Limpiar todos los listeners (útil para cleanup)
  clear() {
    this.listeners.clear();
    this.eventHistory = [];
    console.log(`🧹 [EVENT_BUS] Cleared all listeners and history`);
  }
}

// Contexto React para el EventBus
interface EventBusContextType {
  eventBus: EventBus;
}

const EventBusContext = createContext<EventBusContextType | null>(null);

// Hook para usar el EventBus
export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context.eventBus;
};

// Provider del EventBus
interface EventBusProviderProps {
  children: ReactNode;
}

export const EventBusProvider: React.FC<EventBusProviderProps> = ({ children }) => {
  const eventBusRef = useRef<EventBus>(new EventBus());

  return (
    <EventBusContext.Provider value={{ eventBus: eventBusRef.current }}>
      {children}
    </EventBusContext.Provider>
  );
};

// Hook helper para escuchar eventos específicos
export const useEventListener = (eventType: string, callback: (event: BlockchainEvent) => void, deps: any[] = []) => {
  const eventBus = useEventBus();

  React.useEffect(() => {
    const unsubscribe = eventBus.on(eventType, callback);
    return unsubscribe;
  }, deps);
};

// Hook helper para emitir eventos
export const useEventEmitter = () => {
  const eventBus = useEventBus();
  
  return React.useCallback((event: Omit<BlockchainEvent, 'timestamp'>) => {
    eventBus.emit(event);
  }, [eventBus]);
};
