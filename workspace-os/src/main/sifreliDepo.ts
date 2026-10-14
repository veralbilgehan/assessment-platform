import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

// Gizli değerler (API anahtarı, bulut oturum anahtarları) için ortak depo.
// Windows'ta DPAPI (Electron safeStorage) ile şifrelenip %APPDATA%/Workspace OS/<ad>.bin'e yazılır.
// Şifreleme yoksa (anahtarlığı olmayan Linux) değer diske yazılmaz, yalnızca oturum boyunca bellekte tutulur.

const bellek = new Map<string, string>()
const dosya = (ad: string) => path.join(app.getPath('userData'), `${ad}.bin`)

export async function sifreliOku(ad: string): Promise<string | null> {
  if (bellek.has(ad)) return bellek.get(ad)!
  try {
    return safeStorage.decryptString(await fs.readFile(dosya(ad)))
  } catch {
    return null
  }
}

/** true: diske şifreli yazıldı · false: yalnızca bellekte */
export async function sifreliYaz(ad: string, deger: string): Promise<boolean> {
  if (safeStorage.isEncryptionAvailable()) {
    bellek.delete(ad)
    await fs.writeFile(dosya(ad), safeStorage.encryptString(deger))
    return true
  }
  bellek.set(ad, deger)
  return false
}

export async function sifreliSil(ad: string) {
  bellek.delete(ad)
  await fs.rm(dosya(ad), { force: true })
}

export const bellekteMi = (ad: string) => bellek.has(ad)
