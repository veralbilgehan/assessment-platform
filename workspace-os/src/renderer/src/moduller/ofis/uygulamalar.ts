import type { EditorTuru } from '@shared/ofis'

// Ofis ekosisteminin uygulama kayıt defteri. Yeni uygulama/grup eklemek için bu diziye bir satır ekle.
// editor: Workspace'in kendi editörü · eylem: özel davranış · web: tarayıcıda açılacak çevrimiçi sürüm

export type UygulamaGrubu = 'ms365' | 'google'

export interface OfisUygulamasi {
  id: string
  ad: string
  grup: UygulamaGrubu
  ikon: string
  renk: string
  aciklama: string
  editor?: EditorTuru
  eylem?: 'drive' | 'ajan'
  web?: string
}

export const GRUPLAR: Record<UygulamaGrubu, { ad: string; aciklama: string }> = {
  ms365: { ad: 'Microsoft 365', aciklama: 'Belgeler Belgeler klasörüne .docx / .xlsx / .pptx olarak kaydedilir' },
  google: { ad: 'Google Workspace', aciklama: 'Belgeler Google Drive klasörüne kaydedilir ve otomatik senkronlanır' },
}

export const OFIS_UYGULAMALARI: OfisUygulamasi[] = [
  { id: 'word', ad: 'Word', grup: 'ms365', ikon: '📘', renk: '#2b579a', aciklama: 'Belge yaz', editor: 'word', web: 'https://www.office.com/launch/word' },
  { id: 'excel', ad: 'Excel', grup: 'ms365', ikon: '📗', renk: '#217346', aciklama: 'Tablo ve hesap', editor: 'excel', web: 'https://www.office.com/launch/excel' },
  { id: 'powerpoint', ad: 'PowerPoint', grup: 'ms365', ikon: '📙', renk: '#d24726', aciklama: 'Sunum hazırla', editor: 'sunum', web: 'https://www.office.com/launch/powerpoint' },
  { id: 'not-defteri', ad: 'Not Defteri', grup: 'ms365', ikon: '📝', renk: '#64748b', aciklama: 'Düz metin notu', editor: 'metin' },
  { id: 'office-agent', ad: 'Office Agent', grup: 'ms365', ikon: '🤖', renk: '#7c3aed', aciklama: 'AI ile belge hazırla', eylem: 'ajan' },
  { id: 'google-docs', ad: 'Google Dokümanlar', grup: 'google', ikon: '📄', renk: '#4285f4', aciklama: 'Belge yaz', editor: 'word', web: 'https://docs.google.com/document/' },
  { id: 'google-sheets', ad: 'Google E-Tablolar', grup: 'google', ikon: '📊', renk: '#0f9d58', aciklama: 'Tablo ve hesap', editor: 'excel', web: 'https://docs.google.com/spreadsheets/' },
  { id: 'google-slides', ad: 'Google Slaytlar', grup: 'google', ikon: '📽️', renk: '#f4b400', aciklama: 'Sunum hazırla', editor: 'sunum', web: 'https://docs.google.com/presentation/' },
  { id: 'google-drive', ad: 'Google Drive', grup: 'google', ikon: '🟢', renk: '#1fa463', aciklama: 'Drive dosyalarına göz at', eylem: 'drive', web: 'https://drive.google.com' },
]
