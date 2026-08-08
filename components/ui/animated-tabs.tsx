import type { ReactNode } from "react";

export function AnimatedTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode }>;
  activeTab: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/20 p-1">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300 ${
              active ? "bg-white text-[#030712] shadow-lg shadow-white/10" : "text-white/45 hover:bg-white/[0.07] hover:text-white/80"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
