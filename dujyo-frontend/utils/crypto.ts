import CryptoJS from 'crypto-js';

// Define los tipos para el retorno de la función generateKeyPair
export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

// Calcula el hash de los datos proporcionados
export const calculateHash = (data: any): string => {
  const hash1 = CryptoJS.SHA256(JSON.stringify(data)); // Se usa SHA256 de CryptoJS
  const hash2 = CryptoJS.SHA256(hash1.toString()).toString(); // Doble SHA256 usando CryptoJS
  return hash2;
};

// Genera un nuevo par de claves (mock implementation)
export const generateKeyPair = (): KeyPair => {
  // Mock key generation - in a real app, this would use proper cryptographic libraries
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  
  return {
    privateKey: `mock_private_${timestamp}_${random}`,
    publicKey: `mock_public_${timestamp}_${random}`
  };
};
