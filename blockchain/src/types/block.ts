export interface BlockHeader {
  version: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: number;
  difficulty: number;
  nonce: number;
}

export interface Block {
  header: BlockHeader;
  transactions: Transaction[];
  hash: string;
  height: number;
}

export interface BlockResponse {
  success: boolean;
  block?: Block;
  error?: string;
}

// Import Transaction type from tx.ts
import { Transaction } from './tx.js';
