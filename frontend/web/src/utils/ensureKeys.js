import api from './api';
import { generateKeyPair, loadKeys, saveKeys } from './encryption';

export async function ensureEncryptionKeys(accessToken) {
  let keys = loadKeys();
  if (!keys || !keys.publicKey || !keys.secretKey) {
    keys = generateKeyPair();
    saveKeys(keys.publicKey, keys.secretKey);
  }

  await api.put('/auth/setup-profile', { publicKey: keys.publicKey }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return keys;
}
