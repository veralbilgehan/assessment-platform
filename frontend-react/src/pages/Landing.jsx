import { useNavigate } from 'react-router-dom';

const CANVA_EMBED = 'https://www.canva.com/design/DAHKRBf085Q/zfrVrVZD0MXuKPoQbUYhig/view?embed';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>
      <iframe
        loading="lazy"
        src={CANVA_EMBED}
        allowFullScreen
        allow="fullscreen"
        style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, border: 'none', padding: 0, margin: 0 }}
      />

      <button
        onClick={() => navigate('/giris')}
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.9rem 2.75rem',
          background: 'linear-gradient(135deg, #057c3c, #268d7c)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(5,124,60,0.5)',
          letterSpacing: '0.02em',
          transition: 'transform 0.15s, box-shadow 0.15s',
          zIndex: 10,
          fontFamily: 'Inter, system-ui, sans-serif',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 14px 40px rgba(5,124,60,0.6)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateX(-50%)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(5,124,60,0.5)';
        }}
      >
        Uygulamaya Gir →
      </button>
    </div>
  );
}
