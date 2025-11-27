export class BlockchainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockchainError';
  }
}
