export default function Arrow({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} style={style} aria-hidden>
      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
