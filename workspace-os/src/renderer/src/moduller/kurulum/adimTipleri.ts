import type { ComponentType } from 'react'
import type { KullaniciProfili, SistemBilgisi, Tercihler } from '@shared/tipler'

// Kurulum sırasında adımlar arasında paylaşılan taslak veri
export interface KurulumTaslagi {
  profil: KullaniciProfili
  tercihler: Tercihler
  kaynaklar: string[]
}

export interface AdimProps {
  taslak: KurulumTaslagi
  guncelle: (degisiklik: Partial<KurulumTaslagi>) => void
  profilGuncelle: (degisiklik: Partial<KullaniciProfili>) => void
  sistem: SistemBilgisi | null
  ileri: () => void
}

// Dinamik akışın birimi. Yeni adım = bu arayüzü uygulayan bir nesne + adimlar/index.ts'e ekleme.
export interface KurulumAdimi {
  id: string
  baslik: string
  bilesen: ComponentType<AdimProps>
  /** Hata mesajı döndürürse "İleri" engellenir */
  dogrula?: (t: KurulumTaslagi) => string | null
  /** false döndürürse adım akışta atlanır (koşullu adımlar için) */
  goster?: (t: KurulumTaslagi) => boolean
  /** Kendi navigasyonunu yöneten adımlar (karşılama, son adım) için */
  navigasyonGizli?: boolean
}
