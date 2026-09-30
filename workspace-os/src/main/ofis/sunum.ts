import { promises as fs } from 'fs'
import JSZip from 'jszip'
import PptxGenJS from 'pptxgenjs'
import { SUNUM_TEMALARI, type Slayt, type SunumBelgesi, type SunumTemaId } from '@shared/ofis'

// .pptx ↔ editör. Okuma: slayt XML'lerinden başlık + madde metinleri (JSZip).
// Yazma: pptxgenjs ile temalı slaytlar. Tema, belge "konu" alanında saklanır ki tekrar açılınca korunsun.

const TEMA_ONEKI = 'workspace-tema:'

const coz = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function paragraflar(xml: string): string[] {
  return (xml.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? [])
    .map((p) => coz((p.match(/<a:t>([^<]*)<\/a:t>/g) ?? []).map((t) => t.slice(5, -6)).join('')).trim())
    .filter(Boolean)
}

export async function pptxOku(yol: string): Promise<SunumBelgesi> {
  const zip = await JSZip.loadAsync(await fs.readFile(yol))
  const slaytDosyalari = Object.keys(zip.files)
    .filter((a) => /^ppt\/slides\/slide\d+\.xml$/.test(a))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))

  const slaytlar: Slayt[] = []
  for (const dosya of slaytDosyalari) {
    const xml = await zip.file(dosya)!.async('string')
    let baslik = ''
    const maddeler: string[] = []
    for (const sekil of xml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? []) {
      const p = paragraflar(sekil)
      if (!baslik && /<p:ph[^>]*type="(title|ctrTitle)"/.test(sekil)) baslik = p.join(' ')
      else maddeler.push(...p)
    }
    const notDosyasi = zip.file(dosya.replace('slides/slide', 'notesSlides/notesSlide'))
    const notlar = notDosyasi
      ? paragraflar(((await notDosyasi.async('string')).match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? []).filter((s) => /type="body"/.test(s)).join('')).join('\n')
      : undefined
    slaytlar.push({ baslik, maddeler, notlar })
  }

  const konu = (await zip.file('docProps/core.xml')?.async('string'))?.match(/<dc:subject>([^<]*)<\/dc:subject>/)?.[1] ?? ''
  const tema = konu.startsWith(TEMA_ONEKI) ? (konu.slice(TEMA_ONEKI.length) as SunumTemaId) : 'acik'
  return { tur: 'sunum', tema: tema in SUNUM_TEMALARI ? tema : 'acik', slaytlar: slaytlar.length ? slaytlar : [{ baslik: '', maddeler: [] }] }
}

export async function pptxYaz(yol: string, belge: SunumBelgesi) {
  const t = SUNUM_TEMALARI[belge.tema] ?? SUNUM_TEMALARI.acik
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inç (16:9)
  pptx.subject = TEMA_ONEKI + belge.tema

  for (const s of belge.slaytlar) {
    const slayt = pptx.addSlide()
    slayt.background = { color: t.arka }
    const kapak = s.maddeler.length === 0
    slayt.addShape('rect', { x: 0.6, y: kapak ? 3.9 : 1.45, w: 1.2, h: 0.08, fill: { color: t.vurgu }, line: { color: t.vurgu } })
    slayt.addText(s.baslik || ' ', {
      x: 0.6, y: kapak ? 2.2 : 0.4, w: 12.1, h: kapak ? 1.6 : 1.0,
      fontSize: kapak ? 44 : 32, bold: true, color: t.baslik, fontFace: 'Calibri', valign: kapak ? 'bottom' : 'middle',
    })
    if (!kapak) {
      slayt.addText(
        s.maddeler.map((m) => ({ text: m, options: { bullet: { characterCode: '25CF' }, breakLine: true } })),
        { x: 0.6, y: 1.8, w: 12.1, h: 5.2, fontSize: 20, color: t.metin, fontFace: 'Calibri', valign: 'top', paraSpaceAfter: 10 },
      )
    }
    if (s.notlar) slayt.addNotes(s.notlar)
  }
  await fs.writeFile(yol, (await pptx.write({ outputType: 'nodebuffer' })) as Buffer)
}
