import { promises as fs } from 'fs'
import ExcelJS from 'exceljs'
import type { Sayfa, TabloBelgesi } from '@shared/ofis'

// .xlsx ↔ editör (exceljs) ve .csv.
// Kaydederken mevcut dosya yeniden açılıp yalnızca hücre değerleri güncellenir:
// sütun genişlikleri, renkler, yazı tipleri gibi biçimler korunur.

function hamDeger(h: ExcelJS.Cell): string {
  if (h.formula) return '=' + h.formula
  const v = h.value
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('')
    if ('text' in v) return String(v.text)
    if ('error' in v) return String(v.error)
    if ('result' in v) return String(v.result ?? '')
    return ''
  }
  if (typeof v === 'boolean') return v ? 'DOĞRU' : 'YANLIŞ'
  return String(v)
}

export async function xlsxOku(yol: string): Promise<TabloBelgesi> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(yol)
  const sayfalar: Sayfa[] = wb.worksheets.map((ws) => {
    const hucreler: Record<string, string> = {}
    ws.eachRow((satir) =>
      satir.eachCell((h) => {
        if (h.isMerged && h.master !== h) return
        const d = hamDeger(h)
        if (d !== '') hucreler[h.address] = d
      }),
    )
    return { ad: ws.name, kaynakAd: ws.name, hucreler }
  })
  return { tur: 'excel', sayfalar: sayfalar.length ? sayfalar : [{ ad: 'Sayfa1', hucreler: {} }] }
}

function yazilacakDeger(ham: string, sonuc: unknown): ExcelJS.CellValue {
  if (ham.startsWith('=')) return { formula: ham.slice(1), result: sonuc as ExcelJS.CellFormulaValue['result'] }
  if (/^-?\d+([.,]\d+)?$/.test(ham.trim())) return Number(ham.trim().replace(',', '.'))
  return ham
}

export async function xlsxYaz(yol: string, belge: TabloBelgesi, mevcutMu: boolean) {
  const wb = new ExcelJS.Workbook()
  if (mevcutMu) await wb.xlsx.readFile(yol)

  const tutulacak = new Set<number>()
  for (const s of belge.sayfalar) {
    const ws = (s.kaynakAd && wb.getWorksheet(s.kaynakAd)) || wb.addWorksheet(s.ad)
    ws.name = s.ad
    tutulacak.add(ws.id)
    // Modelde olmayan (silinmiş) hücreleri temizle
    ws.eachRow((satir) =>
      satir.eachCell((h) => {
        if (!(h.address in s.hucreler) && !(h.isMerged && h.master !== h)) h.value = null
      }),
    )
    for (const [adres, ham] of Object.entries(s.hucreler)) ws.getCell(adres).value = yazilacakDeger(ham, s.sonuclar?.[adres])
  }
  for (const ws of [...wb.worksheets]) if (!tutulacak.has(ws.id)) wb.removeWorksheet(ws.id)
  await wb.xlsx.writeFile(yol)
}

// ── CSV ───────────────────────────────────────────────────────
function csvAyiriciBul(ilkSatir: string): ',' | ';' | '\t' {
  const say = (c: string) => ilkSatir.split(c).length
  return say('\t') > say(';') && say('\t') > say(',') ? '\t' : say(';') > say(',') ? ';' : ','
}

export async function csvOku(yol: string): Promise<TabloBelgesi> {
  const metin = (await fs.readFile(yol, 'utf-8')).replace(/^﻿/, '')
  const ayirici = csvAyiriciBul(metin.split(/\r?\n/, 1)[0] ?? '')
  const hucreler: Record<string, string> = {}
  let satir = 0, sutun = 0, alan = '', tirnak = false
  const bitir = () => {
    if (alan !== '') hucreler[`${sutunHarfi(sutun)}${satir + 1}`] = alan
    alan = ''
  }
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i]
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++ }
      else if (c === '"') tirnak = false
      else alan += c
    } else if (c === '"') tirnak = true
    else if (c === ayirici) { bitir(); sutun++ }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++
      bitir(); satir++; sutun = 0
    } else alan += c
  }
  bitir()
  return { tur: 'excel', csvAyirici: ayirici, sayfalar: [{ ad: 'Sayfa1', hucreler }] }
}

function sutunHarfi(i: number): string {
  let s = ''
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
  return s
}

export async function csvYaz(yol: string, belge: TabloBelgesi) {
  const ayirici = belge.csvAyirici ?? ','
  const s = belge.sayfalar[0]
  const izgara: string[][] = []
  for (const [adres, ham] of Object.entries(s?.hucreler ?? {})) {
    const m = /^([A-Z]+)(\d+)$/.exec(adres)
    if (!m) continue
    const c = [...m[1]].reduce((n, h) => n * 26 + h.charCodeAt(0) - 64, 0) - 1
    const r = Number(m[2]) - 1
    // CSV formül saklayamaz — hesaplanmış değeri yaz
    const deger = ham.startsWith('=') ? String(s.sonuclar?.[adres] ?? '') : ham
    ;(izgara[r] ??= [])[c] = deger
  }
  const kacis = (v = '') => (/["\n\r]/.test(v) || v.includes(ayirici) ? `"${v.replace(/"/g, '""')}"` : v)
  const metin = Array.from(izgara, (satir = []) => Array.from(satir, kacis).join(ayirici)).join('\r\n')
  await fs.writeFile(yol, '﻿' + metin, 'utf-8') // BOM: Excel Türkçe karakterleri doğru açsın
}
