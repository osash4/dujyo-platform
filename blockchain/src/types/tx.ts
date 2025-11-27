export interface Transaction {
  from: string;
  to: string;
  amount: number;
  token: 'DYO' | 'DYS';
  nonce: number;
  signature: string;
  timestamp: number;
  txHash: string;
}

export interface SignedTransaction extends Transaction {
  publicKey: string;
}

export interface TransactionResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}
