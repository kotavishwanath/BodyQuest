import { cn } from "@/lib/utils";

/**
 * "Cella", the friendly cell mascot. Pure SVG so it renders on the server,
 * works offline and scales crisply.
 */
export function Mascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label="Cella, a friendly smiling cell"
      className={cn("animate-float drop-shadow-lg", className)}
    >
      {/* Membrane */}
      <path
        d="M80 10c26 0 52 12 62 38s4 56-14 74-48 30-74 22S12 110 12 82 22 30 42 18 62 10 80 10Z"
        fill="#b9f0e1"
        stroke="#2fb592"
        strokeWidth="5"
      />
      {/* Nucleus */}
      <ellipse cx="108" cy="52" rx="20" ry="16" fill="#c9b8ff" stroke="#7b5cff" strokeWidth="3" />
      <circle cx="112" cy="50" r="5" fill="#7b5cff" />
      {/* Mitochondria */}
      <rect x="28" y="96" width="26" height="11" rx="5.5" fill="#ffb4a2" transform="rotate(-20 41 101)" />
      <rect x="112" y="104" width="22" height="10" rx="5" fill="#ffb4a2" transform="rotate(25 123 109)" />
      {/* Face */}
      <circle cx="62" cy="76" r="9" fill="#1f2340" />
      <circle cx="92" cy="76" r="9" fill="#1f2340" />
      <circle cx="65" cy="73" r="3" fill="#fff" />
      <circle cx="95" cy="73" r="3" fill="#fff" />
      <circle cx="50" cy="92" r="6" fill="#ff9fb6" opacity="0.8" />
      <circle cx="104" cy="92" r="6" fill="#ff9fb6" opacity="0.8" />
      <path d="M64 96q13 14 26 0" fill="none" stroke="#1f2340" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
