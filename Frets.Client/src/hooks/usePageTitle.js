import { useEffect } from "react";

/**
 * Ustawia tytuł karty przeglądarki jako "<title> | Frets".
 * Pusty/niezdefiniowany title jest ignorowany (np. zanim dane się załadują).
 */
export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | Frets`;
  }, [title]);
}
