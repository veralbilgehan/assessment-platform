import type { Tema } from '@shared/tipler'

// Temayı <html data-tema> özniteliğine yazar; 'sistem' seçiliyse OS değişimini izler.
export function temaUygula(tema: Tema): () => void {
  const sorgu = window.matchMedia('(prefers-color-scheme: dark)')
  const uygula = () => {
    const koyu = tema === 'koyu' || (tema === 'sistem' && sorgu.matches)
    document.documentElement.dataset.tema = koyu ? 'koyu' : 'acik'
  }
  uygula()
  if (tema !== 'sistem') return () => {}
  sorgu.addEventListener('change', uygula)
  return () => sorgu.removeEventListener('change', uygula)
}
