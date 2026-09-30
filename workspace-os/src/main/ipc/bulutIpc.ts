import { BrowserWindow, dialog, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { IPC } from '@shared/tipler'
import type { BulutAyarGirdisi, BulutHesabi, BulutOgesi, BulutSaglayici } from '@shared/bulut'
import { ayarlariGetir, ayarlariKaydet } from '../bulut/ayarlar'
import { baglan, baglantiKes, oturumSifreli, oturumVar } from '../bulut/oturum'
import { API, bulutDosyasiniAc, senkronDurumu } from '../bulut/senkron'
import { adDogrula } from '../dosyaIslemleri'
import { bilinenKlasor } from '../suruculer'

const SAGLAYICILAR: BulutSaglayici[] = ['google', 'microsoft']
const gecerli = (s: string): s is BulutSaglayici => SAGLAYICILAR.includes(s as BulutSaglayici)
function denetle(s: string): BulutSaglayici {
  if (!gecerli(s)) throw new Error('Bilinmeyen bulut sağlayıcısı')
  return s
}

async function hesap(s: BulutSaglayici): Promise<BulutHesabi> {
  const ayarlar = await ayarlariGetir()
  const yapilandirildi = s === 'google' ? !!ayarlar.googleIstemciKimligi : !!ayarlar.microsoftIstemciKimligi
  if (!(await oturumVar(s))) return { saglayici: s, yapilandirildi, bagli: false }
  try {
    return { saglayici: s, yapilandirildi, bagli: true, sifreli: oturumSifreli(s), ...(await API[s].hesap()) }
  } catch {
    return { saglayici: s, yapilandirildi, bagli: true, sifreli: oturumSifreli(s) } // çevrimdışı: bağlı ama bilgi alınamadı
  }
}

async function benzersiz(klasor: string, ad: string) {
  const uz = path.extname(ad)
  const kok = ad.slice(0, ad.length - uz.length)
  for (let i = 1; ; i++) {
    const y = path.join(klasor, i > 1 ? `${kok} (${i})${uz}` : ad)
    try {
      await fs.access(y)
    } catch {
      return y
    }
  }
}

export function bulutIpcKaydet() {
  ipcMain.handle(IPC.bulutHesaplar, () => Promise.all(SAGLAYICILAR.map(hesap)))
  ipcMain.handle(IPC.bulutAyarlar, () => ayarlariGetir())
  ipcMain.handle(IPC.bulutAyarlariKaydet, (_e, g: BulutAyarGirdisi) => ayarlariKaydet(g))

  ipcMain.handle(IPC.bulutBaglan, async (e, s: string) => {
    await baglan(denetle(s))
    BrowserWindow.fromWebContents(e.sender)?.focus() // tarayıcıdan uygulamaya geri dön
    return hesap(s as BulutSaglayici)
  })
  ipcMain.handle(IPC.bulutBaglantiKes, async (_e, s: string) => {
    await baglantiKes(denetle(s))
    return hesap(s as BulutSaglayici)
  })

  ipcMain.handle(IPC.bulutListele, (_e, s: string, klasorId: string | null) => API[denetle(s)].listele(klasorId))
  ipcMain.handle(IPC.bulutAc, (_e, s: string, oge: BulutOgesi, klasorId: string | null) => bulutDosyasiniAc(denetle(s), oge, klasorId))

  ipcMain.handle(IPC.bulutIndir, async (_e, s: string, oge: BulutOgesi) => {
    const { veri, ad } = await API[denetle(s)].indir(oge)
    const klasor = bilinenKlasor('downloads')
    await fs.mkdir(klasor, { recursive: true })
    const yol = await benzersiz(klasor, ad.replace(/[<>:"/\\|?*]/g, '_'))
    await fs.writeFile(yol, veri)
    return yol
  })

  ipcMain.handle(IPC.bulutYukle, async (e, s: string, klasorId: string | null, yollar?: string[]) => {
    const api = API[denetle(s)]
    if (!yollar?.length) {
      const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, { properties: ['openFile', 'multiSelections'] })
      if (r.canceled) return []
      yollar = r.filePaths
    }
    const sonuc: BulutOgesi[] = []
    for (const y of yollar) {
      const st = await fs.stat(y)
      if (!st.isFile()) continue // klasör yükleme şimdilik desteklenmiyor
      sonuc.push(await api.yukleYeni(klasorId, path.basename(y), await fs.readFile(y)))
    }
    return sonuc
  })

  ipcMain.handle(IPC.bulutKlasorOlustur, (_e, s: string, ustId: string | null, ad: string) => API[denetle(s)].klasorOlustur(ustId, adDogrula(ad)))
  ipcMain.handle(IPC.bulutYenidenAdlandir, (_e, s: string, id: string, ad: string) => API[denetle(s)].yenidenAdlandir(id, adDogrula(ad)))
  ipcMain.handle(IPC.bulutSenkronDurumu, (_e, yol: string) => senkronDurumu(yol))
}
