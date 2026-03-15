/**
 * Client-side End-to-End Encryption using TweetNaCl.js
 *
 * 1:1 Messages: nacl.box (X25519 + XSalsa20-Poly1305)
 *   - Sender encrypts with: recipient public key + sender secret key
 *   - Recipient decrypts with: sender public key + recipient secret key
 *
 * Group Messages: nacl.secretbox (XSalsa20-Poly1305)
 *   - Shared group symmetric key
 *   - Group key is distributed encrypted with each member's public key
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

const KEYS_STORAGE = 'sc_keys';

// ─── Key Management ────────────────────────────────────────────────────────

export function generateKeyPair() {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

export function saveKeys(publicKey, secretKey) {
  // In production, use more secure storage (e.g. IndexedDB + Web Crypto API)
  localStorage.setItem(KEYS_STORAGE, JSON.stringify({ publicKey, secretKey }));
}

export function loadKeys() {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearKeys() {
  localStorage.removeItem(KEYS_STORAGE);
}

// ─── 1:1 Encryption (Asymmetric) ───────────────────────────────────────────

export function encryptDirect(plaintext, recipientPublicKeyB64, senderSecretKeyB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msg = encodeUTF8(plaintext);
  const rpk = decodeBase64(recipientPublicKeyB64);
  const ssk = decodeBase64(senderSecretKeyB64);
  const box = nacl.box(msg, nonce, rpk, ssk);
  return JSON.stringify({ nonce: encodeBase64(nonce), ciphertext: encodeBase64(box) });
}

export function decryptDirect(encryptedJson, senderPublicKeyB64, recipientSecretKeyB64) {
  try {
    const { nonce, ciphertext } = JSON.parse(encryptedJson);
    const spk = decodeBase64(senderPublicKeyB64);
    const rsk = decodeBase64(recipientSecretKeyB64);
    const opened = nacl.box.open(decodeBase64(ciphertext), decodeBase64(nonce), spk, rsk);
    if (!opened) return null;
    return decodeUTF8(opened);
  } catch { return null; }
}

// ─── Group Encryption (Symmetric) ──────────────────────────────────────────

export function generateGroupKey() {
  return encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength));
}

export function encryptGroup(plaintext, groupKeyB64) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msg = encodeUTF8(plaintext);
  const key = decodeBase64(groupKeyB64);
  const box = nacl.secretbox(msg, nonce, key);
  return JSON.stringify({ nonce: encodeBase64(nonce), ciphertext: encodeBase64(box) });
}

export function decryptGroup(encryptedJson, groupKeyB64) {
  try {
    const { nonce, ciphertext } = JSON.parse(encryptedJson);
    const key = decodeBase64(groupKeyB64);
    const opened = nacl.secretbox.open(decodeBase64(ciphertext), decodeBase64(nonce), key);
    if (!opened) return null;
    return decodeUTF8(opened);
  } catch { return null; }
}

// ─── Group Key Distribution ─────────────────────────────────────────────────
// Encrypt the group key with each member's public key so only they can read it

export function encryptGroupKeyFor(groupKeyB64, memberPublicKeyB64, mySecretKeyB64) {
  return encryptDirect(groupKeyB64, memberPublicKeyB64, mySecretKeyB64);
}

export function decryptGroupKey(encryptedKeyJson, adminPublicKeyB64, mySecretKeyB64) {
  return decryptDirect(encryptedKeyJson, adminPublicKeyB64, mySecretKeyB64);
}
