import { createContext, useContext } from 'react'

// Modüller arası gezinme ve "bu dosyayı aç" isteği için ortak bağlam.
// belgeAc: desteklenen belgeleri Workspace editöründe, diğerlerini sistem uygulamasında açar.
export interface KabukBaglami {
  modulAc: (id: string, parametre?: unknown) => void
  belgeAc: (yol: string) => Promise<void>
}

export const KabukContext = createContext<KabukBaglami>({
  modulAc: () => {},
  belgeAc: (yol) => window.workspace.dosyaAc(yol),
})

export const useKabuk = () => useContext(KabukContext)
