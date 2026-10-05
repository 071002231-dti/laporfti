import React from "react";
import { PenLine, Search, List, Settings, Home, Plus } from "lucide-react";
import type { QuickAction } from "./types";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "pen-line": PenLine,
  search: Search,
  list: List,
  settings: Settings,
  home: Home,
  plus: Plus,
};

interface QuickActionGridProps {
  actions: QuickAction[];
  onAction: (action: string) => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({ actions, onAction }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a) => {
        const Icon = ICON_MAP[a.icon] || PenLine;
        return (
          <button
            key={a.action}
            onClick={() => onAction(a.action)}
            className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
              <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            {a.label}
          </button>
        );
      })}
    </div>
  );
};
