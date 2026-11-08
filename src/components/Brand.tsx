/**
 * Apex Power Ops mark: two bolts, the second mirrored so they read as an S/Z pair.
 * Built from /bolt.png (alpha mask) and tinted with currentColor, so it takes
 * whatever text colour it sits in (gold in the app chrome).
 */
export function BoltMark({ height = 28 }: { height?: number }) {
  const w = Math.round(height * 0.55);
  const bolt = (flip: boolean): React.CSSProperties => ({
    display: 'block',
    width: w,
    height,
    backgroundColor: 'currentColor',
    WebkitMask: 'url(/bolt.png) center / contain no-repeat',
    mask: 'url(/bolt.png) center / contain no-repeat',
    transform: flip ? 'scaleX(-1)' : undefined,
  });
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center text-gold"
    >
      <span style={bolt(false)} />
      <span style={{ ...bolt(true), marginLeft: -Math.round(w * 0.22) }} />
    </span>
  );
}

/** Wordmark: two-bolt mark + "APEX POWER OPS". */
export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <BoltMark height={lg ? 40 : 26} />
      <span
        className={`font-display font-black uppercase tracking-tight text-white ${lg ? 'text-2xl' : 'text-base'}`}
      >
        Apex Power <span className="text-gold">Ops</span>
      </span>
    </span>
  );
}
