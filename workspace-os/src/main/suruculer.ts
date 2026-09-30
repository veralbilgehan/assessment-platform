import { app } from 'electron'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import type { OnemliKlasor, Surucu, SurucuTuru } from '@shared/tipler'
import { gizliMi } from './dosyaIslemleri'

const WIN = process.platform === 'win32'

async function varMi(yol: string) {
  try {
    await fs.access(yol)
    return true
  } catch {
    return false
  }
}

async function alanBilgisi(yol: string): Promise<Pick<Surucu, 'toplamBayt' | 'bosBayt'>> {
  try {
    const s = await fs.statfs(yol)
    return { toplamBayt: s.blocks * s.bsize, bosBayt: s.bavail * s.bsize }
  } catch {
    return {}
  }
}

// ── Windows ───────────────────────────────────────────────────
// DriveType: 2=çıkarılabilir (USB bellek), 3=sabit, 4=ağ, 5=optik.
// USB'ye takılı harici hard diskler "sabit" görünür; BusType=USB ile ayırt edilir.
const WIN_BETIK = `
$ErrorActionPreference='SilentlyContinue'
$bus=@{}
Get-Partition | Where-Object DriveLetter | ForEach-Object { $bus[[string]$_.DriveLetter]=[string](Get-Disk -Number $_.DiskNumber).BusType }
@(Get-CimInstance Win32_LogicalDisk | ForEach-Object { [pscustomobject]@{ harf=$_.DeviceID; etiket=$_.VolumeName; tip=[int]$_.DriveType; boyut=$_.Size; bos=$_.FreeSpace; bus=$bus[$_.DeviceID.Substring(0,1)] } }) | ConvertTo-Json -Compress
`

interface HamDisk {
  harf: string
  etiket: string | null
  tip: number
  boyut: number | null
  bos: number | null
  bus: string | null
}

const VARSAYILAN_AD: Record<SurucuTuru, string> = {
  sistem: 'Sistem Diski',
  yerel: 'Yerel Disk',
  usb: 'USB Bellek',
  harici: 'Harici Disk',
  ag: 'Ağ Sürücüsü',
  optik: 'Optik Sürücü',
  bulut: 'Bulut',
}

function powershell(betik: string): Promise<string> {
  return new Promise((coz, reddet) =>
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', betik],
      { timeout: 15000, windowsHide: true, maxBuffer: 1 << 20 },
      (hata, cikti) => (hata ? reddet(hata) : coz(cikti)),
    ),
  )
}

async function mevcutHarfler(): Promise<string[]> {
  const harfler = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i) + ':')
  const var_ = await Promise.all(harfler.map((h) => varMi(h + '\\')))
  return harfler.filter((_, i) => var_[i])
}

async function windowsSuruculeri(): Promise<Surucu[]> {
  let ham: HamDisk[]
  try {
    const json = JSON.parse((await powershell(WIN_BETIK)).trim() || '[]')
    ham = Array.isArray(json) ? json : [json]
  } catch {
    // PowerShell yoksa/engelliyse: harf taraması ile temel liste
    ham = (await mevcutHarfler()).map((harf) => ({ harf, etiket: null, tip: 3, boyut: null, bos: null, bus: null }))
  }

  const sistemHarfi = (process.env.SystemDrive ?? 'C:').toUpperCase()
  const liste: Surucu[] = []
  for (const d of ham) {
    if (d.tip === 5 && !d.boyut) continue // boş optik sürücü
    const harf = d.harf.toUpperCase()
    const etiket = d.etiket?.trim() ?? ''
    const googleDrive = /google drive/i.test(etiket)
    const tur: SurucuTuru = googleDrive
      ? 'bulut'
      : d.tip === 2 ? 'usb'
      : d.tip === 4 ? 'ag'
      : d.tip === 5 ? 'optik'
      : harf === sistemHarfi ? 'sistem'
      : d.bus === 'USB' ? 'harici'
      : 'yerel'

    let yol = harf + '\\'
    if (googleDrive) {
      for (const alt of ['My Drive', "Drive'ım"]) if (await varMi(yol + alt)) yol += alt
    }
    const alan = d.boyut ? { toplamBayt: d.boyut, bosBayt: d.bos ?? undefined } : await alanBilgisi(yol)
    liste.push({
      id: harf,
      ad: `${etiket || VARSAYILAN_AD[tur]} (${harf})`,
      yol,
      tur,
      saglayici: googleDrive ? 'google-drive' : undefined,
      ...alan,
    })
  }
  return liste
}

// ── macOS / Linux (geliştirme ortamı için) ─────────────────────
function baglamaKokleri() {
  if (process.platform === 'darwin') return ['/Volumes']
  const k = os.userInfo().username
  return [`/media/${k}`, `/run/media/${k}`, '/mnt']
}

async function unixSuruculeri(): Promise<Surucu[]> {
  const liste: Surucu[] = [{ id: '/', ad: 'Sistem Diski', yol: '/', tur: 'sistem', ...(await alanBilgisi('/')) }]
  for (const kok of baglamaKokleri()) {
    let adlar: string[]
    try {
      adlar = await fs.readdir(kok)
    } catch {
      continue
    }
    for (const ad of adlar) {
      if (ad === 'Macintosh HD') continue
      const yol = path.join(kok, ad)
      liste.push({ id: yol, ad, yol, tur: 'usb', ...(await alanBilgisi(yol)) })
    }
  }
  return liste
}

// ── Bulut senkron klasörleri ──────────────────────────────────
// Google Drive for Desktop ve OneDrive, dosyaları yerel bir klasöre/sürücüye yansıtır.
// Gerçek API entegrasyonu (oturum açma, çevrimiçi dosyalar) Modül 4'te eklenecek.
async function bulutKlasorleri(): Promise<Surucu[]> {
  const ev = os.homedir()
  const adaylar: { yol?: string; ad: string; saglayici: 'google-drive' | 'onedrive' }[] = [
    { yol: process.env.OneDriveConsumer, ad: 'OneDrive', saglayici: 'onedrive' },
    { yol: process.env.OneDriveCommercial, ad: 'OneDrive (İş)', saglayici: 'onedrive' },
    { yol: process.env.OneDrive, ad: 'OneDrive', saglayici: 'onedrive' },
    { yol: path.join(ev, 'OneDrive'), ad: 'OneDrive', saglayici: 'onedrive' },
    { yol: path.join(ev, 'Google Drive'), ad: 'Google Drive', saglayici: 'google-drive' },
    { yol: path.join(ev, 'My Drive'), ad: 'Google Drive', saglayici: 'google-drive' },
  ]
  // macOS: ~/Library/CloudStorage/GoogleDrive-xxx, OneDrive-xxx
  try {
    for (const ad of await fs.readdir(path.join(ev, 'Library', 'CloudStorage'))) {
      const yol = path.join(ev, 'Library', 'CloudStorage', ad)
      if (ad.startsWith('GoogleDrive')) adaylar.push({ yol, ad: 'Google Drive', saglayici: 'google-drive' })
      if (ad.startsWith('OneDrive')) adaylar.push({ yol, ad: 'OneDrive', saglayici: 'onedrive' })
    }
  } catch {
    /* klasör yok */
  }

  const gorulen = new Set<string>()
  const liste: Surucu[] = []
  for (const a of adaylar) {
    if (!a.yol) continue
    const anahtar = path.resolve(a.yol).toLowerCase()
    if (gorulen.has(anahtar) || !(await varMi(a.yol))) continue
    gorulen.add(anahtar)
    liste.push({ id: a.yol, ad: a.ad, yol: a.yol, tur: 'bulut', saglayici: a.saglayici })
  }
  return liste
}

export async function suruculeriGetir(): Promise<Surucu[]> {
  const [diskler, bulut] = await Promise.all([WIN ? windowsSuruculeri() : unixSuruculeri(), bulutKlasorleri()])
  return [...diskler, ...bulut]
}

// ── Önemli klasör tespiti ─────────────────────────────────────
const SISTEM_KLASORLERI = new Set([
  'windows', 'program files', 'program files (x86)', 'programdata', 'perflogs', 'recovery', 'users', 'intel', 'amd',
  'nvidia', 'msocache', 'boot', 'documents and settings', 'onedrivetemp', 'xboxgames', 'windowsapps', 'drivers', 'esd',
  'proc', 'sys', 'dev', 'bin', 'sbin', 'lib', 'lib32', 'lib64', 'libx32', 'usr', 'etc', 'var', 'run', 'tmp', 'snap',
  'opt', 'srv', 'lost+found', 'root', 'home', 'mnt', 'media', 'volumes', 'system', 'library', 'applications',
  'private', 'cores', 'nix', 'bin.usr-is-merged', 'lib.usr-is-merged', 'sbin.usr-is-merged',
])

const BILINEN_KLASORLER = [
  ['desktop', 'Masaüstü', '🖥️'],
  ['documents', 'Belgeler', '📄'],
  ['downloads', 'İndirilenler', '⬇️'],
  ['pictures', 'Resimler', '🖼️'],
  ['videos', 'Videolar', '🎬'],
  ['music', 'Müzik', '🎵'],
] as const

/** Windows bilinen klasörü. XDG yapılandırması olmayan Linux'ta getPath ev dizinine düşer → standart ada geri çekil. */
export function bilinenKlasor(anahtar: (typeof BILINEN_KLASORLER)[number][0]): string {
  let yol: string | null = null
  try {
    yol = app.getPath(anahtar)
  } catch {
    /* platformda tanımlı değil */
  }
  return !yol || yol === os.homedir() ? path.join(os.homedir(), anahtar[0].toUpperCase() + anahtar.slice(1)) : yol
}

/**
 * "Önemli" klasörler üç kaynaktan gelir:
 * 1. Windows bilinen klasörleri (OneDrive yönlendirmesi dahil — app.getPath bunu takip eder)
 * 2. Bulut senkron klasörleri
 * 3. Her sürücünün kökündeki sistem dışı klasörler, son değişiklik tarihine göre (en aktif 6)
 */
export async function onemliKlasorleriGetir(suruculer?: Surucu[]): Promise<OnemliKlasor[]> {
  const liste: OnemliKlasor[] = []
  for (const [anahtar, ad, ikon] of BILINEN_KLASORLER) {
    const yol = bilinenKlasor(anahtar)
    if (await varMi(yol)) liste.push({ ad, yol, ikon, kaynak: 'sistem' })
  }

  suruculer ??= await suruculeriGetir()
  for (const s of suruculer.filter((s) => s.tur === 'bulut')) liste.push({ ad: s.ad, yol: s.yol, ikon: '☁️', kaynak: 'bulut' })

  for (const s of suruculer.filter((s) => ['sistem', 'yerel', 'harici', 'usb'].includes(s.tur))) {
    let girdiler
    try {
      girdiler = await fs.readdir(s.yol, { withFileTypes: true })
    } catch {
      continue
    }
    const adaylar = await Promise.all(
      girdiler
        .filter((g) => g.isDirectory() && !gizliMi(g.name) && !SISTEM_KLASORLERI.has(g.name.toLowerCase()))
        .map(async (g) => {
          const yol = path.join(s.yol, g.name)
          try {
            return { yol, ad: g.name, zaman: (await fs.stat(yol)).mtimeMs }
          } catch {
            return null
          }
        }),
    )
    adaylar
      .filter((a) => a !== null)
      .sort((a, b) => b.zaman - a.zaman)
      .slice(0, 6)
      .forEach((a) => liste.push({ ad: `${a.ad} · ${s.id === '/' ? '/' : s.id}`, yol: a.yol, ikon: '📁', kaynak: 'surucu' }))
  }

  const gorulen = new Set<string>()
  return liste.filter((k) => {
    const a = path.resolve(k.yol).toLowerCase()
    return gorulen.has(a) ? false : (gorulen.add(a), true)
  })
}

// ── Takılma/çıkarılma izleme ──────────────────────────────────
// Ucuz bir imza (mevcut sürücü harfleri / bağlama noktaları) periyodik karşılaştırılır;
// değişince tam liste renderer tarafından yeniden istenir.
async function surucuImzasi(): Promise<string> {
  if (WIN) return (await mevcutHarfler()).join(',')
  const parcalar: string[] = []
  for (const kok of baglamaKokleri()) {
    try {
      parcalar.push(...(await fs.readdir(kok)).map((a) => path.join(kok, a)))
    } catch {
      /* yok */
    }
  }
  return parcalar.join(',')
}

export function surucuIzle(degisti: () => void, aralikMs = 4000): () => void {
  let onceki: string | null = null
  const kontrol = async () => {
    const imza = await surucuImzasi()
    if (onceki !== null && imza !== onceki) degisti()
    onceki = imza
  }
  kontrol()
  const zamanlayici = setInterval(kontrol, aralikMs)
  return () => clearInterval(zamanlayici)
}
