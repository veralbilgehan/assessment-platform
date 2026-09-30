import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, OLAY_KANALLARI, type WorkspaceApi } from '@shared/tipler'

// Renderer yalnızca bu dar API'yi görür; Node/fs erişimi main süreçte kalır.
const api: WorkspaceApi = {
  durumGetir: () => ipcRenderer.invoke(IPC.durumGetir),
  kurulumTamamla: (profil, tercihler, kaynaklar) => ipcRenderer.invoke(IPC.kurulumTamamla, profil, tercihler, kaynaklar),
  kurulumSifirla: () => ipcRenderer.invoke(IPC.kurulumSifirla),
  kaynaklariKaydet: (kaynaklar) => ipcRenderer.invoke(IPC.kaynaklariKaydet, kaynaklar),
  sistemBilgisi: () => ipcRenderer.invoke(IPC.sistemBilgisi),

  suruculeriGetir: () => ipcRenderer.invoke(IPC.suruculeriGetir),
  onemliKlasorler: () => ipcRenderer.invoke(IPC.onemliKlasorler),
  klasorListele: (yol, gizliGoster) => ipcRenderer.invoke(IPC.klasorListele, yol, gizliGoster),
  klasorOlustur: (ustYol, ad) => ipcRenderer.invoke(IPC.klasorOlustur, ustYol, ad),
  yenidenAdlandir: (yol, yeniAd) => ipcRenderer.invoke(IPC.yenidenAdlandir, yol, yeniAd),
  tasi: (yollar, hedef) => ipcRenderer.invoke(IPC.tasi, yollar, hedef),
  dosyaAc: (yol) => ipcRenderer.invoke(IPC.dosyaAc, yol),
  klasordeGoster: (yol) => ipcRenderer.invoke(IPC.klasordeGoster, yol),
  klasorSec: () => ipcRenderer.invoke(IPC.klasorSec),

  taramaBaslat: (kokler) => ipcRenderer.invoke(IPC.taramaBaslat, kokler),
  taramaIptal: () => ipcRenderer.invoke(IPC.taramaIptal),
  dizinOzeti: () => ipcRenderer.invoke(IPC.dizinOzeti),
  dosyaSorgula: (q) => ipcRenderer.invoke(IPC.dosyaSorgula, q),

  olayDinle: (kanal, dinleyici) => {
    if (!OLAY_KANALLARI.includes(kanal)) throw new Error(`Bilinmeyen olay kanalı: ${kanal}`)
    const sarmalayici = (_e: IpcRendererEvent, veri: Parameters<typeof dinleyici>[0]) => dinleyici(veri)
    ipcRenderer.on(kanal, sarmalayici)
    return () => ipcRenderer.removeListener(kanal, sarmalayici)
  },
}

contextBridge.exposeInMainWorld('workspace', api)
