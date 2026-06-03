/**
 * Polska odmiana przez przypadki dla liczebników.
 * pluralize(5, "piosenka", "piosenki", "piosenek") → "5 piosenek"
 */
export function pluralize(count, one, few, many) {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} ${few}`;
  return `${count} ${many}`;
}

export const plSong    = (n) => pluralize(n, "piosenka",     "piosenki",    "piosenek");
export const plChord   = (n) => pluralize(n, "akord",        "akordy",      "akordów");
export const plDay     = (n) => pluralize(n, "dzień serii",  "dni serii",   "dni serii");
export const plArtist  = (n) => pluralize(n, "artysta",      "artystów",    "artystów");
export const plVersion = (n) => pluralize(n, "wersja",       "wersje",      "wersji");
