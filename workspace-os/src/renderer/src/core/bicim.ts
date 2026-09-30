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
