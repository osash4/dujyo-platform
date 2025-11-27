import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
export function generateKeypair() {
    return nacl.sign.keyPair();
}
export function signMessage(message, secretKey) {
    return nacl.sign.detached(message, secretKey);
}
export function verifySignature(message, signature, publicKey) {
    return nacl.sign.detached.verify(message, signature, publicKey);
}
export function encodeUTF8(str) {
    return naclUtil.decodeUTF8(str);
}
export function encodeHex(buf) {
    return Buffer.from(buf).toString('hex');
}
export function decodeHex(hex) {
    return Buffer.from(hex, 'hex');
}
//# sourceMappingURL=ed25519.js.map