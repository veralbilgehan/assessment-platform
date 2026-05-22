const colors = {
  blue:   { bg: 'var(--accent-dim)',            color: 'var(--accent)',  border: 'var(--accent)' },
  green:  { bg: 'rgba(34,197,94,0.12)',          color: 'var(--green)',   border: 'var(--green)' },
  yellow: { bg: 'rgba(234,179,8,0.12)',          color: 'var(--yellow)',  border: 'var(--yellow)' },
  gray:   { bg: 'var(--surface2)',               color: 'var(--muted)',   border: 'var(--border)' },
  red:    { bg: 'rgba(239,68,68,0.12)',          color: 'var(--red)',     border: 'var(--red)' },
};

export default function Badge({ children, variant = 'gray', style }) {
  const c = colors[variant] || colors.gray;
  return (
    <span style={{
      padding: '0.22rem 0.6rem',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      ...style,
    }}>
      {children}
    </span>
  );
}
