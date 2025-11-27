import nacl from "tweetnacl";

export function generateKeypair() {
  return nacl.sign.keyPair();
}

export function signMessage(message: Uint8Array, secretKey: Uint8Array) {
  return nacl.sign.detached(message, secretKey);
}
