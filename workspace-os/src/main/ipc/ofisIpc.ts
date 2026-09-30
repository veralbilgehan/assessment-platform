import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { constants, promises as fs } from 'fs'
import path from 'path'
import { IPC } from '@shared/tipler'
import { BOS_BELGELER, editorBul, type AcikBelge, type BelgeIcerigi, type EditorTuru } from '@shared/ofis'
import { belgeOku, belgeYaz } from '../ofis'
import { acildiIsaretle, dahiliIsaretle, kaydiGetir } from '../statuDeposu'
import { kayitGuncelle } from '../dizinDeposu'
import { bilinenKlasor, suruculeriGetir } from '../suruculer'

async function varMi(yol: string) {
  try {
    await fs.access(yol)
    return true
  } catch {
    return false
  }
}

/** "Adsız belge.docx" varsa "Adsız belge (2).docx" … */
async function benzersizYol(klasor: string, ad: string, uzanti: string) {
  for (let i = 1; ; i++) {
    const yol = path.join(klasor, `${ad}${i > 1 ? ` (${i})` : ''}.${uzanti}`)
    if (!(await varMi(yol))) return yol
  }
}

/** Başka programla oluşturulmuş dosyanın üzerine ilk kez yazmadan önce orijinali saklar. */
async function gerekirseYedekle(yol: string) {
  if ((await kaydiGetir(yol))?.dahili || !(await varMi(yol))) return
  const klasor = path.join(app.getPath('userData'), 'yedekler')
  await fs.mkdir(klasor, { recursive: true })
  const zaman = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  await fs.copyFile(yol, path.join(klasor, `${zaman}_${path.basename(yol)}`))
}

async function yazVeKaydet(yol: string, icerik: BelgeIcerigi) {
  const mevcut = await varMi(yol)
  if (mevcut) {
    try {
      await fs.access(yol, constants.W_OK)
    } catch {
      throw new Error('Bu dosya korumalı (salt okunur). Kaydetmek için korumayı kaldır veya "Farklı kaydet"i kullan.')
    }
  }
  await gerekirseYedekle(yol)
  await belgeYaz(yol, icerik, mevcut)
  await dahiliIsaretle(yol)
  await kayitGuncelle(yol)
}

const UZANTI_FILTRELERI: Record<EditorTuru, { name: string; extensions: string[] }[]> = {
  word: [{ name: 'Word Belgesi', extensions: ['docx'] }],
  excel: [{ name: 'Excel Çalışma Kitabı', extensions: ['xlsx'] }, { name: 'CSV', extensions: ['csv'] }],
  sunum: [{ name: 'PowerPoint Sunusu', extensions: ['pptx'] }],
  metin: [{ name: 'Metin', extensions: ['txt'] }, { name: 'Markdown', extensions: ['md'] }],
}

// Harici tarayıcıda açılmasına izin verilen adresler
const IZINLI_ALANLAR = ['docs.google.com', 'drive.google.com', 'sheets.google.com', 'slides.google.com', 'www.office.com', 'office.com', 'www.microsoft365.com', 'onedrive.live.com', 'www.google.com']

export function ofisIpcKaydet() {
  ipcMain.handle(IPC.belgeAc, async (_e, yol: string): Promise<AcikBelge> => {
    const [icerik, kayit] = await Promise.all([belgeOku(yol), kaydiGetir(yol)])
    let korumali = !!kayit?.korumali
    try {
      await fs.access(yol, constants.W_OK)
    } catch {
      korumali = true
    }
    await acildiIsaretle(yol)
    return { yol, ad: path.basename(yol), icerik, iceAktarildi: !kayit?.dahili, korumali }
  })

  ipcMain.handle(IPC.belgeKaydet, async (_e, yol: string, icerik: BelgeIcerigi) => {
    await yazVeKaydet(yol, icerik)
    return Date.now()
  })

  ipcMain.handle(IPC.farkliKaydet, async (e, icerik: BelgeIcerigi, onerilenYol: string) => {
    const pencere = BrowserWindow.fromWebContents(e.sender)!
    const r = await dialog.showSaveDialog(pencere, { defaultPath: onerilenYol, filters: UZANTI_FILTRELERI[icerik.tur] })
    if (r.canceled || !r.filePath) return null
    if (editorBul(r.filePath) !== icerik.tur) throw new Error('Seçilen uzantı bu belge türüyle uyumlu değil')
    await yazVeKaydet(r.filePath, icerik)
    return r.filePath
  })

  ipcMain.handle(IPC.yeniBelge, async (_e, tur: EditorTuru, konum: 'belgeler' | 'google-drive' | 'onedrive' = 'belgeler') => {
    let klasor = bilinenKlasor('documents')
    await fs.mkdir(klasor, { recursive: true })
    if (konum !== 'belgeler') {
      const bulut = (await suruculeriGetir()).find((s) => s.saglayici === konum)
      if (!bulut) throw new Error(konum === 'google-drive' ? 'Google Drive klasörü bulunamadı' : 'OneDrive klasörü bulunamadı')
      klasor = bulut.yol
    }
    const sablon = BOS_BELGELER[tur]
    const yol = await benzersizYol(klasor, sablon.ad, sablon.uzanti)
    await belgeYaz(yol, sablon.icerik, false)
    await dahiliIsaretle(yol)
    await kayitGuncelle(yol)
    return yol
  })

  // Google Drive for Desktop kısayolu (.gdoc vb.): JSON içindeki adresi tarayıcıda aç
  ipcMain.handle(IPC.googleKisayolAc, async (_e, yol: string) => {
    const veri = JSON.parse(await fs.readFile(yol, 'utf-8'))
    const url: string = veri.url ?? (veri.doc_id ? `https://docs.google.com/open?id=${veri.doc_id}` : '')
    if (!url.startsWith('https://')) throw new Error('Kısayolda geçerli bir adres yok')
    await shell.openExternal(url)
    await acildiIsaretle(yol)
  })

  ipcMain.handle(IPC.webAc, async (_e, url: string) => {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !IZINLI_ALANLAR.includes(u.hostname)) throw new Error('Bu adres açılamaz')
    await shell.openExternal(u.toString())
  })
}
