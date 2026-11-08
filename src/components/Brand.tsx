/**
 * Apex Power Ops mark: two bolts, the second mirrored so they read as an S/Z pair.
 * Built from /bolt.png (alpha mask) and tinted with currentColor, so it takes
 * the foreground color of its surrounding mark.
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
      className="inline-flex items-center"
    >
      <span style={bolt(false)} />
      <span style={{ ...bolt(true), marginLeft: -Math.round(w * 0.22) }} />
    </span>
  );
}

/** Wordmark: two-bolt mark + "APEX POWER OPS". */
export function Brand({ size = 'md', ops = true }: { size?: 'md' | 'lg'; ops?: boolean }) {
  const lg = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center rounded-xl bg-neutral-900 text-white ${lg ? 'size-11' : 'size-8'}`}>
        <BoltMark height={lg ? 26 : 19} />
      </span>
      <span className={`font-semibold tracking-tight text-neutral-900 ${lg ? 'text-2xl' : 'text-base'}`}>
        Apex Power{ops && <span className="ml-1 font-normal text-neutral-600">Ops</span>}
      </span>
    </span>
  );
}
