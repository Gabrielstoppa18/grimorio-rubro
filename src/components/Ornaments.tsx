import { useMemo } from 'react';

/** Divisória com filigrana dourada. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`divider ${className}`} aria-hidden="true">
      <span className="divider-line" />
      <svg width="120" height="22" viewBox="0 0 120 22">
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M2 11h30c6 0 8-7 14-7s7 5 4 7-6 1-6-1" />
          <path d="M118 11H88c-6 0-8-7-14-7s-7 5-4 7 6 1 6-1" />
          <path d="M32 11c6 0 8 7 14 7s7-5 4-7" opacity=".6" />
          <path d="M88 11c-6 0-8 7-14 7s-7-5-4-7" opacity=".6" />
        </g>
        <path d="M60 3l8 8-8 8-8-8z" fill="currentColor" />
        <path d="M60 7l4 4-4 4-4-4z" fill="#0c0a09" />
      </svg>
      <span className="divider-line" />
    </div>
  );
}

/** Escudo heráldico com um valor dentro (usado na Defesa). */
export function ShieldValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="shield-value" title={label}>
      <svg viewBox="0 0 80 92" aria-hidden="true">
        <defs>
          <linearGradient id="shield-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2119" />
            <stop offset="1" stopColor="#120e0b" />
          </linearGradient>
        </defs>
        <path d="M40 3 75 13v28c0 24-16 39-35 48C21 80 5 65 5 41V13z" fill="url(#shield-fill)" stroke="#c9a45c" strokeWidth="2.5" />
        <path d="M40 9 69 17.5V41c0 20-13 33-29 41C24 74 11 61 11 41V17.5z" fill="none" stroke="#c9a45c" strokeOpacity=".35" />
      </svg>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

/** Brasas subindo pelo fundo da página. */
export function Embers({ count = 22 }: { count?: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 14,
        dur: 9 + Math.random() * 10,
        size: 1.5 + Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 120,
        key: i,
      })),
    [count],
  );
  return (
    <div className="embers" aria-hidden="true">
      {sparks.map((s) => (
        <span
          key={s.key}
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `-${s.delay}s`,
            animationDuration: `${s.dur}s`,
            ['--drift' as string]: `${s.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
