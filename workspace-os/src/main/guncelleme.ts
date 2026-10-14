import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { GuncellemeDurumu } from '@shared/tipler'
import { bekleyenleriGonder } from './bulut/senkron'

// Otomatik güncelleme (electron-updater, GitHub Releases). Yalnızca kurulmuş (paketlenmiş) uygulamada çalışır.
// Yeni sürüm arka planda indirilir; kullanıcı "Yeniden başlat" deyince ya da uygulama kapanınca kurulur.

const ILK_KONTROL_MS = 15_000
const KONTROL_ARALIGI_MS = 4 * 60 * 60_000

let durum: GuncellemeDurumu = { durum: app.isPackaged ? 'bekliyor' : 'gelistirme', surum: app.getVersion() }

function ayarla(d: Omit<GuncellemeDurumu, 'surum'>) {
  durum = { ...d, surum: app.getVersion() }
  for (const p of BrowserWindow.getAllWindows()) p.webContents.send('guncelleme:durum', durum)
}

export const guncellemeDurumu = () => durum

/** electron-updater hatalarını kullanıcıya anlamlı duruma çevirir */
function hataDurumu(e: unknown): Omit<GuncellemeDurumu, 'surum'> {
  const m = e instanceof Error ? e.message : String(e)
  if (/No published versions|latest\.yml.*404|HttpError: 404/i.test(m)) return { durum: 'guncel', mesaj: 'Henüz yayınlanmış bir sürüm yok.' }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|net::ERR_/i.test(m)) return { durum: 'hata', mesaj: 'Güncelleme sunucusuna bağlanılamadı. İnternet bağlantını kontrol et.' }
  return { durum: 'hata', mesaj: m.split('\n')[0].slice(0, 300) }
}

export function guncellemeyiBaslat(otomatikMi: () => Promise<boolean>) {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => ayarla({ durum: 'kontrol' }))
  autoUpdater.on('update-not-available', () => ayarla({ durum: 'guncel' }))
  autoUpdater.on('update-available', (b) => ayarla({ durum: 'indiriliyor', yeniSurum: b.version, yuzde: 0 }))
  autoUpdater.on('download-progress', (p) => ayarla({ durum: 'indiriliyor', yeniSurum: durum.yeniSurum, yuzde: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (b) => ayarla({ durum: 'hazir', yeniSurum: b.version }))
  autoUpdater.on('error', (e) => ayarla(hataDurumu(e)))

  const kontrol = async () => {
    if (await otomatikMi()) autoUpdater.checkForUpdates().catch(() => {}) // hata olayı zaten yayınlanır
  }
  setTimeout(kontrol, ILK_KONTROL_MS)
  setInterval(kontrol, KONTROL_ARALIGI_MS)
}

export async function guncellemeKontrolEt() {
  if (!app.isPackaged) throw new Error('Geliştirme sürümünde güncelleme denetlenmez. Kurulum dosyasıyla yüklenen uygulamada çalışır.')
  try {
    // Güncelleyici bu kurulum türünde etkin değilse (ör. Linux klasör paketi) sonuç boş döner
    if (!(await autoUpdater.checkForUpdates())) ayarla({ durum: 'hata', mesaj: 'Bu kurulum türü otomatik güncellemeyi desteklemiyor; Windows kurulum dosyasıyla yüklenen uygulamada çalışır.' })
  } catch (e) {
    ayarla(hataDurumu(e))
  }
  return durum
}

export async function guncellemeyiKur() {
  if (durum.durum !== 'hazir') throw new Error('Kurulacak bir güncelleme yok.')
  await bekleyenleriGonder() // buluta gönderilmeyi bekleyen değişiklikler kaybolmasın
  autoUpdater.quitAndInstall(false, true) // sessiz değil (kurulum ekranı görünür), sonra uygulamayı aç
}
