import nacl from 'tweetnacl';
export declare function generateKeypair(): nacl.SignKeyPair;
export declare function signMessage(message: Uint8Array, secretKey: Uint8Array): Uint8Array<ArrayBufferLike>;
export declare function verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
export declare function encodeUTF8(str: string): Uint8Array;
export declare function encodeHex(buf: Uint8Array): string;
export declare function decodeHex(hex: string): Uint8Array;
//# sourceMappingURL=ed25519.d.ts.map