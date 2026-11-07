/**
 * TalkPi Core Security Module (Open-Source Public Good)
 * 1. Client-Side 24-Word Passphrase Anti-Phishing Shield
 * 2. Deterministic 4-Word SAS (Short Authentication String) Generator
 * Live Production Demo: https://6860979.xyz
 */

const SAS_DICTIONARY = [
  "LION", "STAR", "GOLD", "WAVE", "NOVA", "PEAK", "FIRE", "WIND",
  "MOON", "IRON", "BOLT", "JADE", "HAWK", "PINE", "REEF", "WOLF"
];

const PHISHING_PATTERNS = [
  /\b(passphrase|seed\s*phrase|secret\s*words|recovery\s*phrase)\b/i,
  /\b(24\s*words|24\s*từ|cụm\s*mật\s*khẩu|mật\s*khẩu\s*ví)\b/i,
  /^([a-z]{3,8}\s+){23}[a-z]{3,8}$/i // Detects raw 24-word BIP39 mnemonic strings
];

/**
 * Scans outgoing/incoming chat payloads locally before WebRTC DataChannel transmission
 * @param {string} text - Raw message content
 * @returns {{ safe: boolean, reason: string | null }}
 */
export function scanForPhishing(text) {
  if (!text || typeof text !== "string") return { safe: true, reason: null };
  const normalized = text.trim();

  for (const pattern of PHISHING_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        safe: false,
        reason: "CRITICAL_SECURITY_ALERT: Potential 24-word wallet passphrase phishing detected."
      };
    }
  }
  return { safe: true, reason: null };
}

/**
 * Generates deterministic 4-word SAS verification string from DTLS-SRTP session fingerprint
 * @param {string} sessionFingerprint - Shared WebRTC DTLS fingerprint hash
 * @returns {string} 4-word SAS string (e.g., "LION - STAR - GOLD - WAVE")
 */
export function generateSASCode(sessionFingerprint) {
  if (!sessionFingerprint) return "INIT - WAIT - SYNC - PEER";
  let hash = 0;
  for (let i = 0; i < sessionFingerprint.length; i++) {
    hash = (hash << 5) - hash + sessionFingerprint.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const w1 = SAS_DICTIONARY[absHash % SAS_DICTIONARY.length];
  const w2 = SAS_DICTIONARY[(absHash >> 4) % SAS_DICTIONARY.length];
  const w3 = SAS_DICTIONARY[(absHash >> 8) % SAS_DICTIONARY.length];
  const w4 = SAS_DICTIONARY[(absHash >> 12) % SAS_DICTIONARY.length];

  return `${w1} - ${w2} - ${w3} - ${w4}`;
}
