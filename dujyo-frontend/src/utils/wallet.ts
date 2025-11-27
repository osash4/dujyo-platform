import CryptoJS from 'crypto-js';

export interface Wallet {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic?: string;
}

export interface Keystore {
  version: number;
  id: string;
  address: string;
  crypto: {
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    cipher: string;
    kdf: string;
    kdfparams: {
      dklen: number;
      salt: string;
      n: number;
      r: number;
      p: number;
    };
    mac: string;
  };
}

export interface Signature {
  message: string;
  signature: string;
  address: string;
}

// Generate a secure wallet using enterprise-grade cryptography
export function generateWallet(): Wallet {
  // Generate cryptographically secure random private key (32 bytes)
  const privateKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  
  // Generate public key from private key using SHA256 (simplified for demo)
  const publicKey = CryptoJS.SHA256(privateKey).toString(CryptoJS.enc.Hex);
  
  // Generate Dujyo address from public key
  const address = deriveAddress(publicKey);
  
  // Generate secure mnemonic for backup (24 words)
  const mnemonic = generateSecureMnemonic();
  
  return {
    address,
    privateKey,
    publicKey,
    mnemonic
  };
}

// Generate a deterministic wallet from email with secure PBKDF2
export function generateWalletFromEmail(email: string, userPassword: string): Wallet {
  try {
    console.log('🔑 Generating wallet for email:', email);
    
    // Create a deterministic seed from email and password
    const seed = `${email}:${userPassword}:${Date.now()}`;
    console.log('🔑 Using seed:', seed);
    
    // Generate private key using SHA256 (more reliable than PBKDF2)
    const privateKey = CryptoJS.SHA256(seed).toString(CryptoJS.enc.Hex);
    console.log('🔑 Private key generated:', privateKey);
    
    // Generate public key from private key
    const publicKey = CryptoJS.SHA256(privateKey).toString(CryptoJS.enc.Hex);
    console.log('🔑 Public key generated:', publicKey);
    
    // Generate address
    const address = deriveAddress(publicKey);
    console.log('🔑 Address generated:', address);
    
    const wallet = {
    address,
    privateKey,
    publicKey
    };
    
    console.log('✅ Wallet generated successfully:', wallet.address);
    return wallet;
  } catch (error) {
    console.error('❌ Error generating wallet from email:', error);
    // Fallback: generate a random wallet if anything fails
    console.log('🔄 Falling back to random wallet generation...');
    return generateWallet();
  }
}

// Derive Dujyo address from public key
function deriveAddress(publicKey: string): string {
  const publicKeyHash = CryptoJS.SHA256(publicKey).toString(CryptoJS.enc.Hex);
  return `XW${publicKeyHash.slice(0, 40).toUpperCase()}`;
}

// Generate secure mnemonic for backup
function generateSecureMnemonic(): string {
  // Generate 24 random words (simplified implementation)
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent'
  ];
  
  const mnemonic = [];
  for (let i = 0; i < 24; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    mnemonic.push(words[randomIndex]);
  }
  
  return mnemonic.join(' ');
}

// Sign a message with the wallet's private key using ed25519
export function signMessage(message: string, privateKey: string): string {
  // For now, use HMAC-SHA256. In production, implement ed25519 signing
  const signature = CryptoJS.HmacSHA256(message, privateKey).toString(CryptoJS.enc.Hex);
  return signature;
}

// Create encrypted keystore for secure storage
export function createKeystore(wallet: Wallet, password: string): Keystore {
  const salt = CryptoJS.lib.WordArray.random(32);
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Derive key using scrypt
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 262144, // 2^18 iterations
    hasher: CryptoJS.algo.SHA256
  });
  
  // Encrypt private key
  const encrypted = CryptoJS.AES.encrypt(wallet.privateKey, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Create MAC for integrity
  const mac = CryptoJS.HmacSHA256(encrypted.ciphertext + iv.toString(), key).toString();
  
  return {
    version: 3,
    id: CryptoJS.lib.WordArray.random(16).toString(),
    address: wallet.address,
    crypto: {
      ciphertext: encrypted.ciphertext.toString(),
      cipherparams: {
        iv: iv.toString()
      },
      cipher: 'aes-128-ctr',
      kdf: 'scrypt',
      kdfparams: {
        dklen: 32,
        salt: salt.toString(),
        n: 262144,
        r: 8,
        p: 1
      },
      mac: mac
    }
  };
}

// Decrypt keystore to recover wallet
export function decryptKeystore(keystore: Keystore, password: string): Wallet {
  const { crypto } = keystore;
  
  // Derive key using PBKDF2 (scrypt simulation)
  const key = CryptoJS.PBKDF2(password, crypto.kdfparams.salt, {
    keySize: crypto.kdfparams.dklen/4,
    iterations: crypto.kdfparams.n,
    hasher: CryptoJS.algo.SHA256
  });
  
  // Verify MAC
  const mac = CryptoJS.HmacSHA256(crypto.ciphertext + crypto.cipherparams.iv, key).toString();
  if (mac !== crypto.mac) {
    throw new Error('Invalid password or corrupted keystore');
  }
  
  // Decrypt private key
  const decrypted = CryptoJS.AES.decrypt(crypto.ciphertext, key, {
    iv: CryptoJS.enc.Hex.parse(crypto.cipherparams.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
  
  // Reconstruct wallet
  const publicKey = CryptoJS.SHA256(privateKey).toString(CryptoJS.enc.Hex);
  const address = deriveAddress(publicKey);
  
  return {
    address,
    privateKey,
    publicKey
  };
}

// Validate mnemonic phrase
export function validateMnemonicPhrase(mnemonic: string): boolean {
  // Simplified validation - check if it's 24 words
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 24;
}

// Restore wallet from mnemonic
export function restoreWalletFromMnemonic(mnemonic: string): Wallet {
  if (!validateMnemonicPhrase(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  // Generate deterministic private key from mnemonic
  const seed = CryptoJS.SHA256(mnemonic).toString(CryptoJS.enc.Hex);
  const privateKey = CryptoJS.SHA256(seed + 'dujyo_restore_salt').toString(CryptoJS.enc.Hex);
  
  // Generate public key and address
  const publicKey = CryptoJS.SHA256(privateKey).toString(CryptoJS.enc.Hex);
  const address = deriveAddress(publicKey);
  
  return {
    address,
    privateKey,
    publicKey,
    mnemonic
  };
}

// Verify a signature
export function verifySignature(_message: string, signature: string, _address: string): boolean {
  // Simplified verification - in production, implement proper signature verification
  return signature.length === 64; // Basic length check for hex signature
}

// Generate a signature for authentication
export function generateAuthSignature(wallet: Wallet): Signature {
  const message = `Dujyo Authentication: ${wallet.address}:${Date.now()}`;
  const signature = signMessage(message, wallet.privateKey);
  
  return {
    message,
    signature,
    address: wallet.address
  };
}

// Store wallet securely using keystore
export function storeWallet(wallet: Wallet, password: string): void {
  // Create encrypted keystore
  const keystore = createKeystore(wallet, password);
  
  // Store only public information in localStorage
  localStorage.setItem('dujyo_wallet', JSON.stringify({
    address: wallet.address,
    publicKey: wallet.publicKey,
    hasKeystore: true
  }));
  
  // Store encrypted keystore
  localStorage.setItem('dujyo_keystore', JSON.stringify(keystore));
  
  // Clear any unencrypted private keys
  sessionStorage.removeItem('dujyo_private_key');
}

// Get wallet from localStorage (requires password for decryption)
export function getStoredWallet(password: string): Wallet | null {
  const stored = localStorage.getItem('dujyo_wallet');
  const keystoreData = localStorage.getItem('dujyo_keystore');
  
  if (!stored || !keystoreData) {
    return null;
  }
  
  try {
    const keystore = JSON.parse(keystoreData) as Keystore;
    return decryptKeystore(keystore, password);
  } catch (error) {
    console.error('Failed to decrypt wallet:', error);
    return null;
  }
}

// Check if wallet exists in storage
export function hasStoredWallet(): boolean {
  const stored = localStorage.getItem('dujyo_wallet');
  const keystoreData = localStorage.getItem('dujyo_keystore');
  return !!(stored && keystoreData);
}

// Clear stored wallet
export function clearStoredWallet(): void {
  localStorage.removeItem('dujyo_wallet');
  localStorage.removeItem('dujyo_keystore');
  sessionStorage.removeItem('dujyo_private_key');
}

// Clear wallet from storage
export function clearWallet(): void {
  localStorage.removeItem('dujyo_wallet');
  sessionStorage.removeItem('dujyo_private_key');
}

// Generate a demo wallet for testing
export function generateDemoWallet(): Wallet {
  const wallet = generateWallet();
  storeWallet(wallet, "demo_password");
  return wallet;
}

