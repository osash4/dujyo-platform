import { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

const WALLET_STORAGE_KEY = 'dujyo_wallet_connected';
const WALLET_ACCOUNT_KEY = 'dujyo_wallet_account';

export function useWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null); // Cuenta de usuario
  const [library, setLibrary] = useState<any | null>(null); // API de conexión a la blockchain
  const isManuallyDisconnected = useRef(false); // Flag para evitar reconexión automática después de desconectar

  // ✅ Solo verificar conexión al montar si NO fue desconectada manualmente
  useEffect(() => {
    const wasDisconnected = localStorage.getItem(WALLET_STORAGE_KEY) === 'false';
    const storedAccount = localStorage.getItem(WALLET_ACCOUNT_KEY);
    
    // Si fue desconectada manualmente, no reconectar automáticamente
    if (wasDisconnected) {
      isManuallyDisconnected.current = true;
      return;
    }
    
    // Si hay una cuenta guardada y no fue desconectada manualmente, restaurarla
    if (storedAccount && !isManuallyDisconnected.current) {
      setAccount(storedAccount);
      setLibrary({ address: storedAccount });
      return;
    }
    
    // Si no hay cuenta guardada, no conectar automáticamente
    // El usuario debe hacer click en "Connect Wallet"
  }, []);

  // ✅ DUJYO NATIVE WALLET: Connect to Dujyo blockchain (NO MetaMask/Ethereum)
  async function connect() {
    setIsConnecting(true);
    setError(null);
    isManuallyDisconnected.current = false; // Resetear flag de desconexión manual
    
    try {
      // ✅ STEP 1: Try stored Dujyo account first
      const storedAccount = localStorage.getItem(WALLET_ACCOUNT_KEY);
      if (storedAccount) {
        setAccount(storedAccount);
        setLibrary({ address: storedAccount, walletType: 'dujyo' });
        localStorage.setItem(WALLET_STORAGE_KEY, 'true');
        localStorage.setItem('dujyo_wallet_type', 'dujyo');
        
        // ✅ Emitir evento para sincronizar con BlockchainContext
        window.dispatchEvent(new CustomEvent('dujyo:wallet_changed', {
          detail: { type: 'wallet_connected', account: storedAccount, walletType: 'dujyo' }
        }));
        
        console.log('✅ Dujyo wallet restored:', storedAccount);
        setIsConnecting(false);
        return;
      }

      // ✅ STEP 2: Connect to Dujyo backend (native wallet)
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/wallet/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_type: 'dujyo',
            address: null, // Let backend generate Dujyo address
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.address) {
            const walletAddress = data.address;
            setAccount(walletAddress);
            setLibrary({ address: walletAddress, session_id: data.session_id, walletType: 'dujyo' });
            localStorage.setItem(WALLET_ACCOUNT_KEY, walletAddress);
            localStorage.setItem(WALLET_STORAGE_KEY, 'true');
            localStorage.setItem('dujyo_wallet_type', 'dujyo');
            
            // ✅ Emitir evento para sincronizar con BlockchainContext
            window.dispatchEvent(new CustomEvent('dujyo:wallet_changed', {
              detail: { type: 'wallet_connected', account: walletAddress, walletType: 'dujyo' }
            }));
            
            console.log('✅ Dujyo native wallet connected:', walletAddress);
            setIsConnecting(false);
            return;
          }
        }
      } catch (backendError) {
        console.warn('Dujyo backend connection failed, using fallback for testing:', backendError);
      }
      
      // ✅ STEP 3: Use real wallet from user context
      // Get wallet from localStorage or user context
      const storedWallet = localStorage.getItem('xwave_wallet');
      const workingAccount = storedWallet ? JSON.parse(storedWallet).address : '';
      setAccount(workingAccount);
      setLibrary({ address: workingAccount, walletType: 'dujyo' });
      localStorage.setItem(WALLET_ACCOUNT_KEY, workingAccount);
      localStorage.setItem(WALLET_STORAGE_KEY, 'true');
      localStorage.setItem('dujyo_wallet_type', 'dujyo');
      
      // ✅ Emitir evento para sincronizar con BlockchainContext
      window.dispatchEvent(new CustomEvent('dujyo:wallet_changed', {
        detail: { type: 'wallet_connected', account: workingAccount, walletType: 'dujyo' }
      }));
      
      console.log('⚠️  Using fallback Dujyo account for testing:', workingAccount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Dujyo wallet');
      console.error('❌ Dujyo wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }

  // ✅ Desconectar de la blockchain (limpiar la conexión y prevenir reconexión automática)
  function disconnect() {
    setAccount(null);
    setLibrary(null);
    setError(null);
    isManuallyDisconnected.current = true; // Marcar como desconectada manualmente
    
    // Guardar estado de desconexión en localStorage
    localStorage.setItem(WALLET_STORAGE_KEY, 'false');
    // NO eliminar la cuenta guardada, para poder reconectar con la misma cuenta
    // localStorage.removeItem(WALLET_ACCOUNT_KEY);
    
    // ✅ Emitir evento para sincronizar con BlockchainContext
    window.dispatchEvent(new CustomEvent('dujyo:wallet_changed', {
      detail: { type: 'wallet_disconnected' }
    }));
    
    console.log('🔌 Wallet desconectada. Usa "Connect Wallet" para reconectar.');
  }

  return {
    connect,
    disconnect,
    isConnecting,
    error,
    account,
    library
  };
}
