export function chordDisplayName(key, suffix) {
  if (suffix === "major") return key;
  if (suffix === "minor") return `${key}m`;
  return `${key}${suffix}`;
}

/**
 * Normalizuje nazwę akordu do postaci standardowej (do dopasowania w bazie).
 * Polska notacja: mała litera rdzenia = molowy (a → Am, d → Dm, c# → C#m),
 * o ile nie podano już jawnej jakości literowej (np. "asus4" → "Asus4").
 * Wielka litera bez "m" pozostaje durowa.
 */
export function normalizeChordName(name) {
  if (!name) return name;
  const m = name.trim().match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return name;
  const [, root, accidental, rest] = m;
  const isLowerRoot = root === root.toLowerCase();
  let out = root.toUpperCase() + accidental;
  if (isLowerRoot && (rest === "" || /^[\d/]/.test(rest))) {
    out += `m${rest}`; // a → Am, a7 → Am7, a/C → Am/C
  } else {
    out += rest;
  }
  return out;
}

export function extractChordNamesFromContent(content) {
  if (!content?.trim()) return [];

  try {
    const data = JSON.parse(content);
    const names = new Set();

    for (const section of data.sections ?? []) {
      for (const line of section.lines ?? []) {
        for (const chord of line.chords ?? []) {
          const name = chord.chord?.trim();
          if (name) names.add(name);
        }
      }
    }

    return [...names];
  } catch {
    return [];
  }
}

export function matchChordNamesToLibrary(chordNames, libraryChords) {
  const lookup = new Map(
    libraryChords.map((chord) => [
      chordDisplayName(chord.key, chord.suffix).toLowerCase(),
      chord,
    ])
  );

  const matched = [];
  const seen = new Set();

  for (const name of chordNames) {
    const chord = lookup.get(normalizeChordName(name).toLowerCase());
    if (!chord) continue;

    const id = `${chord.key}:${chord.suffix}`;
    if (seen.has(id)) continue;
    seen.add(id);
    matched.push(chord);
  }

  return matched;
}
