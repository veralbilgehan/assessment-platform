// Tablo editörünün formül motoru. Excel sözdizimi; Türkçe ve İngilizce fonksiyon adları, ',' veya ';' ayırıcı.
// Özyinelemeli iniş ile doğrudan değerlendirir (AST yok). Döngüsel başvurular #DÖNGÜ! verir.

export interface HataDegeri {
  hata: string
}
export type Deger = number | string | boolean | HataDegeri
type Arguman = Deger | Deger[]

export const hataMi = (d: unknown): d is HataDegeri => typeof d === 'object' && d !== null && 'hata' in d
const hata = (kod: string): HataDegeri => ({ hata: kod })

// ── Adres yardımcıları ────────────────────────────────────────
export function sutunHarfi(i: number): string {
  let s = ''
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
  return s
}
export function sutunNo(harf: string): number {
  return [...harf].reduce((n, h) => n * 26 + h.charCodeAt(0) - 64, 0) - 1
}
export const adres = (satir: number, sutun: number) => `${sutunHarfi(sutun)}${satir + 1}`
export function adresCoz(a: string): { satir: number; sutun: number } | null {
  const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(a.toUpperCase())
  return m ? { satir: Number(m[2]) - 1, sutun: sutunNo(m[1]) } : null
}

// ── Fonksiyonlar ──────────────────────────────────────────────
const TR_EN: Record<string, string> = {
  TOPLA: 'SUM', ORTALAMA: 'AVERAGE', MİN: 'MIN', MAK: 'MAX', BAĞ_DEĞ_SAY: 'COUNT', BAĞ_DEĞ_DOLU_SAY: 'COUNTA',
  EĞER: 'IF', YUVARLA: 'ROUND', MUTLAK: 'ABS', BİRLEŞTİR: 'CONCATENATE', VE: 'AND', YADA: 'OR', DEĞİL: 'NOT',
  UZUNLUK: 'LEN', BÜYÜKHARF: 'UPPER', KÜÇÜKHARF: 'LOWER', KAREKÖK: 'SQRT', KUVVET: 'POWER', BUGÜN: 'TODAY',
  EĞERSAY: 'COUNTIF', ETOPLA: 'SUMIF',
}

const sayilar = (args: Arguman[]) => args.flat().filter((d): d is number => typeof d === 'number')
const tekil = (a: Arguman | undefined): Deger => (Array.isArray(a) ? (a[0] ?? '') : (a ?? ''))

function sayiya(d: Deger): number | HataDegeri {
  if (hataMi(d)) return d
  if (typeof d === 'number') return d
  if (typeof d === 'boolean') return d ? 1 : 0
  if (d === '') return 0
  const n = Number(d.replace(',', '.'))
  return Number.isNaN(n) ? hata('#DEĞER!') : n
}
const metne = (d: Deger) => (typeof d === 'boolean' ? (d ? 'DOĞRU' : 'YANLIŞ') : String(d))

function kosulSaglar(d: Deger, kosul: Deger): boolean {
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(kosul))!
  const [, op = '=', hedefHam] = m
  const hedef = Number.isNaN(Number(hedefHam)) || hedefHam === '' ? hedefHam : Number(hedefHam)
  const a = typeof hedef === 'number' ? sayiya(d) : String(d).toLocaleLowerCase('tr')
  const b = typeof hedef === 'number' ? hedef : hedef.toLocaleLowerCase('tr')
  if (hataMi(a)) return false
  switch (op) {
    case '<': return a < b
    case '>': return a > b
    case '<=': return a <= b
    case '>=': return a >= b
    case '<>': return a !== b
    default: return a === b
  }
}

const FONKSIYONLAR: Record<string, (args: Arguman[]) => Deger> = {
  SUM: (a) => sayilar(a).reduce((t, n) => t + n, 0),
  AVERAGE: (a) => { const s = sayilar(a); return s.length ? s.reduce((t, n) => t + n, 0) / s.length : hata('#BÖL/0!') },
  MIN: (a) => { const s = sayilar(a); return s.length ? Math.min(...s) : 0 },
  MAX: (a) => { const s = sayilar(a); return s.length ? Math.max(...s) : 0 },
  COUNT: (a) => sayilar(a).length,
  COUNTA: (a) => a.flat().filter((d) => d !== '').length,
  IF: (a) => { const k = tekil(a[0]); return hataMi(k) ? k : (k && k !== 0 ? tekil(a[1] ?? true) : tekil(a[2] ?? false)) },
  ROUND: (a) => { const n = sayiya(tekil(a[0])); const b = sayiya(tekil(a[1] ?? 0)); if (hataMi(n)) return n; if (hataMi(b)) return b; const k = 10 ** b; return Math.round(n * k) / k },
  ABS: (a) => { const n = sayiya(tekil(a[0])); return hataMi(n) ? n : Math.abs(n) },
  SQRT: (a) => { const n = sayiya(tekil(a[0])); return hataMi(n) ? n : n < 0 ? hata('#SAYI!') : Math.sqrt(n) },
  POWER: (a) => { const n = sayiya(tekil(a[0])); const u = sayiya(tekil(a[1])); return hataMi(n) ? n : hataMi(u) ? u : n ** u },
  MOD: (a) => { const n = sayiya(tekil(a[0])); const b = sayiya(tekil(a[1])); return hataMi(n) ? n : hataMi(b) ? b : b === 0 ? hata('#BÖL/0!') : n - b * Math.floor(n / b) },
  CONCATENATE: (a) => a.flat().map(metne).join(''),
  CONCAT: (a) => a.flat().map(metne).join(''),
  AND: (a) => a.flat().every((d) => !!d && d !== 0),
  OR: (a) => a.flat().some((d) => !!d && d !== 0),
  NOT: (a) => !tekil(a[0]),
  LEN: (a) => metne(tekil(a[0])).length,
  UPPER: (a) => metne(tekil(a[0])).toLocaleUpperCase('tr'),
  LOWER: (a) => metne(tekil(a[0])).toLocaleLowerCase('tr'),
  TODAY: () => new Date().toISOString().slice(0, 10),
  COUNTIF: (a) => (Array.isArray(a[0]) ? a[0] : [a[0]]).filter((d) => kosulSaglar(d, tekil(a[1]))).length,
  SUMIF: (a) => {
    const aralik = Array.isArray(a[0]) ? a[0] : [a[0]]
    const toplam = Array.isArray(a[2]) ? a[2] : a[2] !== undefined ? [a[2]] : aralik
    return aralik.reduce<number>((t, d, i) => (kosulSaglar(d, tekil(a[1])) && typeof toplam[i] === 'number' ? t + (toplam[i] as number) : t), 0)
  },
}

// ── Değerlendirici ────────────────────────────────────────────
const JETON = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"]|"")*")|(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)(?![A-Z0-9_(])|([A-ZÇĞİÖŞÜ_][A-ZÇĞİÖŞÜ0-9_.]*)|(<>|<=|>=|[-+*/^&=<>(),;%:]))/iy

function jetonlara(f: string): string[] {
  const j: string[] = []
  JETON.lastIndex = 0
  while (JETON.lastIndex < f.length) {
    if (/^\s*$/.test(f.slice(JETON.lastIndex))) break
    const m = JETON.exec(f)
    if (!m) throw hata('#AD?')
    j.push(m[0].trim())
  }
  return j
}

class Degerlendirici {
  private i = 0
  constructor(private j: string[], private hucre: (a: string) => Deger) {}

  private bak = () => this.j[this.i]
  private al = () => this.j[this.i++]
  private bekle(t: string) {
    if (this.al() !== t) throw hata('#AD?')
  }

  calistir(): Deger {
    const d = this.karsilastirma()
    if (this.i < this.j.length) throw hata('#AD?')
    return tekil(d)
  }

  private ikili(alt: () => Arguman, ops: string[], fn: (a: Deger, b: Deger, op: string) => Deger): Arguman {
    let sol = alt()
    while (ops.includes(this.bak())) {
      const op = this.al()
      const a = tekil(sol)
      const b = tekil(alt())
      sol = hataMi(a) ? a : hataMi(b) ? b : fn(a, b, op)
    }
    return sol
  }

  private karsilastirma = (): Arguman =>
    this.ikili(this.birlestirme, ['=', '<>', '<', '>', '<=', '>='], (a, b, op) => {
      const x = typeof a === 'string' ? a.toLocaleLowerCase('tr') : a
      const y = typeof b === 'string' ? b.toLocaleLowerCase('tr') : b
      return op === '=' ? x === y : op === '<>' ? x !== y : op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y
    })

  private birlestirme = (): Arguman => this.ikili(this.toplama, ['&'], (a, b) => metne(a) + metne(b))

  private aritmetik = (a: Deger, b: Deger, op: string): Deger => {
    const x = sayiya(a)
    const y = sayiya(b)
    if (hataMi(x)) return x
    if (hataMi(y)) return y
    if (op === '+') return x + y
    if (op === '-') return x - y
    if (op === '*') return x * y
    if (op === '^') return x ** y
    return y === 0 ? hata('#BÖL/0!') : x / y
  }
  private toplama = (): Arguman => this.ikili(this.carpma, ['+', '-'], this.aritmetik)
  private carpma = (): Arguman => this.ikili(this.us, ['*', '/'], this.aritmetik)
  private us = (): Arguman => this.ikili(this.tekli, ['^'], this.aritmetik)

  private tekli = (): Arguman => {
    if (this.bak() === '-' || this.bak() === '+') {
      const op = this.al()
      const d = sayiya(tekil(this.tekli()))
      return hataMi(d) ? d : op === '-' ? -d : d
    }
    let d = this.birincil()
    if (this.bak() === '%') {
      this.al()
      const n = sayiya(tekil(d))
      d = hataMi(n) ? n : n / 100
    }
    return d
  }

  private birincil(): Arguman {
    const t = this.al()
    if (t === undefined) throw hata('#AD?')
    if (t === '(') {
      const d = this.karsilastirma()
      this.bekle(')')
      return d
    }
    if (/^\d/.test(t)) return Number(t)
    if (t.startsWith('"')) return t.slice(1, -1).replace(/""/g, '"')
    const buyuk = t.toLocaleUpperCase('tr')
    if (this.bak() === '(') {
      this.al()
      const ad = TR_EN[buyuk] ?? buyuk
      const fn = FONKSIYONLAR[ad]
      const args: Arguman[] = []
      if (this.bak() !== ')') {
        do args.push(this.karsilastirma())
        while ([',', ';'].includes(this.bak()) && this.al())
      }
      this.bekle(')')
      if (!fn) return hata('#AD?')
      const ilkHata = args.flat().find(hataMi)
      return ilkHata && ad !== 'IF' ? ilkHata : fn(args)
    }
    if (buyuk === 'TRUE' || buyuk === 'DOĞRU') return true
    if (buyuk === 'FALSE' || buyuk === 'YANLIŞ') return false
    if (t.includes(':')) return this.aralik(t)
    if (adresCoz(t)) return this.hucre(t.replace(/\$/g, '').toUpperCase())
    return hata('#AD?')
  }

  private aralik(t: string): Deger[] {
    const [a, b] = t.split(':').map(adresCoz)
    if (!a || !b) throw hata('#BAŞV!')
    const d: Deger[] = []
    for (let s = Math.min(a.satir, b.satir); s <= Math.max(a.satir, b.satir); s++)
      for (let c = Math.min(a.sutun, b.sutun); c <= Math.max(a.sutun, b.sutun); c++) d.push(this.hucre(adres(s, c)))
    return d
  }
}

function hamDeger(ham: string): Deger {
  const t = ham.trim()
  if (t === '') return ''
  if (/^-?\d+([.,]\d+)?$/.test(t)) return Number(t.replace(',', '.'))
  return ham
}

/** Tüm sayfayı hesaplar: adres → görüntülenecek değer. */
export function hesapla(hucreler: Record<string, string>): Record<string, Deger> {
  const sonuc: Record<string, Deger> = {}
  const ziyarette = new Set<string>()

  const hucre = (a: string): Deger => {
    if (a in sonuc) return sonuc[a]
    const ham = hucreler[a]
    if (ham === undefined) return ''
    if (!ham.startsWith('=')) return (sonuc[a] = hamDeger(ham))
    if (ziyarette.has(a)) return hata('#DÖNGÜ!')
    ziyarette.add(a)
    let d: Deger
    try {
      d = new Degerlendirici(jetonlara(ham.slice(1)), hucre).calistir()
    } catch (e) {
      d = hataMi(e) ? e : hata('#AD?')
    }
    ziyarette.delete(a)
    return (sonuc[a] = d)
  }

  for (const a of Object.keys(hucreler)) hucre(a)
  return sonuc
}

/** Dosyaya yazmadan önce: Türkçe fonksiyon adlarını İngilizceye, ';' ayırıcıyı ','ye çevirir (Excel dosya biçimi). */
export function formulIngilizce(formul: string): string {
  let sonuc = ''
  let tirnakta = false
  for (const parca of formul.split(/("(?:[^"]|"")*")/)) {
    tirnakta = parca.startsWith('"')
    sonuc += tirnakta
      ? parca
      : parca
          .replace(/[A-ZÇĞİÖŞÜa-zçğıöşü_][A-ZÇĞİÖŞÜa-zçğıöşü0-9_.]*(?=\s*\()/g, (ad) => TR_EN[ad.toLocaleUpperCase('tr')] ?? ad)
          .replace(/;/g, ',')
  }
  return sonuc
}

export function degerMetni(d: Deger | undefined): string {
  if (d === undefined || d === '') return ''
  if (hataMi(d)) return d.hata
  if (typeof d === 'number') return Number.isFinite(d) ? d.toLocaleString('tr-TR', { maximumFractionDigits: 10 }) : '#SAYI!'
  return metne(d)
}
