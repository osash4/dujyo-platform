import React, { createContext, useEffect, useState, useCallback, useContext, useRef } from 'react';
import { getWebSocketUrl } from '../utils/apiConfig';

interface WebSocketContextProps {
  ws: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  messages: string[];
  connectionStatus: string;
  loading: boolean;
  error: string | null;
}

export const WebSocketContext = createContext<WebSocketContextProps>({
  ws: null,
  isConnected: false,
  sendMessage: () => {},
  messages: [],
  connectionStatus: 'Disconnected',
  loading: true,
  error: null,
});

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    // Don't reconnect if already connected or if max attempts reached
    if (wsRef.current?.readyState === WebSocket.OPEN || reconnectAttemptsRef.current >= 3) {
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Get WebSocket URL based on environment (localhost or ngrok)
    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('Connected');
        setLoading(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };
      
      websocket.onmessage = (event) => {
        console.log('Message received:', event.data);
        setMessages(prev => [...prev, event.data]);
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setLoading(false);
        wsRef.current = null;
        
        // Try to reconnect after 5 seconds, max 3 attempts
        // Only reconnect if it wasn't a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        } else if (reconnectAttemptsRef.current >= 3) {
          console.log('WebSocket: Max reconnection attempts reached. WebSocket disabled.');
          setConnectionStatus('WebSocket not available (continuing without real-time updates)');
        }
      };
      
      websocket.onerror = (error) => {
        console.error('Error in WebSocket:', error);
        setError('Error connecting WebSocket');
        setLoading(false);
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Could not connect to WebSocket');
      setLoading(false);
    }
  }, []);

  // Connect when the component mounts and clean up the connection when it unmounts
  useEffect(() => {
    // Only connect if not already connected
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
    
    return () => {
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Close WebSocket connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket...');
        wsRef.current.close(1000, 'Component dismounted');
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Función para enviar mensajes a través del WebSocket
  const sendMessage = useCallback(
    (message: string) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(message);
        console.log('Message sent:', message);
      } else {
        console.warn('Cannot send message, WebSocket not connected.');
      }
    },
    [ws]
  );

  return (
    <WebSocketContext.Provider
      value={{
        ws,
        isConnected,
        sendMessage,
        messages,
        connectionStatus,
        loading,
        error,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
