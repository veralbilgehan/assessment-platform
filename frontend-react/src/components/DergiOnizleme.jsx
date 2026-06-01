export default function DergiOnizleme({ d, id, onClose }) {
  const aday    = d?.aday_ad    || 'İsimsiz Aday';
  const pozisyon= d?.pozisyon_adi  || '';
  const departman=d?.departman_adi || '';
  const sektor  = d?.sektor_adi   || '';
  const makale  = d?.uretilen_makale || '';
  const tarih   = d?.olusturma
    ? new Date(d.olusturma).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })
    : '';

  const initials = aday
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  const excerpt = makale
    ? makale.replace(/\n/g, ' ').slice(0, 220) + (makale.length > 220 ? '…' : '')
    : null;

  function yazdir() {
    document.body.classList.add('dergi-aktif');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('dergi-aktif');
    }, { once: true });
    window.print();
  }

  return (
    <div
      className="dergi-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {/* Aksiyonlar — ekranda görünür, baskıda gizlenir */}
      <div className="dergi-actions" style={{
        position: 'fixed', top: 20, right: 24,
        display: 'flex', gap: 8, zIndex: 201,
      }}>
        <button
          onClick={yazdir}
          style={{
            padding: '0.5rem 1.1rem',
            background: '#fff', color: '#1a1f36',
            border: '1px solid #dde2ee',
            borderRadius: 6, fontWeight: 600, fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ⬇ PDF İndir
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'transparent', color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6, fontSize: 18, lineHeight: 1,
            cursor: 'pointer',
          }}
        >✕</button>
      </div>

      {/* A4 Magazin Kapağı */}
      <div
        className="dergi-kapak"
        style={{
          width: 'min(460px, 90vw)',
          aspectRatio: '794 / 1123',
          background: '#fff',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}
      >
        {/* Üst şerit */}
        <div style={{
          background: '#1a1f36',
          color: '#fff',
          padding: '6px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          <span>{[sektor, departman].filter(Boolean).join(' · ') || 'İnsan Kaynakları'}</span>
          <span>{tarih}</span>
        </div>

        {/* Hero — aday avatarı */}
        <div style={{
          background: 'linear-gradient(160deg, #1a1f36 0%, #2d3561 50%, #6366f1 100%)',
          flex: '0 0 42%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Arka plan desen */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(139,92,246,0.2) 0%, transparent 50%)',
          }} />
          {/* Baş harf avatarı */}
          <div style={{
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
            letterSpacing: '0.05em',
            zIndex: 1,
          }}>
            {initials}
          </div>
        </div>

        {/* İçerik alanı */}
        <div style={{ flex: 1, padding: '16px 20px 14px', display: 'flex', flexDirection: 'column' }}>
          {/* Marka */}
          <div style={{
            fontSize: 11,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#6366f1',
            fontFamily: "'Segoe UI', sans-serif",
            fontWeight: 700,
            marginBottom: 6,
          }}>
            D E R G İ
          </div>

          {/* İnce çizgi */}
          <div style={{ height: 1, background: '#1a1f36', marginBottom: 10 }} />

          {/* Aday adı */}
          <div style={{
            fontSize: 22,
            fontStyle: 'italic',
            fontWeight: 700,
            color: '#1a1f36',
            lineHeight: 1.2,
            marginBottom: 6,
          }}>
            {aday}
          </div>

          {/* Pozisyon + Sayı */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 10,
          }}>
            {pozisyon && (
              <div style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6b7591',
                fontFamily: "'Segoe UI', sans-serif",
              }}>
                {pozisyon}
              </div>
            )}
            <div style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: '#6b7591',
              fontFamily: "'Segoe UI', sans-serif",
              marginLeft: 'auto',
            }}>
              SAYI #{id}
            </div>
          </div>

          {/* İnce çizgi */}
          <div style={{ height: 1, background: '#dde2ee', marginBottom: 10 }} />

          {/* Makale özeti */}
          {excerpt ? (
            <div style={{
              fontSize: 10.5,
              lineHeight: 1.7,
              color: '#3a4060',
              flex: 1,
              overflow: 'hidden',
            }}>
              {excerpt}
            </div>
          ) : (
            <div style={{
              fontSize: 10,
              color: '#9ba5be',
              fontStyle: 'italic',
              fontFamily: "'Segoe UI', sans-serif",
            }}>
              AI değerlendirme makalesi henüz üretilmedi.
            </div>
          )}

          {/* Alt bilgi */}
          <div style={{
            marginTop: 'auto',
            paddingTop: 8,
            borderTop: '1px solid #dde2ee',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 8,
            color: '#9ba5be',
            letterSpacing: '0.05em',
            fontFamily: "'Segoe UI', sans-serif",
          }}>
            <span>ADAY DEĞERLENDİRME PLATFORMU</span>
            <span style={{ fontStyle: 'italic' }}>{tarih}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
