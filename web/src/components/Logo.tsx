import { LOGO_LETTERS, LOGO_REGISTERED as R, LOGO_VIEWBOX } from "@/data/logo-paths";

type Props = {
  className?: string;
  /** Render each letter in its own <g> so it can be animated (used by the loader). */
  letterClass?: string;
  registered?: boolean;
};

/** The AQUILO wordmark (vector from the client catalogue). Inherits colour via currentColor. */
export default function Logo({ className, letterClass, registered = true }: Props) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label="AQUILO" fill="currentColor">
      {LOGO_LETTERS.map((l, i) => (
        <path key={i} d={l.d} className={letterClass} fillRule="evenodd" />
      ))}
      {registered && (
        <g transform={`translate(${R.cx} ${R.cy})`}>
          <circle r={R.r - 2} fill="none" stroke="currentColor" strokeWidth="4.5" />
          <text y="14" textAnchor="middle" fontSize="40" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif">R</text>
        </g>
      )}
    </svg>
  );
}
