/* Personel Maliyet — arayüz (bağımlılıksız) */
const $ = (s) => document.querySelector(s);
const TOKEN_ANAHTAR = 'pm_token';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tl = (n) => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const tl0 = (n) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
const sayiTr = (n, k = 0) => (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: k });

let token = null;
try { token = localStorage.getItem(TOKEN_ANAHTAR); } catch { /* depolama kapalı */ }

async function api(yol, secenek = {}) {
  const basliklar = { ...(secenek.headers || {}) };
  if (token) basliklar.Authorization = `Bearer ${token}`;
  if (secenek.body && !(secenek.body instanceof FormData)) {
    basliklar['Content-Type'] = 'application/json';
    secenek.body = JSON.stringify(secenek.body);
  }
  const yanit = await fetch(`/api${yol}`, { ...secenek, headers: basliklar });
  if (yanit.status === 401 && yol !== '/giris') { cikisYap(); throw new Error('Oturum süresi doldu'); }
  if (secenek.ham) return yanit;
  const veri = await yanit.json().catch(() => ({}));
  if (!yanit.ok) throw new Error(veri.hata || veri.hatalar?.map(h => h.msg).join(', ') || 'İşlem başarısız');
  return veri;
}

/* ─── Giriş ──────────────────────────────────────────── */
function ekranGoster() {
  $('#giris').hidden = !!token;
  $('#uygulama').hidden = !token;
  if (token) sekmeAc('rapor');
}

$('#girisForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#girisHata').hidden = true;
  try {
    const { token: t } = await api('/giris', { method: 'POST', body: { sifre: e.target.sifre.value } });
    token = t;
    try { localStorage.setItem(TOKEN_ANAHTAR, t); } catch { /* yok say */ }
    e.target.reset();
    ekranGoster();
  } catch (err) {
    $('#girisHata').textContent = err.message;
    $('#girisHata').hidden = false;
  }
});

function cikisYap() {
  token = null;
  try { localStorage.removeItem(TOKEN_ANAHTAR); } catch { /* yok say */ }
  ekranGoster();
}
$('#cikis').addEventListener('click', cikisYap);

/* ─── Sekmeler ───────────────────────────────────────── */
const YUKLEYICI = { rapor: raporYukle, personel: personelYukle, giderler: giderYukle, parametreler: parametreYukle };

function sekmeAc(ad) {
  document.querySelectorAll('#sekmeler button').forEach(b => b.classList.toggle('aktif', b.dataset.sekme === ad));
  document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== ad; });
  YUKLEYICI[ad]().catch(err => alert(err.message));
}
$('#sekmeler').addEventListener('click', (e) => { if (e.target.dataset.sekme) sekmeAc(e.target.dataset.sekme); });

/* ─── Modal ──────────────────────────────────────────── */
function modalAc({ baslik, icerik, kaydet, kaydetYazi = 'Kaydet' }) {
  $('#modalBaslik').textContent = baslik;
  $('#modalIcerik').innerHTML = icerik;
  $('#modalHata').hidden = true;
  $('#modalKaydet').hidden = !kaydet;
  $('#modalKaydet').textContent = kaydetYazi;
  const dlg = $('#modal');
  const form = $('#modalForm');
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== 'kaydet' || !kaydet) return;
    e.preventDefault();
    try {
      await kaydet(new FormData(form));
      dlg.close();
    } catch (err) {
      $('#modalHata').textContent = err.message;
      $('#modalHata').hidden = false;
    }
  };
  dlg.showModal();
}

const alan = (ad, etiket, deger = '', tip = 'number', ek = '') =>
  `<label>${esc(etiket)}<input name="${ad}" type="${tip}" value="${esc(deger ?? '')}" ${tip === 'number' ? 'step="any" min="0"' : ''} ${ek}></label>`;

/* ─── Rapor ──────────────────────────────────────────── */
const KALEM_ADLARI = {
  brut_maas: 'Brüt maaş', fazla_mesai: 'Fazla mesai', prim_payi: 'Prim / ikramiye (aylık pay)',
  sgk_isveren: 'İşveren SGK payı', issizlik_isveren: 'İşveren işsizlik payı', kidem_karsilik: 'Kıdem tazminatı karşılığı',
  yan_haklar: 'Yan haklar', isyeri_payi: 'İş yeri gider payı',
};
let sonRapor = null;

async function raporYukle() {
  const r = await api('/rapor');
  sonRapor = r;
  const f = r.firma;
  const p = r.parametreler;
  $('#raporNot').textContent = `${p.yil} parametreleri · İş yeri gideri kişi başı ${tl0(r.isyeri_payi_kisi)}/ay`;
  $('#firmaKpi').innerHTML = [
    ['Personel sayısı', sayiTr(f.personel_sayisi)],
    ['Aylık toplam maliyet', tl0(f.aylik), true],
    ['Yıllık toplam maliyet', tl0(f.yillik)],
    ['Saatlik maliyet (ort.)', tl(f.saatlik), true],
    ['Günlük maliyet (ort.)', tl(f.gunluk)],
    ['Kişi başı aylık', tl0(f.kisi_basi_aylik)],
    ['Maliyet / brüt çarpanı', f.brut_carpan ? `× ${sayiTr(f.brut_carpan, 2)}` : '—'],
  ].map(([e, d, v]) => `<div class="kpi${v ? ' vurgu' : ''}"><div class="etiket">${e}</div><div class="deger">${d}</div></div>`).join('');

  $('#bolumTablo').innerHTML = r.bolumler.length ? `
    <thead><tr><th>Bölüm</th><th class="sayi">Kişi</th><th class="sayi">Aylık</th><th class="sayi">Yıllık</th>
      <th class="sayi">Saatlik</th><th class="sayi">Günlük</th><th class="sayi">Kişi başı aylık</th><th class="sayi">Pay</th></tr></thead>
    <tbody>${r.bolumler.map(b => `<tr class="tikla" data-bolum="${b.bolum_id ?? ''}">
      <td>${esc(b.bolum_ad)}</td><td class="sayi">${b.personel_sayisi}</td><td class="sayi">${tl0(b.aylik)}</td>
      <td class="sayi">${tl0(b.yillik)}</td><td class="sayi">${tl(b.saatlik)}</td><td class="sayi">${tl(b.gunluk)}</td>
      <td class="sayi">${tl0(b.kisi_basi_aylik)}</td><td class="sayi">%${sayiTr(f.aylik ? b.aylik / f.aylik * 100 : 0, 1)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Toplam</td><td class="sayi">${f.personel_sayisi}</td><td class="sayi">${tl0(f.aylik)}</td><td class="sayi">${tl0(f.yillik)}</td>
      <td class="sayi">${tl(f.saatlik)}</td><td class="sayi">${tl(f.gunluk)}</td><td class="sayi">${tl0(f.kisi_basi_aylik)}</td><td class="sayi">%100</td></tr></tfoot>`
    : '<tbody><tr><td class="bos">Henüz personel yok. "Personel" sekmesinden ekleyin veya Excel\'den aktarın.</td></tr></tbody>';

  const secili = $('#bolumFiltre').value;
  $('#bolumFiltre').innerHTML = '<option value="">Tüm bölümler</option>' +
    r.bolumler.map(b => `<option value="${b.bolum_id ?? 'yok'}">${esc(b.bolum_ad)}</option>`).join('');
  $('#bolumFiltre').value = secili;
  kisiTablosu();
}

function kisiTablosu() {
  if (!sonRapor) return;
  const filtre = $('#bolumFiltre').value;
  const kisiler = sonRapor.kisiler.filter(k => !filtre || String(k.bolum_id ?? 'yok') === filtre);
  $('#kisiTablo').innerHTML = kisiler.length ? `
    <thead><tr><th>Ad Soyad</th><th>Bölüm</th><th class="sayi">Brüt</th><th class="sayi">Aylık maliyet</th>
      <th class="sayi">Yıllık</th><th class="sayi">Saatlik</th><th class="sayi">Günlük</th><th class="sayi">İzin</th><th class="sayi">Çarpan</th></tr></thead>
    <tbody>${kisiler.map(k => `<tr class="tikla" data-kisi="${k.id}">
      <td>${esc(k.ad_soyad)}</td><td>${esc(k.bolum_ad)}</td><td class="sayi">${tl0(k.maliyet.kalemler.brut_maas)}</td>
      <td class="sayi">${tl0(k.maliyet.aylik)}</td><td class="sayi">${tl0(k.maliyet.yillik)}</td>
      <td class="sayi">${tl(k.maliyet.saatlik)}</td><td class="sayi">${tl(k.maliyet.gunluk)}</td>
      <td class="sayi">${sayiTr(k.maliyet.izin_gun, 1)} gün</td><td class="sayi">${k.maliyet.brut_carpan ? '× ' + sayiTr(k.maliyet.brut_carpan, 2) : '—'}</td></tr>`).join('')}</tbody>`
    : '<tbody><tr><td class="bos">Kayıt yok.</td></tr></tbody>';
}
$('#bolumFiltre').addEventListener('change', kisiTablosu);

$('#bolumTablo').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-bolum]');
  if (!tr) return;
  $('#bolumFiltre').value = tr.dataset.bolum || 'yok';
  kisiTablosu();
  $('#kisiTablo').scrollIntoView({ behavior: 'smooth' });
});

$('#kisiTablo').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-kisi]');
  if (!tr) return;
  const k = sonRapor.kisiler.find(x => String(x.id) === tr.dataset.kisi);
  const m = k.maliyet;
  const satirlar = Object.entries(m.kalemler).map(([a, d]) =>
    `<tr><td>${KALEM_ADLARI[a] || a}</td><td class="sayi">${tl(d)}</td><td class="sayi">%${sayiTr(m.aylik ? d / m.aylik * 100 : 0, 1)}</td></tr>`).join('');
  modalAc({
    baslik: `${k.ad_soyad} — maliyet dökümü`,
    icerik: `<div class="tam tablo-kap"><table class="kalem-tablo">
      <thead><tr><th>Kalem</th><th class="sayi">Aylık</th><th class="sayi">Pay</th></tr></thead>
      <tbody>${satirlar}</tbody>
      <tfoot><tr><td>Aylık toplam</td><td class="sayi">${tl(m.aylik)}</td><td class="sayi">%100</td></tr></tfoot></table></div>
      <div class="tam kpi-izgara">
        <div class="kpi"><div class="etiket">Yıllık</div><div class="deger">${tl0(m.yillik)}</div></div>
        <div class="kpi vurgu"><div class="etiket">Saatlik</div><div class="deger">${tl(m.saatlik)}</div></div>
        <div class="kpi"><div class="etiket">Günlük</div><div class="deger">${tl(m.gunluk)}</div></div>
        <div class="kpi"><div class="etiket">Fiili çalışma</div><div class="deger">${sayiTr(m.fiili_saat)} saat/yıl</div></div>
      </div>
      <p class="tam soluk">Yıllık izin ${sayiTr(m.izin_gun, 1)} gün olarak hesaba katıldı. Saatlik maliyet = yıllık maliyet ÷ fiili çalışılan saat.</p>`,
  });
});

/* ─── Personel ───────────────────────────────────────── */
let bolumler = [];

async function personelYukle() {
  const [liste, b] = await Promise.all([api('/personel'), api('/bolumler')]);
  bolumler = b;
  $('#personelTablo').innerHTML = liste.length ? `
    <thead><tr><th>Sicil</th><th>Ad Soyad</th><th>Bölüm</th><th>Unvan</th><th>İşe giriş</th>
      <th class="sayi">Brüt maaş</th><th class="sayi">Yan haklar</th><th>Teşvik</th><th>Durum</th><th></th></tr></thead>
    <tbody>${liste.map(p => {
      const yan = ['yemek', 'yol', 'saglik_sigortasi', 'bes_katki', 'diger_yan_hak'].reduce((t, a) => t + Number(p[a] || 0), 0);
      return `<tr class="${p.aktif ? '' : 'pasif'}">
        <td>${esc(p.sicil_no || '—')}</td><td>${esc(p.ad_soyad)}</td><td>${esc(p.bolum_ad || '—')}</td><td>${esc(p.unvan || '—')}</td>
        <td>${p.ise_giris ? new Date(p.ise_giris).toLocaleDateString('tr-TR') : '—'}</td>
        <td class="sayi">${tl0(p.brut_maas)}</td><td class="sayi">${tl0(yan)}</td><td>${p.sgk_tesvik ? 'Evet' : 'Hayır'}</td>
        <td>${p.aktif ? 'Aktif' : 'Pasif'}</td>
        <td><button class="dugme kucuk" data-duzenle="${p.id}">Düzenle</button>
            <button class="dugme kucuk tehlike" data-sil="${p.id}">Sil</button></td></tr>`;
    }).join('')}</tbody>`
    : '<tbody><tr><td class="bos">Henüz personel yok.</td></tr></tbody>';
  $('#personelTablo').dataset.liste = JSON.stringify(liste);
}

function personelFormu(p = {}) {
  const tarih = p.ise_giris ? String(p.ise_giris).slice(0, 10) : '';
  return `
    ${alan('ad_soyad', 'Ad Soyad *', p.ad_soyad, 'text', 'required')}
    ${alan('sicil_no', 'Sicil No', p.sicil_no, 'text')}
    <label>Bölüm<input name="bolum" list="bolumSecenek" value="${esc(p.bolum_ad || '')}" placeholder="Seçin veya yeni yazın">
      <datalist id="bolumSecenek">${bolumler.map(b => `<option value="${esc(b.ad)}">`).join('')}</datalist></label>
    ${alan('unvan', 'Unvan', p.unvan, 'text')}
    ${alan('ise_giris', 'İşe giriş tarihi', tarih, 'date')}
    ${alan('brut_maas', 'Aylık brüt maaş (₺) *', p.brut_maas ?? '', 'number', 'required')}
    ${alan('yillik_prim', 'Yıllık prim / ikramiye (₺)', p.yillik_prim ?? 0)}
    ${alan('fazla_mesai_saat', 'Aylık ort. fazla mesai (saat)', p.fazla_mesai_saat ?? 0)}
    ${alan('yemek', 'Yemek (₺/ay)', p.yemek ?? 0)}
    ${alan('yol', 'Yol / servis (₺/ay)', p.yol ?? 0)}
    ${alan('saglik_sigortasi', 'Özel sağlık sigortası (₺/ay)', p.saglik_sigortasi ?? 0)}
    ${alan('bes_katki', 'BES işveren katkısı (₺/ay)', p.bes_katki ?? 0)}
    ${alan('diger_yan_hak', 'Diğer yan haklar (₺/ay)', p.diger_yan_hak ?? 0)}
    ${alan('izin_gun', 'Yıllık izin günü (boş = yasal)', p.izin_gun ?? '')}
    ${alan('rapor_gun', 'Yıllık ort. rapor günü', p.rapor_gun ?? 0)}
    <label class="onay"><input type="checkbox" name="sgk_tesvik" ${p.sgk_tesvik !== false ? 'checked' : ''}> SGK işveren teşviki uygulanıyor</label>
    <label class="onay"><input type="checkbox" name="aktif" ${p.aktif !== false ? 'checked' : ''}> Aktif çalışan</label>`;
}

async function bolumIdBul(ad) {
  ad = (ad || '').trim();
  if (!ad) return null;
  const mevcut = bolumler.find(b => b.ad.toLocaleLowerCase('tr-TR') === ad.toLocaleLowerCase('tr-TR'));
  if (mevcut) return mevcut.id;
  const yeni = await api('/bolumler', { method: 'POST', body: { ad } });
  bolumler.push(yeni);
  return yeni.id;
}

async function personelKaydet(fd, id) {
  const veri = Object.fromEntries(fd.entries());
  veri.sgk_tesvik = fd.has('sgk_tesvik');
  veri.aktif = fd.has('aktif');
  veri.bolum_id = await bolumIdBul(veri.bolum);
  delete veri.bolum;
  await api(id ? `/personel/${id}` : '/personel', { method: id ? 'PUT' : 'POST', body: veri });
  await personelYukle();
}

$('#personelEkle').addEventListener('click', () =>
  modalAc({ baslik: 'Personel ekle', icerik: personelFormu(), kaydet: (fd) => personelKaydet(fd) }));

$('#personelTablo').addEventListener('click', async (e) => {
  const liste = JSON.parse($('#personelTablo').dataset.liste || '[]');
  const duzenleId = e.target.dataset.duzenle;
  const silId = e.target.dataset.sil;
  if (duzenleId) {
    const p = liste.find(x => String(x.id) === duzenleId);
    modalAc({ baslik: 'Personeli düzenle', icerik: personelFormu(p), kaydet: (fd) => personelKaydet(fd, duzenleId) });
  }
  if (silId) {
    const p = liste.find(x => String(x.id) === silId);
    if (!confirm(`${p.ad_soyad} silinsin mi? İşten ayrıldıysa "Pasif" yapmanız raporlarda geçmişi korur.`)) return;
    try { await api(`/personel/${silId}`, { method: 'DELETE' }); await personelYukle(); } catch (err) { alert(err.message); }
  }
});

$('#sablonIndir').addEventListener('click', async () => {
  try {
    const yanit = await api('/sablon', { ham: true });
    const url = URL.createObjectURL(await yanit.blob());
    Object.assign(document.createElement('a'), { href: url, download: 'personel_maliyet_sablonu.xlsx' }).click();
    URL.revokeObjectURL(url);
  } catch (err) { alert(err.message); }
});

$('#excelDosya').addEventListener('change', async (e) => {
  const dosya = e.target.files[0];
  e.target.value = '';
  if (!dosya) return;
  const fd = new FormData();
  fd.append('dosya', dosya);
  const kutu = $('#aktarSonuc');
  kutu.innerHTML = '<div class="uyari bilgi">Aktarılıyor…</div>';
  try {
    const s = await api('/ice-aktar', { method: 'POST', body: fd });
    kutu.innerHTML = `<div class="uyari ${s.hatalar.length ? 'hata' : 'basari'}">
      ${s.eklenen} kişi eklendi, ${s.guncellenen} kişi güncellendi${s.hatalar.length ? `, ${s.hatalar.length} satır aktarılamadı:` : '.'}
      ${s.hatalar.length ? `<ul>${s.hatalar.map(h => `<li>Satır ${h.satir}: ${esc(h.mesaj)}</li>`).join('')}</ul>` : ''}</div>`;
    await personelYukle();
  } catch (err) {
    kutu.innerHTML = `<div class="uyari hata">${esc(err.message)}</div>`;
  }
});

/* ─── İş yeri giderleri ──────────────────────────────── */
async function giderYukle() {
  const liste = await api('/giderler');
  const toplam = liste.reduce((t, g) => t + Number(g.aylik_tutar), 0);
  $('#giderTablo').innerHTML = liste.length ? `
    <thead><tr><th>Gider</th><th>Kategori</th><th class="sayi">Aylık tutar</th><th></th></tr></thead>
    <tbody>${liste.map(g => `<tr><td>${esc(g.ad)}</td><td>${esc(g.kategori || '—')}</td><td class="sayi">${tl(g.aylik_tutar)}</td>
      <td><button class="dugme kucuk" data-duzenle="${g.id}">Düzenle</button>
          <button class="dugme kucuk tehlike" data-sil="${g.id}">Sil</button></td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2">Aylık toplam</td><td class="sayi">${tl(toplam)}</td><td></td></tr></tfoot>`
    : '<tbody><tr><td class="bos">Kira, elektrik, İSG hizmeti, yazılım lisansı gibi aylık giderleri ekleyin.</td></tr></tbody>';
  $('#giderTablo').dataset.liste = JSON.stringify(liste);
}

const giderFormu = (g = {}) => `
  ${alan('ad', 'Gider adı *', g.ad, 'text', 'required placeholder="Örn. Ofis kirası"')}
  <label>Kategori<input name="kategori" list="kategoriSecenek" value="${esc(g.kategori || '')}">
    <datalist id="kategoriSecenek">${['Kira', 'Enerji', 'Temizlik', 'İSG', 'Eğitim', 'Ekipman', 'Yazılım', 'İşe alım', 'Diğer'].map(k => `<option value="${k}">`).join('')}</datalist></label>
  ${alan('aylik_tutar', 'Aylık tutar (₺) *', g.aylik_tutar ?? '', 'number', 'required')}`;

async function giderKaydet(fd, id) {
  await api(id ? `/giderler/${id}` : '/giderler', { method: id ? 'PUT' : 'POST', body: Object.fromEntries(fd.entries()) });
  await giderYukle();
}

$('#giderEkle').addEventListener('click', () => modalAc({ baslik: 'Gider ekle', icerik: giderFormu(), kaydet: (fd) => giderKaydet(fd) }));

$('#giderTablo').addEventListener('click', async (e) => {
  const liste = JSON.parse($('#giderTablo').dataset.liste || '[]');
  if (e.target.dataset.duzenle) {
    const g = liste.find(x => String(x.id) === e.target.dataset.duzenle);
    modalAc({ baslik: 'Gideri düzenle', icerik: giderFormu(g), kaydet: (fd) => giderKaydet(fd, g.id) });
  }
  if (e.target.dataset.sil && confirm('Gider silinsin mi?')) {
    try { await api(`/giderler/${e.target.dataset.sil}`, { method: 'DELETE' }); await giderYukle(); } catch (err) { alert(err.message); }
  }
});

/* ─── Parametreler ───────────────────────────────────── */
const PARAMETRELER = [
  ['sgk_isveren_oran', 'İşveren SGK oranı (%)'],
  ['sgk_tesvik_puan', 'SGK teşvik indirimi (puan)'],
  ['issizlik_isveren_oran', 'İşveren işsizlik oranı (%)'],
  ['sgk_tavan', 'SGK prime esas kazanç tavanı (₺/ay, boş = yok)'],
  ['kidem_tavani', 'Kıdem tazminatı tavanı (₺, boş = yok)'],
  ['fazla_mesai_carpan', 'Fazla mesai çarpanı'],
  ['haftalik_saat', 'Haftalık çalışma saati'],
  ['gunluk_saat', 'Günlük çalışma saati'],
  ['resmi_tatil_gun', 'Yıllık resmi tatil (gün)'],
];

async function parametreYukle() {
  const p = await api('/parametreler');
  $('#prmYil').textContent = `(${p.yil})`;
  $('#prmForm').innerHTML = PARAMETRELER.map(([a, e]) => alan(a, e, p[a] == null ? '' : Number(p[a]))).join('') +
    `<input type="hidden" name="yil" value="${p.yil}"><div class="tam"><button class="dugme birincil" type="submit">Kaydet</button></div>`;
}

$('#prmForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/parametreler', { method: 'PUT', body: Object.fromEntries(new FormData(e.target).entries()) });
    alert('Parametreler kaydedildi.');
    await parametreYukle();
  } catch (err) { alert(err.message); }
});

ekranGoster();
