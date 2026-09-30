# Workspace OS

Dosyaları, sürücüleri, bulut hesaplarını ve ofis/AI araçlarını tek ekosistemde birleştiren Windows masaüstü uygulaması.

**Teknoloji:** Electron + React 19 + TypeScript + Vite (electron-vite), paketleme electron-builder (NSIS).

```bash
npm install
npm run dev        # geliştirme (hot reload)
npm run typecheck
npm run dist:win   # Windows kurulum dosyası → release/
```

## Mimari

```
src/
  shared/tipler.ts        Main ↔ Renderer sözleşmeleri (tipler + IPC kanal adları)
  shared/kategoriler.ts   Uzantı → kategori sınıflandırma tablosu (17 kategori, ~250 uzantı)
  main/                   Electron ana süreç — dosya sistemi, kalıcı durum, IPC
    suruculer.ts          Disk/USB/harici disk/bulut tespiti, önemli klasörler, takılma izleme
    dosyaIslemleri.ts     Listeleme, klasör oluşturma, yeniden adlandırma, taşıma
    tarayici.ts           Kaynak klasörleri tarayıp dosyaları sınıflandırır
    dizinDeposu.ts        Taranan dosya dizini (özet + sayfalı sorgu)
    ipc/                  Modül başına IPC kayıtları
  preload/                contextBridge ile dar `window.workspace` API'si
  renderer/src/
    core/modulKayit.ts    Plugin kayıt defteri — her modül kendini buraya kaydeder
    moduller/index.ts     Etkin modüllerin listesi (bir import = bir plugin)
    moduller/kurulum/     Modül 1 — Kurulum sihirbazı
    moduller/masaustu/    Kabuk (kenar çubuğu) + Ana Sayfa
    moduller/dosyalar/    Modül 2 — Sürücüler, klasör gezgini, Kütüphane
```

### Yeni modül eklemek
1. `moduller/<ad>/index.tsx` içinde `modulKaydet({ id, ad, ikon, sira, bilesen })` çağır.
2. `moduller/index.ts`'e `import './<ad>'` ekle. Kabuk menüsü otomatik güncellenir.

### Yeni kurulum adımı eklemek
`moduller/kurulum/adimlar/index.ts` içindeki `KURULUM_ADIMLARI` dizisine bir `KurulumAdimi` ekle
(`dogrula` ile zorunlu alan kontrolü, `goster` ile koşullu gösterim).

### Yeni dosya türü eklemek
`src/shared/kategoriler.ts` içindeki ilgili kategorinin `uzantilar` listesine ekle (veya yeni kategori tanımla).

Durum `%APPDATA%/Workspace OS/durum.json`, dosya dizini `dizin.json` dosyasında saklanır.
