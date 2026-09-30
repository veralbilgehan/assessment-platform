import { promises as fs } from 'fs'
import path from 'path'
import { editorBul, type BelgeIcerigi, type EditorTuru } from '@shared/ofis'
import { wordOku, wordYaz } from './word'
import { csvOku, csvYaz, xlsxOku, xlsxYaz } from './tablo'
import { pptxOku, pptxYaz } from './sunum'

// Uzantıya göre doğru okuyucu/yazıcıya yönlendirir. Yeni biçim eklemek = buraya bir dal.

export async function belgeOku(yol: string): Promise<BelgeIcerigi> {
  const uzanti = path.extname(yol).slice(1).toLowerCase()
  switch (editorBul(yol)) {
    case 'word':
      return { tur: 'word', html: await wordOku(yol) }
    case 'excel':
      return uzanti === 'csv' ? csvOku(yol) : xlsxOku(yol)
    case 'sunum':
      return pptxOku(yol)
    case 'metin':
      return { tur: 'metin', metin: (await fs.readFile(yol, 'utf-8')).replace(/^﻿/, '') }
    default:
      throw new Error('Bu dosya türü Workspace içinde düzenlenemiyor')
  }
}

export async function belgeYaz(yol: string, icerik: BelgeIcerigi, mevcutMu: boolean) {
  const beklenen: EditorTuru | null = editorBul(yol)
  if (beklenen !== icerik.tur) throw new Error(`"${path.basename(yol)}" bu belge türüyle kaydedilemez`)
  switch (icerik.tur) {
    case 'word':
      return wordYaz(yol, icerik.json)
    case 'excel':
      return path.extname(yol).toLowerCase() === '.csv' ? csvYaz(yol, icerik) : xlsxYaz(yol, icerik, mevcutMu)
    case 'sunum':
      return pptxYaz(yol, icerik)
    case 'metin':
      return fs.writeFile(yol, icerik.metin, 'utf-8')
  }
}
