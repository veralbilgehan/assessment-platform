import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import type { WordBelgesi } from '@shared/ofis'
import { editorKaydet, metniHtmleCevir, tabloyuHtmleCevir, type EkIcerik } from '@core/editorKoprusu'
import { htmlTemizle } from '@core/htmlTemizle'
import type { EditorProps } from './tipler'

// "Kendi Word'ümüz": TipTap (ProseMirror) tabanlı zengin metin editörü, A4 sayfa görünümü.
export default function WordEditor({ icerik, belgeAdi, degisti }: EditorProps<WordBelgesi>) {
  const degistiRef = useRef(degisti)
  degistiRef.current = degisti

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: false } }),
      Image.configure({ allowBase64: true }),
    ],
    content: icerik.html ?? (icerik.json as object) ?? '',
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => degistiRef.current({ tur: 'word', json: editor.getJSON() }),
  })

  // AI köprüsü: üretilen içerik imlecin olduğu yere yapıştırılır
  useEffect(() => {
    if (!editor) return
    return editorKaydet({
      tur: 'word',
      belgeAdi,
      metinAl: () => editor.getText(),
      seciliMetin: () => editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, '\n'),
      ekle: (ic) => {
        const html = icerikHtml(ic)
        if (!html) return
        editor.chain().focus().setTextSelection(editor.state.selection.to).insertContent(html).run()
        return () => editor.commands.undo()
      },
      degistir: (ic) => {
        const html = icerikHtml(ic)
        if (!html) return
        editor.chain().focus().insertContent(html).run()
        return () => editor.commands.undo()
      },
    })
  }, [editor, belgeAdi])

  if (!editor) return null
  const kelime = editor.getText().trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="word">
      <AracCubugu editor={editor} />
      <div className="word-alan" onClick={(e) => e.target === e.currentTarget && editor.chain().focus('end').run()}>
        <div className="word-sayfa">
          <EditorContent editor={editor} />
        </div>
      </div>
      <footer className="durum-cubugu">{kelime.toLocaleString('tr-TR')} kelime · {editor.getText().length.toLocaleString('tr-TR')} karakter</footer>
    </div>
  )
}

/** Dışarıdan gelen içerik her zaman beyaz listeyle temizlenerek belgeye girer */
const icerikHtml = ({ html, metin, tablo }: EkIcerik) =>
  htmlTemizle(html ?? (tablo ? tabloyuHtmleCevir(tablo) : metin ? metniHtmleCevir(metin) : ''))

function AracCubugu({ editor }: { editor: Editor }) {
  const dosyaRef = useRef<HTMLInputElement>(null)
  const zincir = () => editor.chain().focus()
  const stil = editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'

  const Dugme = ({ etiket, baslik, aktif, calistir, devre }: { etiket: string; baslik: string; aktif?: boolean; calistir: () => void; devre?: boolean }) => (
    <button className={`arac ${aktif ? 'aktif' : ''}`} title={baslik} aria-label={baslik} aria-pressed={aktif} disabled={devre} onMouseDown={(e) => e.preventDefault()} onClick={calistir}>
      {etiket}
    </button>
  )

  const resimEkle = (dosya?: File) => {
    if (!dosya) return
    const okuyucu = new FileReader()
    okuyucu.onload = () => zincir().setImage({ src: String(okuyucu.result) }).run()
    okuyucu.readAsDataURL(dosya)
  }

  return (
    <div className="word-arac-cubugu" role="toolbar">
      <Dugme etiket="↶" baslik="Geri al (Ctrl+Z)" calistir={() => zincir().undo().run()} devre={!editor.can().undo()} />
      <Dugme etiket="↷" baslik="Yinele (Ctrl+Y)" calistir={() => zincir().redo().run()} devre={!editor.can().redo()} />
      <span className="ayrac" />
      <select
        value={stil}
        aria-label="Paragraf stili"
        onChange={(e) => {
          const v = e.target.value
          if (v === 'p') zincir().setParagraph().run()
          else zincir().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run()
        }}
      >
        <option value="p">Normal</option>
        <option value="h1">Başlık 1</option>
        <option value="h2">Başlık 2</option>
        <option value="h3">Başlık 3</option>
      </select>
      <span className="ayrac" />
      <Dugme etiket="K" baslik="Kalın (Ctrl+B)" aktif={editor.isActive('bold')} calistir={() => zincir().toggleBold().run()} />
      <Dugme etiket="İ" baslik="İtalik (Ctrl+I)" aktif={editor.isActive('italic')} calistir={() => zincir().toggleItalic().run()} />
      <Dugme etiket="A̲" baslik="Altı çizili (Ctrl+U)" aktif={editor.isActive('underline')} calistir={() => zincir().toggleUnderline().run()} />
      <Dugme etiket="S̶" baslik="Üstü çizili" aktif={editor.isActive('strike')} calistir={() => zincir().toggleStrike().run()} />
      <span className="ayrac" />
      <Dugme etiket="⯇" baslik="Sola hizala" aktif={editor.isActive({ textAlign: 'left' })} calistir={() => zincir().setTextAlign('left').run()} />
      <Dugme etiket="≡" baslik="Ortala" aktif={editor.isActive({ textAlign: 'center' })} calistir={() => zincir().setTextAlign('center').run()} />
      <Dugme etiket="⯈" baslik="Sağa hizala" aktif={editor.isActive({ textAlign: 'right' })} calistir={() => zincir().setTextAlign('right').run()} />
      <Dugme etiket="☰" baslik="İki yana yasla" aktif={editor.isActive({ textAlign: 'justify' })} calistir={() => zincir().setTextAlign('justify').run()} />
      <span className="ayrac" />
      <Dugme etiket="•" baslik="Madde işaretli liste" aktif={editor.isActive('bulletList')} calistir={() => zincir().toggleBulletList().run()} />
      <Dugme etiket="1." baslik="Numaralı liste" aktif={editor.isActive('orderedList')} calistir={() => zincir().toggleOrderedList().run()} />
      <Dugme etiket="❝" baslik="Alıntı" aktif={editor.isActive('blockquote')} calistir={() => zincir().toggleBlockquote().run()} />
      <Dugme etiket="―" baslik="Yatay çizgi" calistir={() => zincir().setHorizontalRule().run()} />
      <span className="ayrac" />
      <Dugme etiket="▦" baslik="Tablo ekle (3×3)" calistir={() => zincir().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      {editor.isActive('table') && (
        <>
          <Dugme etiket="+Satır" baslik="Alta satır ekle" calistir={() => zincir().addRowAfter().run()} />
          <Dugme etiket="+Sütun" baslik="Sağa sütun ekle" calistir={() => zincir().addColumnAfter().run()} />
          <Dugme etiket="−Satır" baslik="Satırı sil" calistir={() => zincir().deleteRow().run()} />
          <Dugme etiket="−Sütun" baslik="Sütunu sil" calistir={() => zincir().deleteColumn().run()} />
          <Dugme etiket="✕Tablo" baslik="Tabloyu sil" calistir={() => zincir().deleteTable().run()} />
        </>
      )}
      <Dugme etiket="🖼" baslik="Resim ekle" calistir={() => dosyaRef.current?.click()} />
      <input ref={dosyaRef} type="file" accept="image/png,image/jpeg,image/gif,image/bmp" hidden onChange={(e) => resimEkle(e.target.files?.[0])} />
    </div>
  )
}
