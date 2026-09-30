import { promises as fs } from 'fs'
import mammoth from 'mammoth'
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, LevelFormat, Packer, Paragraph, Table, TableCell,
  TableRow, TextRun, WidthType, type IRunOptions, type ParagraphChild,
} from 'docx'

// .docx ↔ editör. Okuma: mammoth (docx → HTML). Yazma: TipTap JSON ağacı → docx kütüphanesi.
// Başlıklar Word'ün yerleşik "Başlık 1-3" stillerine, listeler gerçek Word numaralandırmasına eşlenir.

export async function wordOku(yol: string): Promise<string> {
  const { value } = await mammoth.convertToHtml({ path: yol })
  return value
}

interface Dugum {
  type: string
  attrs?: Record<string, unknown>
  content?: Dugum[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

const HIZALAMA = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const
const BASLIKLAR = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]
const RESIM_TURLERI: Record<string, 'png' | 'jpg' | 'gif' | 'bmp'> = { png: 'png', jpeg: 'jpg', jpg: 'jpg', gif: 'gif', bmp: 'bmp' }
const MAKS_RESIM_GENISLIK = 600

type Blok = Paragraph | Table
interface ListeBaglami {
  tur: 'madde' | 'numara'
  seviye: number
  ornek: number // numaralı listelerde her liste 1'den başlasın
}

class Donusturucu {
  private listeSayaci = 0

  satirIcleri(dugumler: Dugum[] = [], ek: Partial<IRunOptions> = {}): ParagraphChild[] {
    return dugumler.map((d) => {
      if (d.type === 'hardBreak') return new TextRun({ text: '', break: 1 })
      const m = new Set(d.marks?.map((x) => x.type))
      return new TextRun({
        text: d.text ?? '',
        bold: m.has('bold') || undefined,
        italics: m.has('italic') || undefined,
        underline: m.has('underline') ? {} : undefined,
        strike: m.has('strike') || undefined,
        font: m.has('code') ? 'Consolas' : undefined,
        ...ek,
      })
    })
  }

  private hizala(d: Dugum) {
    return HIZALAMA[d.attrs?.textAlign as keyof typeof HIZALAMA]
  }

  private listeOzellikleri(l?: ListeBaglami) {
    if (!l) return {}
    return l.tur === 'madde'
      ? { bullet: { level: l.seviye } }
      : { numbering: { reference: 'numarali', level: l.seviye, instance: l.ornek } }
  }

  bloklar(d: Dugum, liste?: ListeBaglami): Blok[] {
    switch (d.type) {
      case 'doc':
        return (d.content ?? []).flatMap((c) => this.bloklar(c))
      case 'paragraph':
        return [new Paragraph({ children: this.satirIcleri(d.content), alignment: this.hizala(d), ...this.listeOzellikleri(liste) })]
      case 'heading':
        return [new Paragraph({ children: this.satirIcleri(d.content), heading: BASLIKLAR[Number(d.attrs?.level ?? 1) - 1], alignment: this.hizala(d) })]
      case 'bulletList':
      case 'orderedList': {
        const yeni: ListeBaglami = {
          tur: d.type === 'bulletList' ? 'madde' : 'numara',
          seviye: liste ? liste.seviye + 1 : 0,
          ornek: d.type === 'orderedList' && !liste ? ++this.listeSayaci : (liste?.ornek ?? 0),
        }
        return (d.content ?? []).flatMap((oge) => (oge.content ?? []).flatMap((c) => this.bloklar(c, yeni)))
      }
      case 'blockquote':
        return (d.content ?? []).map(
          (c) => new Paragraph({
            children: this.satirIcleri(c.content, { italics: true }),
            indent: { left: 720 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'AAAAAA', space: 8 } },
          }),
        )
      case 'codeBlock':
        return (d.content?.[0]?.text ?? '').split('\n').map(
          (satir) => new Paragraph({ children: [new TextRun({ text: satir, font: 'Consolas', size: 20 })], shading: { fill: 'F3F4F6' } }),
        )
      case 'horizontalRule':
        return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 1 } } })]
      case 'image':
        return this.resim(d)
      case 'table':
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: (d.content ?? []).map(
              (satir) => new TableRow({
                tableHeader: satir.content?.every((h) => h.type === 'tableHeader') || undefined, // false bile yazılırsa Word satırı başlık sayar
                children: (satir.content ?? []).map((h) => {
                  const icerik = (h.content ?? []).flatMap((c) => this.bloklar(c)).filter((b): b is Paragraph => b instanceof Paragraph)
                  return new TableCell({
                    children: icerik.length ? icerik : [new Paragraph('')],
                    columnSpan: Number(h.attrs?.colspan ?? 1),
                    rowSpan: Number(h.attrs?.rowspan ?? 1),
                    shading: h.type === 'tableHeader' ? { fill: 'F3F4F6' } : undefined,
                  })
                }),
              }),
            ),
          }),
        ]
      default:
        return d.content ? (d.content ?? []).flatMap((c) => this.bloklar(c, liste)) : []
    }
  }

  private resim(d: Dugum): Blok[] {
    const m = /^data:image\/(\w+);base64,(.+)$/.exec(String(d.attrs?.src ?? ''))
    const tur = m && RESIM_TURLERI[m[1].toLowerCase()]
    if (!m || !tur) return [] // SVG ve harici URL'ler desteklenmiyor
    let genislik = Number(d.attrs?.width) || MAKS_RESIM_GENISLIK
    let yukseklik = Number(d.attrs?.height) || Math.round(genislik * 0.66)
    if (genislik > MAKS_RESIM_GENISLIK) {
      yukseklik = Math.round((yukseklik * MAKS_RESIM_GENISLIK) / genislik)
      genislik = MAKS_RESIM_GENISLIK
    }
    return [new Paragraph({ children: [new ImageRun({ type: tur, data: Buffer.from(m[2], 'base64'), transformation: { width: genislik, height: yukseklik } })] })]
  }
}

export async function wordYaz(yol: string, json: unknown) {
  const govde = new Donusturucu().bloklar((json as Dugum) ?? { type: 'doc' })
  const belge = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    numbering: {
      config: [
        {
          reference: 'numarali',
          levels: Array.from({ length: 9 }, (_, l) => ({
            level: l,
            format: LevelFormat.DECIMAL,
            text: `%${l + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: govde.length ? govde : [new Paragraph('')] }],
  })
  await fs.writeFile(yol, await Packer.toBuffer(belge))
}
