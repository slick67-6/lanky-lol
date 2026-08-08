import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function ShimmerButton({ children, className = "", ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      {...props}
      className={`group relative isolate overflow-hidden rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#030712] shadow-[0_8px_32px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 -z-10 translate-x-[-120%] bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.8)_45%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[120%]" />
      {children}
    </button>
  );
}
