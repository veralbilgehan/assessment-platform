import type { AdimProps } from '../adimTipleri'

export default function Karsilama({ ileri, sistem }: AdimProps) {
  return (
    <div className="adim adim-ortala">
      <div className="logo-buyuk">◆</div>
      <h1>Merhaba</h1>
      <p className="alt-metin">
        Workspace OS'e hoş geldin. Dosyaların, sürücülerin ve ofis araçların birkaç adımda tek bir akıllı
        çalışma alanında buluşacak.
      </p>
      {sistem && <p className="ipucu">{sistem.bilgisayarAdi} üzerinde kuruluyor</p>}
      <button className="dugme birincil buyuk" onClick={ileri} autoFocus>
        Başlayalım
      </button>
    </div>
  )
}
