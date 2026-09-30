// Dosya sınıflandırma algoritması: uzantı → kategori.
// Hem main (tarama) hem renderer (ikon/etiket) tarafından kullanılır.
// Yeni uzantı/kategori eklemek için yalnızca KATEGORILER dizisini düzenle.

export type KategoriId =
  | 'word' | 'metin' | 'excel' | 'sunum' | 'pdf' | 'kod' | 'veri' | 'gorsel' | 'video'
  | 'ses' | 'arsiv' | 'tasarim' | 'eposta' | 'ekitap' | 'yazilim' | 'font' | 'diger'

export interface Kategori {
  id: KategoriId
  ad: string
  ikon: string
  renk: string
  uzantilar: string[]
  /** Modül 3: bu kategorideki dosyalar "Yeni Projeler / Tamamlananlar" olarak takip edilir */
  projeTakibi?: boolean
}

export const KATEGORILER: Kategori[] = [
  { id: 'word', ad: 'Word Belgeleri', ikon: '📘', renk: '#2b579a', projeTakibi: true, uzantilar: ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'rtf', 'pages', 'wps', 'gdoc'] },
  { id: 'metin', ad: 'Metin Dosyaları', ikon: '📝', renk: '#64748b', projeTakibi: true, uzantilar: ['txt', 'md', 'markdown', 'log', 'rst', 'tex', 'nfo', 'text'] },
  { id: 'excel', ad: 'Excel & Tablolar', ikon: '📗', renk: '#217346', projeTakibi: true, uzantilar: ['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm', 'csv', 'tsv', 'ods', 'numbers', 'gsheet'] },
  { id: 'sunum', ad: 'Sunumlar', ikon: '📙', renk: '#d24726', projeTakibi: true, uzantilar: ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'pot', 'potx', 'odp', 'key', 'gslides'] },
  { id: 'pdf', ad: 'PDF', ikon: '📕', renk: '#b91c1c', projeTakibi: true, uzantilar: ['pdf', 'xps', 'oxps'] },
  {
    id: 'kod', projeTakibi: true, ad: 'Kod', ikon: '💻', renk: '#7c3aed',
    uzantilar: ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'ipynb', 'java', 'kt', 'kts', 'c', 'h', 'cpp', 'cc', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'dart', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'sh', 'bash', 'bat', 'cmd', 'ps1', 'lua', 'r', 'scala', 'pl', 'vb', 'vbs', 'asm', 'gradle'],
  },
  {
    id: 'veri', projeTakibi: true, ad: 'Veri & Yapılandırma', ikon: '🧩', renk: '#0891b2',
    uzantilar: ['json', 'jsonl', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'sql', 'db', 'sqlite', 'sqlite3', 'mdb', 'accdb', 'parquet', 'avro', 'geojson', 'kml', 'gpx', 'properties'],
  },
  {
    id: 'gorsel', ad: 'Görseller', ikon: '🖼️', renk: '#db2777',
    uzantilar: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'heic', 'heif', 'svg', 'ico', 'avif', 'raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2'],
  },
  { id: 'video', ad: 'Videolar', ikon: '🎬', renk: '#ea580c', uzantilar: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'mts', 'm2ts', 'vob', 'ogv'] },
  { id: 'ses', ad: 'Ses & Müzik', ikon: '🎵', renk: '#16a34a', uzantilar: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'oga', 'm4a', 'wma', 'opus', 'aiff', 'aif', 'mid', 'midi', 'amr'] },
  { id: 'arsiv', ad: 'Arşivler', ikon: '🗜️', renk: '#a16207', uzantilar: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'zst', 'iso', 'img', 'cab', 'dmg'] },
  {
    id: 'tasarim', projeTakibi: true, ad: 'Tasarım & 3D', ikon: '🎨', renk: '#c026d3',
    uzantilar: ['psd', 'ai', 'eps', 'indd', 'fig', 'sketch', 'xd', 'afdesign', 'afphoto', 'cdr', 'dwg', 'dxf', 'blend', 'fbx', 'obj', 'stl', 'skp', '3mf'],
  },
  { id: 'eposta', ad: 'E-posta & Kişiler', ikon: '✉️', renk: '#2563eb', uzantilar: ['eml', 'msg', 'pst', 'ost', 'mbox', 'vcf', 'ics'] },
  { id: 'ekitap', ad: 'E-kitaplar', ikon: '📚', renk: '#9333ea', uzantilar: ['epub', 'mobi', 'azw', 'azw3', 'djvu', 'fb2', 'cbz', 'cbr'] },
  { id: 'yazilim', ad: 'Kurulum Dosyaları', ikon: '📦', renk: '#475569', uzantilar: ['exe', 'msi', 'msix', 'appx', 'appxbundle', 'apk', 'deb', 'rpm', 'pkg', 'jar'] },
  { id: 'font', ad: 'Yazı Tipleri', ikon: '🔤', renk: '#57534e', uzantilar: ['ttf', 'otf', 'woff', 'woff2', 'fon'] },
  { id: 'diger', ad: 'Diğer', ikon: '📄', renk: '#9ca3af', uzantilar: [] },
]

export const PROJE_KATEGORILERI = KATEGORILER.filter((k) => k.projeTakibi).map((k) => k.id)

export const KATEGORI_HARITASI = Object.fromEntries(KATEGORILER.map((k) => [k.id, k])) as Record<KategoriId, Kategori>

const uzantiHaritasi = new Map<string, KategoriId>()
for (const k of KATEGORILER) for (const u of k.uzantilar) uzantiHaritasi.set(u, k.id)

export function uzantiAl(dosyaAdi: string): string {
  const i = dosyaAdi.lastIndexOf('.')
  return i <= 0 ? '' : dosyaAdi.slice(i + 1).toLowerCase()
}

export function kategoriBul(dosyaAdi: string): KategoriId {
  return uzantiHaritasi.get(uzantiAl(dosyaAdi)) ?? 'diger'
}
