import type { ComponentType } from 'react'
import type { UygulamaDurumu } from '@shared/tipler'

// Plugin mimarisinin kalbi: her modül (Dosyalar, Projeler, Ofis, AI...) kendini
// buraya kaydeder; Kabuk kenar çubuğunu ve içeriği bu listeden üretir.
// Yeni modül eklemek = yeni klasör + moduller/index.ts'e bir import satırı.

export interface ModulProps {
  durum: UygulamaDurumu
  durumGuncelle: (d: UygulamaDurumu) => void
}

export interface WorkspaceModulu {
  id: string
  ad: string
  ikon: string // emoji veya ikon adı
  sira: number // kenar çubuğundaki konum
  grup?: 'ana' | 'ofis' | 'sistem'
  bilesen: ComponentType<ModulProps>
}

const kayitlar = new Map<string, WorkspaceModulu>()

export function modulKaydet(modul: WorkspaceModulu) {
  if (kayitlar.has(modul.id)) console.warn(`Modül zaten kayıtlı, üzerine yazılıyor: ${modul.id}`)
  kayitlar.set(modul.id, modul)
}

export function modulleriGetir(): WorkspaceModulu[] {
  return [...kayitlar.values()].sort((a, b) => a.sira - b.sira)
}
