"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const LIGHT = "#ffffff";
const DARK = "#0a0a0a";

/**
 * Keeps the browser/PWA chrome (Android status bar, gesture nav bar, iOS Safari
 * toolbar) matching the app's resolved theme, including the in-app toggle that
 * next-themes drives independently of the OS preference.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" ? DARK : LIGHT;
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }
    // Drop the media attribute so the explicit choice wins over the OS preference.
    metas.forEach((meta) => {
      meta.removeAttribute("media");
      meta.content = color;
    });
  }, [resolvedTheme]);

  return null;
}
