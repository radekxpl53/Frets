export function chordDisplayName(key, suffix) {
  if (suffix === "major") return key;
  if (suffix === "minor") return `${key}m`;
  return `${key}${suffix}`;
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
    const chord = lookup.get(name.toLowerCase());
    if (!chord) continue;

    const id = `${chord.key}:${chord.suffix}`;
    if (seen.has(id)) continue;
    seen.add(id);
    matched.push(chord);
  }

  return matched;
}
