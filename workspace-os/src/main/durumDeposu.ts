import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { UygulamaDurumu } from '@shared/tipler'

// Kalıcı uygulama durumu: %APPDATA%/Workspace OS/durum.json
const SEMA_SURUMU = 1

const varsayilanDurum = (): UygulamaDurumu => ({
  kurulumTamamlandi: false,
  surum: SEMA_SURUMU,
  profil: null,
  tercihler: { tema: 'sistem', dil: 'tr', aiOnerileriAcik: true },
})

const dosyaYolu = () => join(app.getPath('userData'), 'durum.json')

export async function durumOku(): Promise<UygulamaDurumu> {
  try {
    const ham = JSON.parse(await fs.readFile(dosyaYolu(), 'utf-8'))
    return { ...varsayilanDurum(), ...ham }
  } catch {
    return varsayilanDurum()
  }
}

export async function durumYaz(durum: UygulamaDurumu): Promise<UygulamaDurumu> {
  // Atomik yazım: önce geçici dosya, sonra rename — yarım kalan yazımda veri bozulmaz
  const yol = dosyaYolu()
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(`${yol}.tmp`, JSON.stringify(durum, null, 2), 'utf-8')
  await fs.rename(`${yol}.tmp`, yol)
  return durum
}

export async function durumSifirla(): Promise<UygulamaDurumu> {
  return durumYaz(varsayilanDurum())
}
