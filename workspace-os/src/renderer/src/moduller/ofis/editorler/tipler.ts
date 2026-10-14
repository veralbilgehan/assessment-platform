import type { BelgeIcerigi } from '@shared/ofis'

export interface EditorProps<T extends BelgeIcerigi> {
  icerik: T // açılıştaki içerik (editör kendi durumunu tutar, değişiklikleri degisti ile bildirir)
  belgeAdi: string
  degisti: (icerik: BelgeIcerigi) => void
}
