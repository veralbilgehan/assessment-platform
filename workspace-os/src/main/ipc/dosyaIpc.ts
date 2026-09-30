import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC, type DosyaSorgusu, type OlayHaritasi } from '@shared/tipler'
import { durumOku } from '../durumDeposu'
import { klasorListele, klasorOlustur, tasi, yenidenAdlandir } from '../dosyaIslemleri'
import { onemliKlasorleriGetir, surucuIzle, suruculeriGetir } from '../suruculer'
import { tara } from '../tarayici'
import { dizinOzeti, dizinYaz, dosyaSorgula, yollariGuncelle } from '../dizinDeposu'

function yayinla<K extends keyof OlayHaritasi>(kanal: K, veri: OlayHaritasi[K]) {
  for (const p of BrowserWindow.getAllWindows()) p.webContents.send(kanal, veri)
}

let aktifTarama: { iptal: boolean } | null = null

export function dosyaIpcKaydet() {
  ipcMain.handle(IPC.suruculeriGetir, () => suruculeriGetir())
  ipcMain.handle(IPC.onemliKlasorler, () => onemliKlasorleriGetir())

  ipcMain.handle(IPC.klasorListele, (_e, yol: string, gizliGoster?: boolean) => klasorListele(yol, gizliGoster))
  ipcMain.handle(IPC.klasorOlustur, (_e, ustYol: string, ad: string) => klasorOlustur(ustYol, ad))

  ipcMain.handle(IPC.yenidenAdlandir, async (_e, yol: string, yeniAd: string) => {
    const yeni = await yenidenAdlandir(yol, yeniAd)
    await yollariGuncelle([{ eski: yol, yeni }])
    return yeni
  })

  ipcMain.handle(IPC.tasi, async (_e, yollar: string[], hedef: string) => {
    const sonuc = await tasi(yollar, hedef)
    await yollariGuncelle(sonuc)
    return sonuc.map((s) => s.yeni)
  })

  ipcMain.handle(IPC.dosyaAc, async (_e, yol: string) => {
    const hata = await shell.openPath(yol)
    if (hata) throw new Error(hata)
  })
  ipcMain.handle(IPC.klasordeGoster, (_e, yol: string) => shell.showItemInFolder(yol))

  ipcMain.handle(IPC.klasorSec, async (e) => {
    const pencere = BrowserWindow.fromWebContents(e.sender)
    const secenekler = { properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
    const r = pencere ? await dialog.showOpenDialog(pencere, secenekler) : await dialog.showOpenDialog(secenekler)
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle(IPC.taramaBaslat, async (_e, kokler?: string[]) => {
    if (aktifTarama) throw new Error('Zaten bir tarama sürüyor')
    if (!kokler?.length) kokler = (await durumOku()).kaynaklar
    if (!kokler.length) kokler = (await onemliKlasorleriGetir()).filter((k) => k.kaynak !== 'surucu').map((k) => k.yol)

    const tarama = (aktifTarama = { iptal: false })
    try {
      const sonuc = await tara(kokler, {
        ilerleme: (i) => yayinla('tarama:ilerleme', i),
        iptalEdildi: () => tarama.iptal,
      })
      return await dizinYaz(kokler, sonuc.dosyalar, sonuc.kesildi)
    } finally {
      aktifTarama = null
    }
  })
  ipcMain.handle(IPC.taramaIptal, () => {
    if (aktifTarama) aktifTarama.iptal = true
  })
  ipcMain.handle(IPC.dizinOzeti, () => dizinOzeti())
  ipcMain.handle(IPC.dosyaSorgula, (_e, q: DosyaSorgusu) => dosyaSorgula(q))

  surucuIzle(() => yayinla('suruculer:degisti', null))
}
