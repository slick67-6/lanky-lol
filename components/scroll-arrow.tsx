"use client";

export function ScrollArrow() {
  return (
    <div className="animate-float mt-10 flex flex-col items-center gap-2 text-cyan-400/80">
      <span className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
        Scroll
      </span>
      <svg
        width="32"
        height="48"
        viewBox="0 0 32 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]"
        aria-hidden
      >
        <path
          d="M16 4V36"
          stroke="url(#arrow-line)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8 28L16 38L24 28"
          stroke="url(#arrow-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="arrow-line" x1="16" y1="4" x2="16" y2="38">
            <stop stopColor="#67e8f9" />
            <stop offset="1" stopColor="#0891b2" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
