//! Custodial Wallet System for Dujyo Web2.5 Strategy
//! 
//! This module provides a seamless Web2.5 experience:
//! - Automatic wallet generation for users
//! - Backend-signed transactions (Dujyo native blockchain)
//! - Social login integration
//! - Recovery system with email/phone
//! - Multi-factor authentication
//! 
//! ✅ NOTE: Dujyo uses its own blockchain, NOT Ethereum
//! NO ethers.js or MetaMask integration needed

import { v4 as uuidv4 } from 'uuid';

// Types
export interface CustodialWallet {
  id: string;
  userId: string;
  address: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
  recoveryMethods: RecoveryMethod[];
  mfaEnabled: boolean;
}

export interface RecoveryMethod {
  type: 'email' | 'phone' | 'social';
  value: string;
  verified: boolean;
  createdAt: Date;
}

export interface SocialLoginProvider {
  name: 'google' | 'facebook' | 'twitter' | 'discord';
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface TransactionRequest {
  to: string;
  amount: string;
  token: 'DYO' | 'DYS';
  memo?: string;
  mfaCode?: string;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  requiresMfa?: boolean;
}

export interface WalletBalance {
  dyo: string;
  dys: string;
  staked: string;
  total: string;
}

// Configuration
const CUSTODIAL_CONFIG = {
  API_BASE_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8083',
  ENCRYPTION_KEY: 'dujyo-custodial-2024', // In production, this should be user-specific
  MFA_ISSUER: 'Dujyo',
  RECOVERY_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
};

// Custodial Wallet Service
export class CustodialWalletService {
  private static instance: CustodialWalletService;
  private currentWallet: CustodialWallet | null = null;
  private authToken: string | null = null;

  private constructor() {}

  public static getInstance(): CustodialWalletService {
    if (!CustodialWalletService.instance) {
      CustodialWalletService.instance = new CustodialWalletService();
    }
    return CustodialWalletService.instance;
  }

  // Authentication Methods
  async authenticateWithSocial(provider: SocialLoginProvider): Promise<{ success: boolean; wallet?: CustodialWallet; error?: string }> {
    try {
      console.log(`🔐 Authenticating with ${provider.name}:`, provider.email);

      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/auth/social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider.name,
          providerId: provider.id,
          email: provider.email,
          name: provider.name,
          avatar: provider.avatar,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.authToken = result.token;
        this.currentWallet = result.wallet;
        
        // Store in localStorage for persistence
        localStorage.setItem('dujyo_auth_token', result.token);
        localStorage.setItem('dujyo_wallet', JSON.stringify(result.wallet));

        console.log('✅ Social authentication successful');
        return { success: true, wallet: result.wallet };
      } else {
        console.error(' Social authentication failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Social authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async authenticateWithEmail(email: string, password: string): Promise<{ success: boolean; wallet?: CustodialWallet; error?: string }> {
    try {
      console.log(`🔐 Authenticating with email:`, email);

      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/auth/email-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        this.authToken = result.token;
        this.currentWallet = result.wallet;
        
        localStorage.setItem('dujyo_auth_token', result.token);
        localStorage.setItem('dujyo_wallet', JSON.stringify(result.wallet));

        console.log('✅ Email authentication successful');
        return { success: true, wallet: result.wallet };
      } else {
        console.error('❌ Email authentication failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Email authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async registerWithEmail(email: string, password: string, name: string): Promise<{ success: boolean; wallet?: CustodialWallet; error?: string }> {
    try {
      console.log(`📝 Registering new user:`, email);

      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const result = await response.json();

      if (result.success) {
        this.authToken = result.token;
        this.currentWallet = result.wallet;
        
        localStorage.setItem('dujyo_auth_token', result.token);
        localStorage.setItem('dujyo_wallet', JSON.stringify(result.wallet));

        console.log('✅ Registration successful');
        return { success: true, wallet: result.wallet };
      } else {
        console.error('❌ Registration failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  // Wallet Management
  async getCurrentWallet(): Promise<CustodialWallet | null> {
    if (this.currentWallet) {
      return this.currentWallet;
    }

    // Try to restore from localStorage
    const storedWallet = localStorage.getItem('dujyo_wallet');
    const storedToken = localStorage.getItem('dujyo_auth_token');

    if (storedWallet && storedToken) {
      try {
        this.currentWallet = JSON.parse(storedWallet);
        this.authToken = storedToken;
        return this.currentWallet;
      } catch (error) {
        console.error('❌ Failed to restore wallet from storage:', error);
        this.logout();
      }
    }

    return null;
  }

  async getWalletBalance(): Promise<WalletBalance> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/balance/${wallet.address}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const result = await response.json();
      return result.balance;
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      throw error;
    }
  }

  async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      console.log('💸 Sending transaction:', request);

      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          from: wallet.address,
          to: request.to,
          amount: request.amount,
          token: request.token,
          memo: request.memo,
          mfaCode: request.mfaCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Transaction successful:', result.txHash);
        return { success: true, txHash: result.txHash };
      } else if (result.requiresMfa) {
        console.log('🔐 MFA required');
        return { success: false, requiresMfa: true, error: 'MFA required' };
      } else {
        console.error('❌ Transaction failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Transaction error:', error);
      return { success: false, error: 'Transaction failed' };
    }
  }

  // Recovery Methods
  async addRecoveryMethod(type: 'email' | 'phone', value: string): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/recovery/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ type, value }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('❌ Failed to add recovery method:', error);
      return { success: false, error: 'Failed to add recovery method' };
    }
  }

  async verifyRecoveryMethod(type: 'email' | 'phone', value: string, code: string): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/recovery/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ type, value, code }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('❌ Failed to verify recovery method:', error);
      return { success: false, error: 'Failed to verify recovery method' };
    }
  }

  async initiateRecovery(type: 'email' | 'phone', value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/recovery/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, value }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('❌ Failed to initiate recovery:', error);
      return { success: false, error: 'Failed to initiate recovery' };
    }
  }

  async completeRecovery(type: 'email' | 'phone', value: string, code: string, newPassword: string): Promise<{ success: boolean; wallet?: CustodialWallet; error?: string }> {
    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/recovery/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, value, code, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        this.authToken = result.token;
        this.currentWallet = result.wallet;
        
        localStorage.setItem('dujyo_auth_token', result.token);
        localStorage.setItem('dujyo_wallet', JSON.stringify(result.wallet));

        return { success: true, wallet: result.wallet };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Failed to complete recovery:', error);
      return { success: false, error: 'Failed to complete recovery' };
    }
  }

  // MFA Methods
  async enableMFA(): Promise<{ success: boolean; qrCode?: string; secret?: string; error?: string }> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/mfa/enable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const result = await response.json();
      return { success: result.success, qrCode: result.qrCode, secret: result.secret, error: result.error };
    } catch (error) {
      console.error('❌ Failed to enable MFA:', error);
      return { success: false, error: 'Failed to enable MFA' };
    }
  }

  async verifyMFA(code: string): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('❌ Failed to verify MFA:', error);
      return { success: false, error: 'Failed to verify MFA' };
    }
  }

  async disableMFA(password: string): Promise<{ success: boolean; error?: string }> {
    const wallet = await this.getCurrentWallet();
    if (!wallet || !this.authToken) {
      throw new Error('No authenticated wallet');
    }

    try {
      const response = await fetch(`${CUSTODIAL_CONFIG.API_BASE_URL}/custodial/mfa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('❌ Failed to disable MFA:', error);
      return { success: false, error: 'Failed to disable MFA' };
    }
  }

  // Utility Methods
  async logout(): Promise<void> {
    this.currentWallet = null;
    this.authToken = null;
    localStorage.removeItem('dujyo_auth_token');
    localStorage.removeItem('dujyo_wallet');
    console.log('👋 Logged out');
  }

  isAuthenticated(): boolean {
    return this.currentWallet !== null && this.authToken !== null;
  }

  getWalletAddress(): string | null {
    return this.currentWallet?.address || null;
  }

  // Social Login Helpers
  async initializeGoogleAuth(): Promise<void> {
    // Initialize Google OAuth
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: this.handleGoogleCallback.bind(this),
      });
    }
  }

  private async handleGoogleCallback(response: any): Promise<void> {
    try {
      const decoded = JSON.parse(atob(response.credential.split('.')[1]));
      const provider: SocialLoginProvider = {
        name: 'google',
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        avatar: decoded.picture,
      };

      await this.authenticateWithSocial(provider);
    } catch (error) {
      console.error('❌ Google callback error:', error);
    }
  }

  async initializeFacebookAuth(): Promise<void> {
    // Initialize Facebook SDK
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.init({
        appId: process.env.REACT_APP_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });
    }
  }

  async loginWithFacebook(): Promise<void> {
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.login(async (response: any) => {
        if (response.authResponse) {
          window.FB.api('/me', { fields: 'id,name,email,picture' }, async (userInfo: any) => {
            const provider: SocialLoginProvider = {
              name: 'facebook',
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              avatar: userInfo.picture?.data?.url,
            };

            await this.authenticateWithSocial(provider);
          });
        }
      }, { scope: 'email' });
    }
  }
}

// React Hook for Custodial Wallet
export function useCustodialWallet() {
  const [wallet, setWallet] = React.useState<CustodialWallet | null>(null);
  const [balance, setBalance] = React.useState<WalletBalance | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const service = CustodialWalletService.getInstance();

  React.useEffect(() => {
    const initializeWallet = async () => {
      setLoading(true);
      try {
        const currentWallet = await service.getCurrentWallet();
        setWallet(currentWallet);
        
        if (currentWallet) {
          const walletBalance = await service.getWalletBalance();
          setBalance(walletBalance);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
      } finally {
        setLoading(false);
      }
    };

    initializeWallet();
  }, []);

  const refreshBalance = async () => {
    try {
      const walletBalance = await service.getWalletBalance();
      setBalance(walletBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh balance');
    }
  };

  const sendTransaction = async (request: TransactionRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.sendTransaction(request);
      if (result.success) {
        await refreshBalance();
      } else {
        setError(result.error || 'Transaction failed');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await service.logout();
    setWallet(null);
    setBalance(null);
    setError(null);
  };

  return {
    wallet,
    balance,
    loading,
    error,
    refreshBalance,
    sendTransaction,
    logout,
    isAuthenticated: service.isAuthenticated(),
    getWalletAddress: service.getWalletAddress.bind(service),
  };
}

// Export singleton instance
export const custodialWalletService = CustodialWalletService.getInstance();
