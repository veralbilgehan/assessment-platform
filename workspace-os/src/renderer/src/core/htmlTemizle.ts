// Yapay zekadan (veya panodan) gelen HTML'i belgeye eklemeden önce beyaz listeyle temizler.
// DOMParser ile oluşturulan belge "etkisiz"dir: script çalışmaz, resim yüklenmez. Böylece
// belge içine gizlenmiş bir istem enjeksiyonu <img onerror=…> gibi bir yükle kod çalıştıramaz.

const IZINLI: Record<string, string[]> = {
  h1: [], h2: [], h3: [], p: [], br: [], ul: [], ol: [], li: [], strong: [], b: [], em: [], i: [], u: [], s: [],
  blockquote: [], table: [], thead: [], tbody: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
}
const ESLEME: Record<string, string> = { b: 'strong', i: 'em' }

function temizDugum(d: Node, belge: Document): Node[] {
  if (d.nodeType === Node.TEXT_NODE) return [belge.createTextNode(d.textContent ?? '')]
  if (d.nodeType !== Node.ELEMENT_NODE) return []
  const e = d as Element
  const ad = e.tagName.toLowerCase()
  const cocuklar = [...e.childNodes].flatMap((c) => temizDugum(c, belge))
  if (['script', 'style', 'iframe', 'object', 'embed', 'img', 'svg', 'math', 'template'].includes(ad)) return []
  if (!(ad in IZINLI)) return cocuklar // bilinmeyen etiket: içeriğini koru, etiketi at
  const yeni = belge.createElement(ESLEME[ad] ?? ad)
  for (const oz of IZINLI[ad]) {
    const v = e.getAttribute(oz)
    if (v && /^\d{1,2}$/.test(v)) yeni.setAttribute(oz, v)
  }
  cocuklar.forEach((c) => yeni.appendChild(c))
  return [yeni]
}

export function htmlTemizle(html: string): string {
  const kaynak = new DOMParser().parseFromString(html, 'text/html')
  const hedef = document.implementation.createHTMLDocument('')
  const kap = hedef.createElement('div')
  ;[...kaynak.body.childNodes].flatMap((d) => temizDugum(d, hedef)).forEach((d) => kap.appendChild(d))
  return kap.innerHTML
}

/** Akış önizlemesi için etiketleri kaldırır */
export const etiketsiz = (html: string) => html.replace(/^\s*```[a-z]*\s*/i, '').replace(/```\s*$/, '').replace(/<\/(p|h\d|li|tr|blockquote)>/gi, '\n').replace(/<[^>]*>?/g, '').replace(/\n{3,}/g, '\n\n')
