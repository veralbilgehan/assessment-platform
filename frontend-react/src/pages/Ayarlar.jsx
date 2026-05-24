import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

function authH() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}
function Kart({ children, style }) {
  return <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem', ...style }}>{children}</div>;
}
function Lbl({ children, required }) {
  return (
    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:6 }}>
      {children}{required && <span style={{ color:'#ef4444', marginLeft:3 }}>*</span>}
    </div>
  );
}

export default function Ayarlar() {
  const { user } = useAuth();
  const [form, setForm] = useState({ smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', email_from:'' });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [test, setTest] = useState({ yukleniyor:false, mesaj:'', hata:'' });
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');

  useEffect(() => { yukle(); }, []);

  async function yukle() {
    setYukleniyor(true);
    try {
      const res = await fetch(`${API}/api/ayarlar`, { headers: authH() });
      if (res.ok) { const d = await res.json(); setForm(prev => ({ ...prev, ...d })); }
    } catch(e) {}
    finally { setYukleniyor(false); }
  }

  async function kaydet(e) {
    e.preventDefault();
    setKaydediliyor(true); setBasari(''); setHata('');
    try {
      const res = await fetch(`${API}/api/ayarlar`, { method:'POST', headers: authH(), body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setHata(d.hata || 'Hata'); }
      else { setBasari('Ayarlar kaydedildi.'); }
    } catch(e) { setHata(e.message); }
    finally { setKaydediliyor(false); }
  }

  async function smtpTest() {
    setTest({ yukleniyor:true, mesaj:'', hata:'' });
    try {
      const res = await fetch(`${API}/api/ayarlar/smtp-test`, { method:'POST', headers: authH() });
      const d = await res.json();
      if (!res.ok) setTest({ yukleniyor:false, mesaj:'', hata: d.hata || 'Bağlantı başarısız.' });
      else setTest({ yukleniyor:false, mesaj: d.mesaj || 'Test e-postası gönderildi!', hata:'' });
    } catch(e) { setTest({ yukleniyor:false, mesaj:'', hata: e.message }); }
  }

  if (user?.rol !== 'admin') {
    return (
      <Kart style={{ textAlign:'center', padding:'3rem' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <div style={{ fontSize:15, fontWeight:700 }}>Bu sayfa yalnızca adminlere açıktır.</div>
      </Kart>
    );
  }

  if (yukleniyor) return <div style={{ padding:'2rem', color:'var(--muted)', fontSize:13 }}>Yükleniyor...</div>;

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.2rem', fontWeight:800, margin:0 }}>⚙️ Sistem Ayarları</h1>
        <p style={{ fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>E-posta ve SMTP yapılandırması</p>
      </div>

      <Kart>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:'1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--border)' }}>
          📧 SMTP / E-posta Ayarları
        </div>

        <form onSubmit={kaydet}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <Lbl required>SMTP Sunucusu (Host)</Lbl>
              <input
                value={form.smtp_host} onChange={e => setForm(p => ({ ...p, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
                style={{ width:'100%' }}
              />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                Gmail: smtp.gmail.com · Outlook: smtp.office365.com · Yandex: smtp.yandex.com
              </div>
            </div>

            <div>
              <Lbl required>Port</Lbl>
              <div style={{ display:'flex', gap:6 }}>
                {[['587','TLS'],['465','SSL'],['25','25']].map(([p,l]) => (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, smtp_port: p }))} style={{
                    padding:'0.35rem 0.7rem', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${form.smtp_port===p ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.smtp_port===p ? 'var(--accent-dim)' : 'transparent',
                    color: form.smtp_port===p ? 'var(--accent)' : 'var(--muted)',
                  }}>{p} <span style={{ fontWeight:400 }}>({l})</span></button>
                ))}
              </div>
            </div>

            <div>
              <Lbl>Özel Port</Lbl>
              <input
                type="number" value={form.smtp_port}
                onChange={e => setForm(p => ({ ...p, smtp_port: e.target.value }))}
                style={{ width:'100%' }}
              />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <Lbl required>E-posta Adresi (SMTP_USER)</Lbl>
              <input
                type="email" value={form.smtp_user}
                onChange={e => setForm(p => ({ ...p, smtp_user: e.target.value }))}
                placeholder="ornek@gmail.com"
                style={{ width:'100%' }}
              />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <Lbl required>Şifre / Uygulama Şifresi (SMTP_PASS)</Lbl>
              <input
                type="password" value={form.smtp_pass}
                onChange={e => setForm(p => ({ ...p, smtp_pass: e.target.value }))}
                placeholder="Gmail App Password veya hesap şifresi"
                style={{ width:'100%' }}
                autoComplete="new-password"
              />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                Gmail kullanıyorsanız: Google Hesabı → Güvenlik → 2 Adımlı Doğrulama → Uygulama Şifresi
              </div>
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <Lbl>Gönderen Adı / Adresi (EMAIL_FROM)</Lbl>
              <input
                value={form.email_from}
                onChange={e => setForm(p => ({ ...p, email_from: e.target.value }))}
                placeholder='"Değerlendirme Sistemi" <ornek@gmail.com>'
                style={{ width:'100%' }}
              />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Boş bırakılırsa SMTP e-posta adresi kullanılır.</div>
            </div>
          </div>

          {basari && (
            <div style={{ marginBottom:12, padding:'0.6rem 1rem', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:8, fontSize:13, color:'#22c55e', fontWeight:600 }}>
              ✓ {basari}
            </div>
          )}
          {hata && (
            <div style={{ marginBottom:12, padding:'0.6rem 1rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, fontSize:13, color:'#ef4444' }}>
              ✗ {hata}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button type="submit" disabled={kaydediliyor} style={{
              flex:2, padding:'0.7rem', borderRadius:8, border:'none',
              background: kaydediliyor ? 'var(--muted)' : 'var(--accent)',
              color:'#fff', fontSize:13, fontWeight:700, cursor: kaydediliyor ? 'not-allowed' : 'pointer',
            }}>
              {kaydediliyor ? 'Kaydediliyor...' : '💾 Ayarları Kaydet'}
            </button>
            <button type="button" onClick={smtpTest} disabled={test.yukleniyor} style={{
              flex:1, padding:'0.7rem', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--surface2)', color:'var(--text)', fontSize:13, fontWeight:600,
              cursor: test.yukleniyor ? 'not-allowed' : 'pointer',
            }}>
              {test.yukleniyor ? '⚙️ Test...' : '📤 Test E-postası'}
            </button>
          </div>
        </form>

        {test.mesaj && (
          <div style={{ marginTop:10, padding:'0.6rem 1rem', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:8, fontSize:13, color:'#22c55e' }}>
            ✅ {test.mesaj}
          </div>
        )}
        {test.hata && (
          <div style={{ marginTop:10, padding:'0.6rem 1rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, fontSize:13, color:'#ef4444' }}>
            ❌ {test.hata}
          </div>
        )}
      </Kart>

      <Kart style={{ marginTop:12 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:'0.75rem' }}>ℹ️ Gmail Kurulum Rehberi</div>
        <ol style={{ fontSize:12, color:'var(--muted)', lineHeight:1.8, paddingLeft:18, margin:0 }}>
          <li>Google hesabınızda <strong style={{ color:'var(--text)' }}>2 Adımlı Doğrulama</strong> aktif olmalı</li>
          <li><strong style={{ color:'var(--text)' }}>myaccount.google.com → Güvenlik → Uygulama Şifreleri</strong></li>
          <li>"Diğer" seçin, bir isim verin (ör: Değerlendirme Sistemi), şifreyi kopyalayın</li>
          <li>SMTP_PASS alanına bu 16 haneli şifreyi yapıştırın</li>
          <li>SMTP Host: <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4 }}>smtp.gmail.com</code>, Port: <code style={{ background:'var(--surface2)', padding:'1px 5px', borderRadius:4 }}>587</code></li>
        </ol>
      </Kart>
    </div>
  );
}
