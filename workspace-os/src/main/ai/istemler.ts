import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { VARSAYILAN_ISTEMLER, type IstemSablonu } from '@shared/ai'

// Kullanıcının düzenlediği istem şablonları. Dosya yoksa varsayılanlar kullanılır.
const dosya = () => path.join(app.getPath('userData'), 'istemler.json')

const EDITORLER = ['word', 'excel', 'sunum', 'metin']
const CIKTILAR = ['ekle', 'degistir', 'yanit']

function gecerliMi(s: unknown): s is IstemSablonu {
  const x = s as IstemSablonu
  return (
    typeof x?.id === 'string' && typeof x.ad === 'string' && typeof x.sablon === 'string' && x.sablon.trim() !== '' &&
    EDITORLER.includes(x.editor) && CIKTILAR.includes(x.cikti)
  )
}

export async function istemleriGetir(): Promise<IstemSablonu[]> {
  try {
    const liste = JSON.parse(await fs.readFile(dosya(), 'utf-8'))
    if (Array.isArray(liste)) return liste.filter(gecerliMi)
  } catch {
    /* dosya yok */
  }
  return VARSAYILAN_ISTEMLER
}

export async function istemleriKaydet(liste: IstemSablonu[] | null): Promise<IstemSablonu[]> {
  if (liste === null) {
    await fs.rm(dosya(), { force: true })
    return VARSAYILAN_ISTEMLER
  }
  const temiz = liste.filter(gecerliMi).map((s) => ({ ...s, ad: s.ad.slice(0, 60), ikon: (s.ikon || '✨').slice(0, 4), sablon: s.sablon.slice(0, 4000) }))
  await fs.writeFile(dosya(), JSON.stringify(temiz, null, 2), 'utf-8')
  return temiz
}
