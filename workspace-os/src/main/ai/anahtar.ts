import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { AiDurumu } from '@shared/ai'

// Claude API anahtarı: Windows'ta DPAPI (safeStorage) ile şifrelenip %APPDATA%/Workspace OS/ai-anahtar.bin'e yazılır.
// Şifreleme kullanılamıyorsa (ör. anahtarlığı olmayan Linux) anahtar diske yazılmaz, yalnızca oturum boyunca bellekte tutulur.

const dosya = () => path.join(app.getPath('userData'), 'ai-anahtar.bin')
let bellekteki: string | null = null

export async function anahtarOku(): Promise<string | null> {
  if (bellekteki) return bellekteki
  try {
    return safeStorage.decryptString(await fs.readFile(dosya()))
  } catch {
    return null
  }
}

export async function anahtarYaz(anahtar: string) {
  if (safeStorage.isEncryptionAvailable()) {
    bellekteki = null
    await fs.writeFile(dosya(), safeStorage.encryptString(anahtar))
  } else {
    bellekteki = anahtar
  }
}

export async function anahtarSil() {
  bellekteki = null
  await fs.rm(dosya(), { force: true })
}

export async function durum(): Promise<AiDurumu> {
  const kayitli = await anahtarOku()
  return {
    anahtarVar: !!kayitli || !!process.env.ANTHROPIC_API_KEY,
    kaynak: kayitli ? 'kayitli' : process.env.ANTHROPIC_API_KEY ? 'ortam' : null,
    sifreli: !!kayitli && !bellekteki,
  }
}
