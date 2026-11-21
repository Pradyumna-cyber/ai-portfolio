"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = resolvedTheme === "dark";

  return (
    <button
      className="icon-button"
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {mounted &&
        (dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />)}
    </button>
  );
}
