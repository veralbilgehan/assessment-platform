import type { KurulumAdimi } from '../adimTipleri'
import Karsilama from './Karsilama'
import Profil from './Profil'
import KullanimAmaci from './KullanimAmaci'
import Kaynaklar from './Kaynaklar'
import Tercihler from './Tercihler'
import Hazirlaniyor from './Hazirlaniyor'

// Kurulum akışı bu dizinin sırasıyla çalışır. Adım eklemek/çıkarmak/yer değiştirmek
// için yalnızca bu listeyi düzenle — sihirbaz kodu değişmez.
export const KURULUM_ADIMLARI: KurulumAdimi[] = [
  { id: 'karsilama', baslik: 'Hoş geldin', bilesen: Karsilama, navigasyonGizli: true },
  {
    id: 'profil',
    baslik: 'Profil',
    bilesen: Profil,
    dogrula: (t) => (t.profil.ad.trim().length < 2 ? 'Lütfen en az 2 karakterlik bir isim gir.' : null),
  },
  {
    id: 'amac',
    baslik: 'Kullanım',
    bilesen: KullanimAmaci,
    dogrula: (t) => (t.profil.kullanimAmaci.length === 0 ? 'En az bir seçim yap.' : null),
  },
  {
    id: 'kaynaklar',
    baslik: 'Kaynaklar',
    bilesen: Kaynaklar,
    dogrula: (t) => (t.kaynaklar.length === 0 ? 'Taranacak en az bir klasör veya sürücü seç.' : null),
  },
  { id: 'tercihler', baslik: 'Tercihler', bilesen: Tercihler },
  { id: 'hazirlaniyor', baslik: 'Hazırlanıyor', bilesen: Hazirlaniyor, navigasyonGizli: true },
]
