import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/tipler'
import { VARSAYILAN_AI_MODELI, type AiIstegi, type IstemSablonu } from '@shared/ai'
import { durumOku } from '../durumDeposu'
import { anahtarSil, anahtarYaz, durum } from '../ai/anahtar'
import { istemleriGetir, istemleriKaydet } from '../ai/istemler'
import { anahtarDogrula, iptalEt, oneriUret, uret } from '../ai/servis'

const secilenModel = async () => (await durumOku()).tercihler.aiModel || VARSAYILAN_AI_MODELI

export function aiIpcKaydet() {
  ipcMain.handle(IPC.aiDurum, () => durum())

  ipcMain.handle(IPC.aiAnahtarKaydet, async (_e, anahtar: string) => {
    anahtar = anahtar.trim()
    if (!anahtar.startsWith('sk-ant-')) throw new Error('Bu bir Claude API anahtarına benzemiyor (sk-ant- ile başlamalı).')
    await anahtarDogrula(anahtar, await secilenModel())
    await anahtarYaz(anahtar)
    return durum()
  })

  ipcMain.handle(IPC.aiAnahtarSil, async () => {
    await anahtarSil()
    return durum()
  })

  ipcMain.handle(IPC.aiIstemler, () => istemleriGetir())
  ipcMain.handle(IPC.aiIstemleriKaydet, (_e, liste: IstemSablonu[] | null) => istemleriKaydet(liste))

  ipcMain.handle(IPC.aiUret, async (e, istek: AiIstegi) => {
    const pencere = BrowserWindow.fromWebContents(e.sender)
    return uret(istek, await secilenModel(), (metin) => {
      if (pencere && !pencere.isDestroyed()) pencere.webContents.send('ai:parca', { id: istek.id, metin })
    })
  })

  ipcMain.handle(IPC.aiIptal, (_e, id: string) => iptalEt(id))
  ipcMain.handle(IPC.aiOneriler, async (_e, istek: Omit<AiIstegi, 'id' | 'talimat' | 'cikti'>) => oneriUret(istek, await secilenModel()))
}
