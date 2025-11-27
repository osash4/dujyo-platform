import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearWallet, generateAuthSignature } from '../utils/wallet';
import { getApiBaseUrl } from '../utils/apiConfig';

export type UserRole = 'listener' | 'artist' | 'validator' | 'admin';

interface User {
  photoURL?: string;
  uid: string;
  email: string;
  displayName?: string;
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  getUserRole: () => UserRole;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      console.log('✅ Loaded user from localStorage:', {
        email: parsedUser.email,
        uid: parsedUser.uid,
        role: parsedUser.role
      });
    }
    
    // Check if there's a stored wallet in localStorage (simple check)
    const storedWallet = localStorage.getItem('dujyo_wallet');
    if (storedWallet) {
      try {
        const wallet = JSON.parse(storedWallet);
        if (wallet && wallet.address) {
          console.log('Loaded existing wallet:', wallet.address);
        }
      } catch (error) {
        // Invalid wallet data, ignore
      }
    }
  }, []);

  // Removed automatic redirect to profile
  // Users should navigate manually or be redirected by specific components

  // Function to determine user role based on email
  const determineUserRole = (email: string): UserRole => {
    const emailLower = email.toLowerCase();
    
    if (emailLower.includes('admin') || emailLower.includes('@dujyo.admin')) {
      return 'admin';
    } else if (emailLower.includes('artist') || emailLower.includes('@dujyo.artist')) {
      return 'artist';
    } else if (emailLower.includes('validator') || emailLower.includes('@dujyo.validator')) {
      return 'validator';
    } else {
      return 'listener';
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('📝 Starting registration process for:', email);
      console.log('🚀 Starting registration process...');
      console.log('📧 Email:', email);
      console.log('👤 Username:', username);
      
      const apiBaseUrl = getApiBaseUrl();
      console.log('🌐 API Base URL:', apiBaseUrl);
      
      const registerUrl = `${apiBaseUrl}/register`;
      console.log('📡 Register URL:', registerUrl);
      
      let registerResponse;
      try {
        registerResponse = await fetch(registerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            username: username,
          })
        });
        
        console.log('📡 Fetch completed, status:', registerResponse.status);
      } catch (fetchError) {
        console.error('❌ FETCH ERROR (network/CORS):', fetchError);
        console.error('❌ Error details:', {
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        });
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server'}`);
      }

      console.log('📡 Backend register response status:', registerResponse.status);
      console.log('📡 Backend register response URL:', registerResponse.url);
      
      // Get response text first to see what we're dealing with
      const responseText = await registerResponse.text();
      console.log('📡 Backend register raw response:', responseText);
      
      if (!registerResponse.ok) {
        console.error('❌ Backend register error - Status:', registerResponse.status);
        console.error('❌ Backend register error - Response:', responseText);
        
        let errorMessage = 'Failed to register';
        
        // Handle specific status codes
        if (registerResponse.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
          console.error('❌ Server error (500) - Backend may have database issues');
        } else if (registerResponse.status === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (registerResponse.status === 400) {
          errorMessage = 'Invalid request. Please check your information.';
        }
        
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
          console.error('❌ Parsed error message:', errorMessage);
        } catch {
          if (responseText) {
            errorMessage = responseText.length > 200 ? errorMessage : responseText;
          }
          console.error('❌ Could not parse error, using raw text or default');
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON response
      let registerResult;
      try {
        registerResult = JSON.parse(responseText);
        console.log('✅ Backend register result:', registerResult);
      } catch (e) {
        console.error('❌ Failed to parse register response as JSON:', e);
        console.error('❌ Raw response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      if (!registerResult.success) {
        console.error('❌ Registration failed:', registerResult.message);
        console.error('❌ Full response:', registerResult);
        throw new Error(registerResult.message || 'Registration failed');
      }

      // Get wallet address from backend response
      let walletAddress = registerResult.wallet_address;
      
      // Fallback to JWT claims if wallet_address is not in registerResult
      if (!walletAddress && registerResult.token) {
        try {
          const tokenParts = registerResult.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.sub && payload.sub.startsWith('DU')) {
              walletAddress = payload.sub;
              console.log('✅ Wallet from JWT token:', walletAddress);
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not decode JWT:', e);
        }
      }
      
      // Ensure walletAddress is valid (starts with "DU")
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        console.error('❌ No valid DUJYO wallet address received after registration.');
        throw new Error('Registration successful, but no valid DUJYO wallet address found.');
      }
      
      // Store the wallet in localStorage (same format as login)
      localStorage.setItem('dujyo_wallet', JSON.stringify({
        address: walletAddress,
        publicKey: '0000000000000000000000000000000000000000000000000000000000000002' // Placeholder
      }));
      localStorage.setItem('dujyo_wallet_account', walletAddress); // Store raw address
      sessionStorage.setItem('dujyo_private_key', '0000000000000000000000000000000000000000000000000000000000000001'); // Placeholder
      console.log('✅ Wallet stored:', walletAddress);
      
      // Create user object with real wallet address as uid
      const role = determineUserRole(email);
      const newUser: User = {
        uid: walletAddress, // Use wallet address as UID
        email: email,
        photoURL: 'https://example.com/photo.jpg',
        displayName: username || email.split('@')[0],
        role: role,
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('jwt_token', registerResult.token);
      
      console.log('✅ Registration successful for user:', newUser.email);
      console.log('✅ Wallet address:', walletAddress);
      console.log('✅ JWT token stored');
      
      // Redirect to profile after successful registration
      navigate('/profile');
    } catch (error) {
      console.error("Error during registration: ", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting login process for:', email);
      
      const apiBaseUrl = getApiBaseUrl();
      console.log('🔗 API Base URL:', apiBaseUrl || '(relative - using proxy)');
      
      // ✅ FIX: Use direct email/password login (simpler and more secure)
      const loginUrl = `${apiBaseUrl}/login`;
      console.log('🌐 Sending login request to backend:', loginUrl);
      
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      console.log('📡 Login response status:', loginResponse.status);
      
      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('❌ Login error response:', errorText);
        let errorMessage = 'Failed to login';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const loginResult = await loginResponse.json();
      console.log('✅ Login result:', loginResult);
      
      if (!loginResult.success) {
        console.error('❌ Login failed:', loginResult.message);
        throw new Error(loginResult.message || 'Login failed');
      }
      
      // Store JWT token
      localStorage.setItem('jwt_token', loginResult.token);
      
      // ✅ Get wallet address from JWT token or registration response
      // The backend should return wallet_address in the login/register response
      let walletAddress: string | null = null;
      
      // Try to get wallet from login response first
      if (loginResult.wallet_address) {
        walletAddress = loginResult.wallet_address;
        console.log('✅ Wallet from login response:', walletAddress);
      } else {
        // Fallback: Try to decode JWT to get wallet address
        try {
          const tokenParts = loginResult.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.sub && payload.sub.startsWith('DU')) {
              walletAddress = payload.sub;
              console.log('✅ Wallet from JWT token:', walletAddress);
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not decode JWT:', e);
        }
      }
      
      // If still no wallet, try to fetch from backend
      if (!walletAddress) {
        const walletUrl = `${apiBaseUrl}/api/v1/user/wallet?email=${encodeURIComponent(email)}`;
        console.log('📡 Fetching wallet from:', walletUrl);
        
        try {
          const walletResponse = await fetch(walletUrl, {
            headers: { 'Authorization': `Bearer ${loginResult.token}` }
          });
          
          if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            console.log('📡 Wallet response data:', walletData);
            if (walletData.wallet_address && walletData.wallet_address.startsWith('DU')) {
              walletAddress = walletData.wallet_address;
            }
          }
        } catch (walletError) {
          console.error('❌ Error fetching wallet address:', walletError);
        }
      }
      
      // ✅ CRITICAL: Do NOT use email as wallet address fallback
      // If we don't have a valid wallet address, we cannot proceed
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        console.error('❌ No valid wallet address found. Cannot proceed with login.');
        throw new Error('No valid wallet address found. Please contact support.');
      }
      
      // Store the wallet
      localStorage.setItem('dujyo_wallet', JSON.stringify({
        address: walletAddress,
        publicKey: '0000000000000000000000000000000000000000000000000000000000000002'
      }));
      localStorage.setItem('dujyo_wallet_account', walletAddress);
      console.log('✅ Wallet stored:', walletAddress);

      // Create user object with real wallet address
      const role = determineUserRole(email);
      const newUser: User = {
        uid: walletAddress,
        email: email,
        photoURL: 'https://example.com/photo.jpg',
        displayName: email.split('@')[0],
        role: role,
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      console.log('✅ Login successful for user:', newUser.email);
      console.log('✅ Wallet address:', walletAddress);
      console.log('✅ JWT token stored');
      
      // Redirigir a profile solo después de hacer login exitoso
      navigate('/profile');
    } catch (error) {
      console.error("Error al iniciar sesión: ", error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('jwt_token');
    clearWallet(); // Clear wallet data
    navigate('/explore');
  };

  // Role-based functions
  const getUserRole = (): UserRole => {
    return user?.role || 'listener';
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isSignedIn: !!user, 
      signIn, 
      signUp,
      signOut, 
      getUserRole, 
      hasRole, 
      hasAnyRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
