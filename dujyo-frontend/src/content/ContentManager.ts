import {Level} from 'level'; // Asegúrate de que esta línea sea correcta
import { Transaction } from '../blockchain/Transaction';
import { Buffer } from 'buffer';  // Asegurándonos de que Buffer se importe correctamente

interface Content {
  id: string;
  creator: string;
  type: string;
  contentHash?: string;
  setContentHash: (hash: string) => void;
  toJSON: () => Record<string, unknown>;
}

interface Blockchain {
  addTransaction: (transaction: Transaction) => void;
}

export class ContentManager {
  private db: Level<string, Record<string, unknown>>;  // Correct type for level database
  private ipfs: any; // IPFS instance
  private blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.db = new Level<string, Record<string, unknown>>('content-db', { valueEncoding: 'json' });
    this.blockchain = blockchain;
    this.initializeIPFS();
  }

  private async initializeIPFS() {
    // Mock IPFS initialization - in a real app, this would connect to IPFS
    console.log('IPFS initialization disabled, using mock mode');
    this.ipfs = null;
  }

  async addContent(content: Content, fileBuffer: Buffer): Promise<string> {
    try {
      // Upload content to IPFS
      let contentHash: string;
      if (this.ipfs) {
        const result = await this.ipfs.add(fileBuffer);
        contentHash = result.cid.toString();
      } else {
        // Mock mode - generate a fake hash
        contentHash = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      content.setContentHash(contentHash);

      if (!content.contentHash) {
        throw new Error('Content hash is required');
      }

      // Store content metadata in LevelDB
      await this.db.put(`content:${content.id}`, content.toJSON());

      // Create blockchain transaction for content registration
      const transaction = new Transaction(
        content.creator,
        "",  // Usar cadena vacía en lugar de 'null'
        0,
        'CONTENT_REGISTRATION',
        {
          type: 'CONTENT_REGISTRATION',
          contentId: content.id,
          contentHash: content.contentHash || ''
        }
      );

      this.blockchain.addTransaction(transaction);

      return content.id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to add content: ${error.message}`);
      }
      throw new Error('Failed to add content due to an unknown error');
    }
  }

  async getContent(contentId: string): Promise<Record<string, unknown>> {
    try {
      return await this.db.get(`content:${contentId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Content not found: ${contentId}`);
      }
      throw new Error('Failed to retrieve content due to an unknown error');
    }
  }

  async listContent(type: string | null = null): Promise<Record<string, unknown>[]> {
    const contents: Record<string, unknown>[] = [];
    for await (const [, value] of this.db.iterator({
      gte: 'content:',
      lte: 'content:\xff'
    })) {
      if (!type || value.type === type) {
        contents.push(value);
      }
    }
    return contents;
  }
}
