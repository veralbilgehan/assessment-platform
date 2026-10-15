const colors = {
  blue:   { bg: 'var(--accent-dim)',          color: 'var(--accent)',  border: 'var(--accent)' },
  green:  { bg: 'rgba(22,163,74,.12)',         color: 'var(--green)',   border: 'var(--green)' },
  yellow: { bg: 'rgba(202,138,4,.12)',         color: 'var(--yellow)',  border: 'var(--yellow)' },
  red:    { bg: 'rgba(220,38,38,.12)',         color: 'var(--red)',     border: 'var(--red)' },
  orange: { bg: 'rgba(234,88,12,.12)',         color: 'var(--orange)',  border: 'var(--orange)' },
  gray:   { bg: 'rgba(107,117,145,.10)',       color: 'var(--muted)',   border: 'var(--border)' },
  purple: { bg: 'rgba(139,92,246,.12)',        color: '#7c3aed',        border: '#7c3aed' },
};

export default function Badge({ children, variant = 'gray', style }) {
  const c = colors[variant] || colors.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.18rem 0.55rem', borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}20`,
      ...style,
    }}>
      {children}
    </span>
  );
}
