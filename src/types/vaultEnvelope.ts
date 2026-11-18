export interface EncryptedVaultEnvelope {
  app: 'MyFBox';
  formatVersion: 1;
  createdAt: string;
  updatedAt: string;
  kdf: {
    algorithm: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    saltBase64: string;
  };
  cipher: {
    algorithm: 'AES-256-GCM';
    ivBase64: string;
    ciphertextBase64: string;
  };
  verifier: {
    ivBase64: string;
    ciphertextBase64: string;
  };
  keyFingerprint: string;
}
