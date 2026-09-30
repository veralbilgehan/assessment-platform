import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type WorkspaceApi } from '@shared/tipler'

// Renderer yalnızca bu dar API'yi görür; Node/fs erişimi main süreçte kalır.
const api: WorkspaceApi = {
  durumGetir: () => ipcRenderer.invoke(IPC.durumGetir),
  kurulumTamamla: (profil, tercihler) => ipcRenderer.invoke(IPC.kurulumTamamla, profil, tercihler),
  kurulumSifirla: () => ipcRenderer.invoke(IPC.kurulumSifirla),
  sistemBilgisi: () => ipcRenderer.invoke(IPC.sistemBilgisi),
}

contextBridge.exposeInMainWorld('workspace', api)
