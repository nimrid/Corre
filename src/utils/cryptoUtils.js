import { Keypair, PublicKey } from '@solana/web3.js';
import { sign } from 'tweetnacl';
import bs58 from 'bs58';
import fs from 'fs';

/**
 * @typedef {Object} Payload
 * @property {string} publicKey
 * @property {string} accountId
 * @property {string} timestamp
 */

/**
 * Generate a Base58-encoded signature for a given payload using a secretKey.
 * @param {Payload} payload
 * @param {Uint8Array} secretKey
 * @returns {string} Base58-encoded signature
 */
export function generateSignature(payload, secretKey) {
  const message = JSON.stringify(payload);
  const signature = sign.detached(new TextEncoder().encode(message), secretKey);
  return bs58.encode(signature);
}

/**
 * Verify a Base58-encoded signature for a given payload and publicKey.
 * @param {Payload} payload
 * @param {string} signatureBase58
 * @param {PublicKey} publicKey
 * @returns {boolean}
 */
export function verifySignature(payload, signatureBase58, publicKey) {
  const messageBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = bs58.decode(signatureBase58);
  const publicKeyBytes = publicKey.toBytes();
  return sign.detached.verify(messageBytes, signature, publicKeyBytes);
}

/**
 * Standalone script to generate and verify a signature.
 */
async function main() {
  // Load secret key from JSON file
  const secretKeyBytes = fs.readFileSync(
    './src/keys/PAGaQhsvi4hSJSTCA72CPJtQ9UGKm2adcATbMdQkyCK.json',
    'utf-8'
  );
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(secretKeyBytes))
  );

  const timestamp = new Date().toISOString();
  console.log({ timestamp });

  // Example payload; replace accountId as needed
  const payload = {
    publicKey: keypair.publicKey.toString(),
    accountId: '68099f2581c9fb954f37dccb',
    timestamp,
  };

  const signature = generateSignature(payload, keypair.secretKey);
  const isValid = verifySignature(payload, signature, keypair.publicKey);
  console.log({ signature, isValid });

  console.log('Done');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
  });
}
