import React, { useMemo } from 'react';

// Deterministic Code 39 barcode SVG renderer (scannable by standard 1D USB/Laser & camera scanners)
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

interface Code128BarcodeSvgProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const Code128BarcodeSvg: React.FC<Code128BarcodeSvgProps> = ({
  value,
  height = 48,
  showText = true,
  className = '',
}) => {
  const sanitized = useMemo(() => {
    const clean = (value || 'KOPSIM-AMB')
      .toUpperCase()
      .replace(/[^0-9A-Z\-. $/+%]/g, '-');
    return `*${clean}*`;
  }, [value]);

  const bars = useMemo(() => {
    const result: Array<{ x: number; w: number }> = [];
    let cursor = 10;
    const narrow = 2;
    const wide = 5;
    const gap = 2;

    for (const ch of sanitized) {
      const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS['-'];
      for (let i = 0; i < pattern.length; i++) {
        const width = pattern[i] === 'w' ? wide : narrow;
        if (i % 2 === 0) {
          result.push({ x: cursor, w: width });
        }
        cursor += width;
      }
      cursor += gap;
    }

    return { rects: result, totalWidth: cursor + 10 };
  }, [sanitized]);

  return (
    <div className={`inline-flex flex-col items-center bg-white px-2 py-1 rounded border border-stone-200 ${className}`}>
      <svg
        viewBox={`0 0 ${bars.totalWidth} ${height}`}
        className="w-full max-w-[260px]"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`Barcode ${value}`}
      >
        <rect x={0} y={0} width={bars.totalWidth} height={height} fill="#ffffff" />
        {bars.rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={2} width={r.w} height={height - 4} fill="#111827" />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-bold tracking-widest text-stone-900 mt-0.5 tabular-nums">
          {value}
        </span>
      )}
    </div>
  );
};
