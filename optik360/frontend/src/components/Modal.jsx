import { useEffect } from 'react';

export default function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="fade-in" style={{
        background: 'var(--surface)', borderRadius: 12,
        width: '100%', maxWidth: width, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', color: 'var(--muted)', fontSize: 20,
            lineHeight: 1, padding: '0 .25rem',
          }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
