export function Kbd({ children, className = '' }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded border border-zinc-700 bg-zinc-800 text-[11px] font-mono font-medium text-zinc-300 shadow-[0_1px_0_1px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </kbd>
  );
}

export function KbdGroup({ children }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {children}
    </span>
  );
}
