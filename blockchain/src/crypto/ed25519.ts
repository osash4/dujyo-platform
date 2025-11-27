import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export function generateKeypair() {
  return nacl.sign.keyPair();
}

export function signMessage(message: Uint8Array, secretKey: Uint8Array) {
  return nacl.sign.detached(message, secretKey);
}

export function verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) {
  return nacl.sign.detached.verify(message, signature, publicKey);
}

export function encodeUTF8(str: string): Uint8Array {
  return naclUtil.decodeUTF8(str);
}

export function encodeHex(buf: Uint8Array): string {
  return Buffer.from(buf).toString('hex');
}

export function decodeHex(hex: string): Uint8Array {
  return Buffer.from(hex, 'hex');
}
