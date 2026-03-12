import { x25519 } from "@noble/curves/ed25519.js"

export function generateKeyPair() {
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

export function getPublicKeyFromPrivate(privateKey: Uint8Array) {
  return x25519.getPublicKey(privateKey)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function publicKeyToBase64(key: Uint8Array): string {
  return bytesToBase64(key)
}

export function privateKeyToBase64(key: Uint8Array): string {
  return bytesToBase64(key)
}

export function base64ToPublicKey(base64: string): Uint8Array {
  return base64ToBytes(base64)
}

export function base64ToPrivateKey(base64: string): Uint8Array {
  return base64ToBytes(base64)
}

export async function encrypt(
  message: string,
  receiverPublicKey: Uint8Array
): Promise<string> {
  const ephemeral = generateKeyPair()
  const sharedSecret = x25519.getSharedSecret(
    ephemeral.privateKey,
    receiverPublicKey
  )

  const sharedBytes = new Uint8Array(sharedSecret)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedBytes,
    "HKDF",
    false,
    ["deriveKey"]
  )
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("friendly-curves-v1"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(message)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded
  )

  // ephemeralPub(32) + iv(12) + ciphertext
  const result = new Uint8Array(32 + 12 + ciphertext.byteLength)
  result.set(ephemeral.publicKey, 0)
  result.set(iv, 32)
  result.set(new Uint8Array(ciphertext), 44)

  return bytesToBase64(result)
}

export async function decrypt(
  ciphertextBase64: string,
  privateKey: Uint8Array
): Promise<string> {
  const data = base64ToBytes(ciphertextBase64)

  const ephemeralPub = data.slice(0, 32)
  const iv = data.slice(32, 44)
  const ciphertext = data.slice(44)

  const sharedSecret = x25519.getSharedSecret(privateKey, ephemeralPub)
  const sharedBytes = new Uint8Array(sharedSecret)

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedBytes,
    "HKDF",
    false,
    ["deriveKey"]
  )
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("friendly-curves-v1"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  )

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext
  )

  return new TextDecoder().decode(plaintext)
}
