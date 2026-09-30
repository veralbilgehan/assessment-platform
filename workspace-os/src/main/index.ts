import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'path'
import os from 'os'
import { IPC, type KullaniciProfili, type Tercihler } from '@shared/tipler'
import { durumOku, durumSifirla, durumYaz } from './durumDeposu'
import { dosyaIpcKaydet } from './ipc/dosyaIpc'
import { ofisIpcKaydet } from './ipc/ofisIpc'
import { aiIpcKaydet } from './ipc/aiIpc'

function pencereOlustur() {
  const pencere = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1115' : '#f5f6f8',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#8a8f98', height: 36 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  pencere.once('ready-to-show', () => pencere.show())

  // Belge içindeki bağlantılar uygulama penceresini değiştirmesin: https bağlantıları sistem tarayıcısında açılır
  pencere.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  pencere.webContents.on('will-navigate', (e, url) => {
    const uygulamaAdresi = process.env.ELECTRON_RENDERER_URL ?? 'file://'
    if (!url.startsWith(uygulamaAdresi)) e.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) pencere.loadURL(process.env.ELECTRON_RENDERER_URL)
  else pencere.loadFile(join(__dirname, '../renderer/index.html'))
}

function ipcKaydet() {
  ipcMain.handle(IPC.durumGetir, () => durumOku())

  ipcMain.handle(IPC.kurulumTamamla, async (_e, profil: KullaniciProfili, tercihler: Tercihler, kaynaklar: string[] = []) => {
    if (!profil?.ad?.trim()) throw new Error('İsim zorunludur')
    const mevcut = await durumOku()
    return durumYaz({
      ...mevcut,
      kurulumTamamlandi: true,
      profil: { ...profil, ad: profil.ad.trim(), soyad: profil.soyad?.trim() ?? '' },
      tercihler,
      kaynaklar,
      kurulumTarihi: new Date().toISOString(),
    })
  })

  ipcMain.handle(IPC.kurulumSifirla, () => durumSifirla())

  ipcMain.handle(IPC.tercihleriKaydet, async (_e, tercihler: Tercihler) => durumYaz({ ...(await durumOku()), tercihler }))

  ipcMain.handle(IPC.kaynaklariKaydet, async (_e, kaynaklar: string[]) => durumYaz({ ...(await durumOku()), kaynaklar }))

  ipcMain.handle(IPC.sistemBilgisi, () => ({
    kullaniciAdi: os.userInfo().username,
    platform: process.platform,
    bilgisayarAdi: os.hostname(),
  }))
}

app.whenReady().then(() => {
  ipcKaydet()
  dosyaIpcKaydet()
  ofisIpcKaydet()
  aiIpcKaydet()
  pencereOlustur()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) pencereOlustur()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
