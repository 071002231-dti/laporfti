import React, { createContext, useContext, useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export const THEME_STORAGE_KEY = "fti_dark_mode";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * Returns true if the stored theme preference is dark.
 * Default is dark (true) to match the portal design system.
 */
export function getStoredTheme(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored !== null) {
    return stored === "true";
  }
  return true;
}

/**
 * Applies the 'dark' class to <html> element and persists the choice in localStorage.
 */
export function applyTheme(isDark: boolean): void {
  if (typeof document === "undefined") return;
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, String(isDark));
  } catch {
    // Gracefully handle storage quota or private mode restrictions
  }
}

/**
 * Context Provider so all buttons across header, sidebar, and login share one reactive state.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(getStoredTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue !== null) {
        setIsDark(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const setTheme = (dark: boolean) => setIsDark(dark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to consume the shared theme context.
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Visual button component to toggle between dark and light themes.
 */
export const ThemeToggle: React.FC<{
  className?: string;
  variant?: "pill" | "icon" | "full";
}> = ({ className = "", variant = "pill" }) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? "Beralih ke tema cerah" : "Beralih ke tema gelap"}
        aria-label={isDark ? "Beralih ke tema cerah" : "Beralih ke tema gelap"}
        className={`p-2 rounded-xl bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-[#2a3942] transition-colors cursor-pointer ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500" />
        )}
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={isDark ? "Beralih ke tema cerah" : "Beralih ke tema gelap"}
        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${className}`}
      >
        <span className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
          <span>Tema Tampilan</span>
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400">
          {isDark ? "Gelap" : "Cerah"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Beralih ke tema cerah" : "Beralih ke tema gelap"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-[#2a3942] transition-colors cursor-pointer text-xs font-semibold ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Tema Cerah</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Tema Gelap</span>
        </>
      )}
    </button>
  );
};
