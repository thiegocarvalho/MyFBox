import fs from 'node:fs/promises'
import path from 'node:path'
import type { EncryptedVaultEnvelope } from '../src/types/vaultEnvelope'

export const VAULT_FILENAME = 'vault.myfbox.json'
export const MAX_VAULT_BYTES = 20 * 1024 * 1024

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function assertValidEnvelope(data: unknown): asserts data is EncryptedVaultEnvelope {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Envelope de cofre inválido.')
  }
  const obj = data as Record<string, unknown>
  if (obj.app !== 'MyFBox' || obj.formatVersion !== 1) {
    throw new Error('Formato de cofre não suportado.')
  }
  if (!isNonEmptyString(obj.createdAt) || !isNonEmptyString(obj.updatedAt) || !isNonEmptyString(obj.keyFingerprint)) {
    throw new Error('Metadados do cofre inválidos.')
  }
  const kdf = obj.kdf as Record<string, unknown> | undefined
  if (
    !kdf ||
    typeof kdf !== 'object' ||
    kdf.algorithm !== 'PBKDF2-HMAC-SHA256' ||
    typeof kdf.iterations !== 'number' ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations <= 0 ||
    !isNonEmptyString(kdf.saltBase64)
  ) {
    throw new Error('Parâmetros KDF do cofre inválidos.')
  }
  const cipher = obj.cipher as Record<string, unknown> | undefined
  if (
    !cipher ||
    typeof cipher !== 'object' ||
    cipher.algorithm !== 'AES-256-GCM' ||
    !isNonEmptyString(cipher.ivBase64) ||
    !isNonEmptyString(cipher.ciphertextBase64)
  ) {
    throw new Error('Payload cifrado do cofre inválido.')
  }
  const verifier = obj.verifier as Record<string, unknown> | undefined
  if (
    !verifier ||
    typeof verifier !== 'object' ||
    !isNonEmptyString(verifier.ivBase64) ||
    !isNonEmptyString(verifier.ciphertextBase64)
  ) {
    throw new Error('Verificador do cofre inválido.')
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export class NativeVaultStore {
  private readonly filePath: string

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, VAULT_FILENAME)
  }

  async info(): Promise<{ storage: 'native'; filePath: string; exists: boolean }> {
    return {
      storage: 'native',
      filePath: this.filePath,
      exists: await fileExists(this.filePath),
    }
  }

  async load(): Promise<EncryptedVaultEnvelope | null> {
    let raw: string
    try {
      raw = await fs.readFile(this.filePath, 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw err
    }
    const parsed: unknown = JSON.parse(raw)
    assertValidEnvelope(parsed)
    return parsed
  }

  async save(envelope: unknown): Promise<void> {
    assertValidEnvelope(envelope)
    const serialized = JSON.stringify(envelope)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_VAULT_BYTES) {
      throw new Error('Cofre excede o tamanho máximo permitido.')
    }

    const dir = path.dirname(this.filePath)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 })

    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}`
    try {
      await fs.writeFile(tmpPath, serialized, { encoding: 'utf8', mode: 0o600 })
      if (process.platform !== 'win32') {
        await fs.chmod(tmpPath, 0o600)
      }
      await fs.rename(tmpPath, this.filePath)
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {})
      throw err
    }
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.filePath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }
  }
}
