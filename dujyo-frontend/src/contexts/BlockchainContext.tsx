import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useEventBus } from './EventBusContext';
import { Blockchain } from '../blockchain/Blockchain';
import { ContentManager } from '../content/ContentManager';
import { RoyaltyContract } from '../contracts/RoyaltyContract';
import { LicenseContract } from '../contracts/LicenseContract';
import { NFTContract } from '../contracts/NFTContract';
import { getApiBaseUrl } from '../utils/apiConfig';
import { 
  initializeBlockchainConnection, 
  getAccountBalance, 
  getBlockHeight,
  addTransaction,
  checkSystemHealth,
  getTransactions
} from '../services/api';

// Define tipos para los pallets
interface BalancesPallet {
  getBalance: (account: string) => Promise<number>;
  getTransactionHistory: (account: string) => Promise<any[]>; // Ajusta el tipo según lo necesario
}

interface StakingPallet {
  stakeAmount: (amount: number) => Promise<void>;
  getStakingHistory: (account: string) => Promise<any[]>;
}

interface NFTPallet {
  getTokensByOwner(account: string | null): unknown;
  transferNFT(account: string, toAddress: string, id: string): unknown;
  getNFTs: (account: string) => Promise<any[]>;
  mintNFT: (data: any) => Promise<void>;
}

// Define tipos para el contexto
interface BlockchainContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  blockchain: Blockchain;
  account: string | null;
  setAccount: React.Dispatch<React.SetStateAction<string | null>>;
  contentManager: ContentManager;
  royaltyContract: RoyaltyContract;
  licenseContract: LicenseContract;
  nftContract: NFTContract;
  balancesPallet: BalancesPallet;
  stakingPallet: StakingPallet;
  nftPallet: NFTPallet;
  // Real-time update functions
  refreshBalance: () => Promise<void>;
  lastBalanceUpdate: number;
  currentBalance: number;
  tokenBalance: {
    dyo: number;
    dys: number;
    staked: number;
    total: number;
  };
}

const BlockchainContext = createContext<BlockchainContextType | null>(null);

interface BlockchainProviderProps {
  children: ReactNode;
}

export function BlockchainProvider({ children }: BlockchainProviderProps): JSX.Element {
  const [blockchain] = useState(() => new Blockchain());
  const [account, setAccount] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  // Real-time balance state
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<number>(Date.now());
  
  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<{
    dyo: number;
    dys: number;
    staked: number;
    total: number;
  }>({
    dyo: 0,
    dys: 0,
    staked: 0,
    total: 0
  });
  
  // Event Bus para comunicación global
  const eventBus = useEventBus();

  // Usar useMemo para evitar recrear instancias en cada render
  const contentManager = useMemo(() => new ContentManager(blockchain), [blockchain]);
  const royaltyContract = useMemo(() => new RoyaltyContract(blockchain), [blockchain]);
  const licenseContract = useMemo(() => new LicenseContract(blockchain), [blockchain]);
  const nftContract = useMemo(() => new NFTContract(blockchain), [blockchain]);

  // Define las funciones de los pallets conectadas a la API real
  const balancesPallet: BalancesPallet = {
    getBalance: async (account: string) => {
      try {
        // Get JWT token for authentication
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          console.error('⚠️ No authentication token found');
          return 0;
        }

        // Fetch REAL balance from backend
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/balance-detail/${account}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ Failed to fetch balance: ${response.status}`);
          return 0;
        }

        const data = await response.json();
        const realBalance = data.available_dyo || 0;
        
        // Update token balance state
        setTokenBalance({
          dyo: data.available_dyo || 0,
          dys: data.dys || 0,
          staked: data.staked || 0,
          total: data.total || 0
        });
        
        return realBalance;
      } catch (error) {
        console.error('Error obteniendo balance REAL:', error);
        return 0;
      }
    },
    getTransactionHistory: async (account: string) => {
      try {
        console.log(`Obteniendo historial de transacciones REALES para: ${account}`);
        
        // Get JWT token for authentication
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Fetch real transactions from backend
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/transactions/${account}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.status}`);
        }

        const data = await response.json();
        console.log('Transacciones reales obtenidas:', data);

        // Transform to frontend format with robust validation
        const realTransactions = (data.transactions || [])
          .filter((tx: any): tx is NonNullable<typeof tx> => {
            // Eliminar null/undefined antes de mapear
            if (!tx || typeof tx !== 'object') return false;
            return true;
          })
          .map((tx: any) => {
            // Validación adicional defensiva
            if (!tx || typeof tx !== 'object') {
              console.warn('🔍 DEBUG BlockchainContext - Invalid tx in map:', tx);
              return null;
            }
            
            // Asegurar que type siempre esté definido
            const txType = tx.from === account ? 'sent' : 'received';
            
            return {
              hash: tx.hash || tx.id || '',
              type: txType,
              amount: parseFloat(tx.amount) || 0,
              timestamp: tx.timestamp || tx.created_at || Date.now(),
              from: tx.from || '',
              to: tx.to || '',
              status: tx.status || 'confirmed',
              gasUsed: tx.gas_used || 0,
              blockNumber: tx.block_number || 0
            };
          })
          .filter((tx): tx is NonNullable<typeof tx> => tx != null && tx !== undefined && tx.type != null);

        console.log(`${realTransactions.length} transacciones reales cargadas`);
        return realTransactions;
      } catch (error) {
        console.error('Error obteniendo historial real:', error);
        // Return empty array instead of mock data
        return [];
      }
    },
  };

  const stakingPallet: StakingPallet = {
    stakeAmount: async (amount: number) => {
      try {
        console.log(`Ejecutando stake REAL de: ${amount} DYO`);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/stake`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount })
        });

        if (!response.ok) {
          throw new Error(`Stake failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Stake real ejecutado:', result);
        return result;
      } catch (error) {
        console.error('Error en stake real:', error);
        throw error;
      }
    },
    getStakingHistory: async (account: string) => {
      try {
        console.log(`Obteniendo historial de staking REAL para: ${account}`);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/staking/history/${account}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch staking history: ${response.status}`);
        }

        const data = await response.json();
        console.log('Historial de staking real obtenido:', data);
        return data.staking_events || [];
      } catch (error) {
        console.error('Error obteniendo historial de staking real:', error);
        return [];
      }
    },
  };

  const nftPallet: NFTPallet = {
    getNFTs: async (account: string) => {
      try {
        console.log(`Obteniendo NFTs REALES para la cuenta: ${account}`);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/nfts/${account}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch NFTs: ${response.status}`);
        }

        const data = await response.json();
        console.log('NFTs reales obtenidos:', data);
        return data.nfts || [];
      } catch (error) {
        console.error('Error obteniendo NFTs reales:', error);
        return [];
      }
    },
    mintNFT: async (data: any) => {
      try {
        console.log(`Minteando NFT REAL con datos:`, data);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/nfts/mint`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`NFT mint failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('NFT real minteado:', result);
        return result;
      } catch (error) {
        console.error('Error minteando NFT real:', error);
        throw error;
      }
    },
    getTokensByOwner: async (account: string | null) => {
      try {
        if (!account) return [];
        console.log(`Obteniendo tokens REALES para la cuenta: ${account}`);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Note: Using tokens endpoint (may need to be updated to /api/v1/nfts/{address})
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/tokens/${account}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tokens reales obtenidos:', data);
        return data.tokens || [];
      } catch (error) {
        console.error('Error obteniendo tokens reales:', error);
        console.error('Error obteniendo tokens reales:', error);
        return [];
      }
    },
    transferNFT: async (account: string, toAddress: string, id: string) => {
      try {
        console.log(`Transfiriendo NFT ${id} de ${account} a ${toAddress}`);
        
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/nfts/transfer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nft_id: id,
            to_address: toAddress
          })
        });

        if (!response.ok) {
          throw new Error(`NFT transfer failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('NFT transferido exitosamente:', result);
        return result;
      } catch (error) {
        console.error('Error transfiriendo NFT:', error);
        throw error;
      }
    }
  };

  // Real-time balance refresh function
  const refreshBalance = useCallback(async () => {
    if (!account) return;
    
    try {
      const newBalance = await balancesPallet.getBalance(account);
      
      // Solo emitir evento si el balance cambió significativamente (más de 10 centavos)
      const balanceChanged = Math.abs(newBalance - currentBalance) > 10;
      
      if (balanceChanged) {
        setCurrentBalance(newBalance);
        setLastBalanceUpdate(Date.now());
        
        // Emitir evento de balance actualizado
        eventBus.emit({
          type: 'BALANCE_UPDATED',
          data: { 
            balance: newBalance, 
            account, 
            previousBalance: currentBalance 
          },
          source: 'BlockchainContext'
        });
        
        // Solo log si el cambio es significativo (más de 100 DYO = 10000 centavos)
        if (Math.abs(newBalance - currentBalance) > 10000) {
          console.log(`💰 Balance: ${(currentBalance/100).toFixed(2)} → ${(newBalance/100).toFixed(2)} DYO`);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing balance:', error);
      
      // Emitir evento de error
      eventBus.emit({
        type: 'ERROR_OCCURRED',
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error', 
          context: 'balance_refresh',
          account 
        },
        source: 'BlockchainContext'
      });
    }
  }, [account, balancesPallet, currentBalance, eventBus]);

  // ✅ NO AUTO-POLLING - Balance se actualiza solo cuando se solicita explícitamente
  // (stream-earn, swap, stake, etc)
  // Esto elimina el blinking y el spam de logs en consola

  useEffect(() => {
    if (isInitialized) return; // Evitar múltiples inicializaciones
    
    const init = async () => {
      try {
        // ✅ VERIFICAR SI LA WALLET FUE DESCONECTADA MANUALMENTE
        const wasDisconnected = localStorage.getItem('dujyo_wallet_connected') === 'false';
        if (wasDisconnected) {
          console.log('🔌 Wallet desconectada manualmente. No inicializando blockchain.');
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        console.log('Inicializando conexión con blockchain real...');
        
        // Verificar conexión con el backend
        const isConnected = await initializeBlockchainConnection();
        if (!isConnected) {
          console.error('No se pudo conectar con el backend');
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }

        // Verificar salud del sistema
        const health = await checkSystemHealth();
        console.log('Estado del sistema:', health);

        // Conectar a la blockchain local
        await blockchain.connect();
        
        // ✅ USAR CUENTA DE WALLET SI ESTÁ DISPONIBLE
        const walletAccount = localStorage.getItem('dujyo_wallet_account');
        const xwaveWallet = localStorage.getItem('xwave_wallet');
        const dujyoWallet = localStorage.getItem('dujyo_wallet');
        
        // Try multiple sources for wallet address
        let workingAccount = walletAccount;
        if (!workingAccount && xwaveWallet) {
          try {
            workingAccount = JSON.parse(xwaveWallet).address;
          } catch (e) {
            console.warn('Error parsing xwave_wallet:', e);
          }
        }
        if (!workingAccount && dujyoWallet) {
          try {
            workingAccount = JSON.parse(dujyoWallet).address;
          } catch (e) {
            console.warn('Error parsing dujyo_wallet:', e);
          }
        }
        
        if (workingAccount) {
          setAccount(workingAccount);
          localStorage.setItem('userAccount', workingAccount);
          setIsAuthenticated(true);
          console.log('✅ Usando cuenta que funciona:', workingAccount);
        } else {
          console.warn('⚠️ No se encontró wallet address en localStorage');
        }
        
        // NO MORE DEMO BALANCE - Only use REAL balances from backend
        console.log('✅ Sistema configurado para usar SOLO balances reales del backend');
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error inicializando blockchain:', error);
        setIsAuthenticated(false);
        setIsInitialized(true);
      }
    };

    init();
  }, [isInitialized]);

  // ✅ ESCUCHAR CAMBIOS EN EL ESTADO DE WALLET (para sincronizar con useWallet)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dujyo_wallet_connected') {
        if (e.newValue === 'false') {
          // Wallet fue desconectada, limpiar estado
          setAccount(null);
          setIsAuthenticated(false);
          console.log('🔌 BlockchainContext: Wallet desconectada, limpiando estado');
        } else if (e.newValue === 'true') {
          // Wallet fue conectada, actualizar cuenta
          const walletAccount = localStorage.getItem('dujyo_wallet_account');
          if (walletAccount) {
            setAccount(walletAccount);
            setIsAuthenticated(true);
            console.log('✅ BlockchainContext: Wallet reconectada:', walletAccount);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios en el mismo tab usando un evento personalizado
    const handleWalletChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'wallet_disconnected') {
        setAccount(null);
        setIsAuthenticated(false);
        console.log('🔌 BlockchainContext: Wallet desconectada (evento)');
      } else if (customEvent.detail?.type === 'wallet_connected') {
        const walletAccount = customEvent.detail?.account || localStorage.getItem('dujyo_wallet_account');
        if (walletAccount) {
          setAccount(walletAccount);
          setIsAuthenticated(true);
          console.log('✅ BlockchainContext: Wallet conectada (evento):', walletAccount);
        }
      }
    };

    window.addEventListener('dujyo:wallet_changed', handleWalletChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dujyo:wallet_changed', handleWalletChange as EventListener);
    };
  }, []);

  const value: BlockchainContextType = {
    blockchain,
    account,
    setAccount,
    contentManager,
    royaltyContract,
    licenseContract,
    nftContract,
    balancesPallet,
    stakingPallet,
    nftPallet,
    isAuthenticated,
    setIsAuthenticated,
    // Real-time update functions
    refreshBalance,
    lastBalanceUpdate,
    currentBalance,
    tokenBalance,
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain(): BlockchainContextType {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
}
