const BIRIMLER = ['B', 'KB', 'MB', 'GB', 'TB']

export function boyutBicimle(bayt: number): string {
  if (!bayt) return '0 B'
  const i = Math.min(Math.floor(Math.log(bayt) / Math.log(1024)), BIRIMLER.length - 1)
  return `${(bayt / 1024 ** i).toLocaleString('tr-TR', { maximumFractionDigits: i < 2 ? 0 : 1 })} ${BIRIMLER[i]}`
}

export function tarihBicimle(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}

/** IPC hatalarındaki "Error invoking remote method '...': Error:" önekini temizler. */
export function hataMesaji(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

/** "az önce", "3 saat önce", "2 gün önce" … */
export function goreliZaman(ms: number): string {
  const fark = (Date.now() - ms) / 1000
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
  if (fark < 60) return 'az önce'
  if (fark < 3600) return rtf.format(-Math.floor(fark / 60), 'minute')
  if (fark < 86400) return rtf.format(-Math.floor(fark / 3600), 'hour')
  if (fark < 86400 * 30) return rtf.format(-Math.floor(fark / 86400), 'day')
  return new Date(ms).toLocaleDateString('tr-TR', { dateStyle: 'medium' })
}
