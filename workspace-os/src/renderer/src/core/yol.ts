// Renderer'da Node 'path' modülü yok — Windows (\) ve POSIX (/) yolları için küçük yardımcılar.

const ayrac = (yol: string) => (yol.includes('\\') ? '\\' : '/')

/** 'C:\Users\ali' → [{C:\}, {C:\Users}, {C:\Users\ali}] */
export function yolParcalari(yol: string): { ad: string; yol: string }[] {
  const a = ayrac(yol)
  const posix = yol.startsWith('/')
  const sonuc: { ad: string; yol: string }[] = posix ? [{ ad: '/', yol: '/' }] : []
  let birikim = posix ? '/' : ''
  yol.split(/[\\/]/).filter(Boolean).forEach((p, i) => {
    birikim = i === 0 && !posix ? p + a : birikim + (birikim.endsWith(a) ? '' : a) + p
    sonuc.push({ ad: p, yol: birikim })
  })
  return sonuc
}

export function ustKlasor(yol: string): string | null {
  const p = yolParcalari(yol)
  return p.length > 1 ? p[p.length - 2].yol : null
}

export function sonParca(yol: string): string {
  const p = yolParcalari(yol)
  return p[p.length - 1]?.ad ?? yol
}
