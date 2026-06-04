import { chordDisplayName, normalizeChordName } from "./chordNameUtils";

export function createChordSet(allChords) {
  return new Set(allChords.map((chord) => {
    if (typeof chord === "string") return chord.toLowerCase();
    return `${chord.key}${chord.suffix}`.toLowerCase();
  }));
}

export function isLikelyChordToken(token, chordSet) {
  if (!token) return false;
  const cleaned = token.trim().replace(/[()[\]{},.;:!?'"`]/g, "");
  if (!cleaned) return false;
  if (chordSet.has(cleaned.toLowerCase())) return true;
  return /^[A-H](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-H](?:#|b)?)?$/i.test(cleaned);
}

function splitToTokens(line) {
  return line
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[()[\]{},.;:!?'"`]/g, ""))
    .filter(Boolean);
}

export function parseChordEditorText(chordEditorText, chordSet) {
  const lines = chordEditorText.split("\n");
  const parsed = [];

  const isChordToken = (token) => isLikelyChordToken(token, chordSet);
  const getChordTokens = (line) => splitToTokens(line).filter((token) => isChordToken(token));

  const buildChordsFromLine = (line) => {
    const chords = [];
    const pieces = line.matchAll(/\S+/g);
    for (const piece of pieces) {
      const rawToken = piece[0];
      const token = rawToken.replace(/[()[\]{},.;:!?'"`]/g, "");
      if (token && isChordToken(token)) {
        chords.push({ chord: token, offset: piece.index ?? 0 });
      }
    }
    return chords;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index];
    const chords = buildChordsFromLine(currentLine);
    const tokens = splitToTokens(currentLine);
    const chordTokens = getChordTokens(currentLine);
    const isChordLine = tokens.length > 0 && chordTokens.length > 0 && chordTokens.length === tokens.length;

    if (isChordLine) {
      const nextLine = lines[index + 1];
      const nextLineHasChords = nextLine ? getChordTokens(nextLine).length > 0 : false;
      const lyrics = nextLine && !nextLineHasChords ? nextLine : "";
      parsed.push({ type: "chord", raw: currentLine, lyrics, chords });
      if (nextLine && !nextLineHasChords) {
        index += 1;
      }
    } else {
      parsed.push({ type: "lyrics", raw: currentLine, lyrics: currentLine, chords: [] });
    }
  }

  return parsed;
}

export function getChordEditorStats(chordEditorText, chordSet) {
  const lines = chordEditorText.split("\n");
  let chordLines = 0;
  let mixedLines = 0;

  for (const line of lines) {
    const tokens = splitToTokens(line);
    if (tokens.length === 0) continue;
    const chordCount = tokens.filter((token) => isLikelyChordToken(token, chordSet)).length;
    if (chordCount === tokens.length) chordLines += 1;
    else if (chordCount > 0) mixedLines += 1;
  }

  return {
    totalLines: lines.length,
    chordLines,
    mixedLines,
  };
}

export function getChordAutocompleteState(chordEditorText, cursorPos, allChords) {
  const safeCursor = Math.max(0, Math.min(cursorPos, chordEditorText.length));
  const left = chordEditorText.slice(0, safeCursor);
  const tokenMatch = left.match(/(^|\s)([A-Ha-h][^\s]*)$/);
  if (!tokenMatch) return { token: "", tokenStart: -1, suggestions: [] };
  const token = tokenMatch[2].trim();
  if (!token) return { token: "", tokenStart: -1, suggestions: [] };

  const generatedBasic = ["A", "Am", "B", "Bm", "C", "Cm", "D", "Dm", "E", "Em", "F", "Fm", "G", "Gm"];
  const chordNames = allChords.map((chord) => typeof chord === "string" ? chord : `${chord.key}${chord.suffix}`);
  const source = Array.from(new Set([...chordNames, ...generatedBasic]));
  const exactMatch = source.some((chord) => chord.toLowerCase() === token.toLowerCase());
  const rootToken = token.match(/^[A-Ha-h](?:#|b)?/)?.[0] ?? token;
  const queryToken = exactMatch ? rootToken : token;
  const suggestions = source
    .filter((chord) => chord.toLowerCase().startsWith(queryToken.toLowerCase()))
    .slice(0, 8);
  return {
    token: queryToken,
    tokenStart: safeCursor - token.length,
    suggestions,
  };
}

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildHighlightedEditorHtml(chordEditorText, chordSet) {
  const regex = /(\S+)/g;
  return chordEditorText
    .split("\n")
    .map((line) => {
      const lineTokens = splitToTokens(line);
      const isPureChordLine =
        lineTokens.length > 0 && lineTokens.every((token) => isLikelyChordToken(token, chordSet));

      let result = "";
      let lastIndex = 0;
      for (const match of line.matchAll(regex)) {
        const token = match[0];
        const start = match.index ?? 0;
        const end = start + token.length;
        result += escapeHtml(line.slice(lastIndex, start));
        if (isPureChordLine && isLikelyChordToken(token, chordSet)) {
          result += `<span style="color:var(--frets-accent-light);font-weight:700">${escapeHtml(token)}</span>`;
        } else {
          result += escapeHtml(token);
        }
        lastIndex = end;
      }
      result += escapeHtml(line.slice(lastIndex));
      return result;
    })
    .join("\n");
}

function sectionTypeFromLabel(label) {
  const l = label.toLowerCase();
  if (l.includes("zwrotka") || l.includes("verse")) return "verse";
  if (l.includes("refren") || l.includes("chorus")) return "chorus";
  if (l.includes("bridge")) return "bridge";
  if (l.includes("intro")) return "intro";
  if (l.includes("outro")) return "outro";
  return "verse";
}

export function buildChordJsonFromEditorText(chordEditorText, allChords) {
  const chordSet = createChordSet(allChords);

  const resolveChords = (chords) =>
    chords.map((c) => {
      const matched = allChords.find((dbChord) => {
        if (typeof dbChord === "string") return false;
        // Dopasowanie po wyświetlanej nazwie (np. "C", "Am") z normalizacją polskiej
        // notacji (mała litera = moll: "a" → "Am"). Wcześniej sklejano key+suffix.
        return (
          chordDisplayName(dbChord.key, dbChord.suffix).toLowerCase() ===
          normalizeChordName(c.chord).toLowerCase()
        );
      });
      // Zapisujemy czytelną, znormalizowaną nazwę ("a" → "Am") jako nazwę do wyświetlenia.
      return { chord: normalizeChordName(c.chord), chordId: matched ? matched.id : null, offset: c.offset };
    });

  // Podział tekstu na bloki wg nagłówków [Zwrotka] / [Refren] / ...
  const headerRe = /^\[(.+)\]$/;
  const blocks = [];
  let current = { label: "Tekst", explicit: false, textLines: [] };

  for (const raw of chordEditorText.split("\n")) {
    const m = raw.trim().match(headerRe);
    if (m) {
      if (current.explicit || current.textLines.some((l) => l.trim() !== "")) {
        blocks.push(current);
      }
      current = { label: m[1].trim(), explicit: true, textLines: [] };
    } else {
      current.textLines.push(raw);
    }
  }
  blocks.push(current);

  const sections = blocks.map((b) => {
    const parsed = parseChordEditorText(b.textLines.join("\n"), chordSet);
    const lines = parsed.map((line) => ({
      lyrics: line.lyrics,
      chords: resolveChords(line.chords),
    }));
    return { type: sectionTypeFromLabel(b.label), label: b.label, lines };
  });

  const finalSections = sections.length
    ? sections
    : [{ type: "verse", label: "Tekst", lines: [] }];

  return JSON.stringify({ sections: finalSections }, null, 2);
}

function buildChordLineFromOffsets(chords) {
  if (!chords || chords.length === 0) return "";
  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  let line = "";
  for (const c of sorted) {
    if (line.length < c.offset) {
      line += " ".repeat(c.offset - line.length);
    }
    line += normalizeChordName(c.chord);
  }
  return line.trimEnd();
}

export function chordContentJsonToEditorText(content) {
  if (!content?.trim()) return "";
  try {
    const data = JSON.parse(content);
    if (!data.sections?.length) return "";
    const out = [];
    for (const section of data.sections) {
      const label = section.label?.trim();
      if (label) {
        out.push(`[${label}]`);
      }
      for (const line of section.lines ?? []) {
        const chordLine = buildChordLineFromOffsets(line.chords);
        if (chordLine) {
          out.push(chordLine);
          if (line.lyrics) out.push(line.lyrics);
        } else if (line.lyrics) {
          out.push(line.lyrics);
        }
      }
      out.push("");
    }
    return out.join("\n").trim();
  } catch {
    return content;
  }
}

export function buildTabJsonFromAscii(asciiText) {
  if (!asciiText || !asciiText.trim()) return "";
  
  const paragraphs = asciiText.split(/\n\s*\n/);
  const sections = [];

  paragraphs.forEach((p, idx) => {
    const lines = p.split("\n").map(l => l.trim()).filter(Boolean);
    let label = "";
    let type = "intro";
    const tabLines = [];

    lines.forEach(line => {
      const headerMatch = line.match(/^\[(.*)\]$/);
      if (headerMatch) {
        label = headerMatch[1].trim();
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes("zwrotka") || lowerLabel.includes("verse")) type = "verse";
        else if (lowerLabel.includes("refren") || lowerLabel.includes("chorus")) type = "chorus";
        else if (lowerLabel.includes("bridge")) type = "bridge";
        else if (lowerLabel.includes("intro")) type = "intro";
        else if (lowerLabel.includes("outro")) type = "outro";
        else type = "verse";
        return;
      }

      const match = line.match(/^\s*([a-gA-G]?)?\s*\|(.*)/);
      if (match) {
        const stringName = match[1] || "";
        let notation = match[2] || "";
        if (notation.endsWith("|")) {
          notation = notation.slice(0, -1);
        }
        tabLines.push({ string: stringName, notation });
      }
    });

    if (tabLines.length > 0) {
      sections.push({
        type,
        label: label || `Sekcja ${idx + 1}`,
        lines: tabLines
      });
    }
  });

  return JSON.stringify({ sections }, null, 2);
}

export function tabContentJsonToEditorText(content) {
  if (!content || !content.trim()) return "";
  try {
    const data = JSON.parse(content);
    if (!data.sections || data.sections.length === 0) return content;
    
    const out = [];
    data.sections.forEach((section) => {
      if (section.label) {
        out.push(`[${section.label}]`);
      }
      section.lines.forEach((line) => {
        out.push(`${line.string}|${line.notation}|`);
      });
      out.push("");
    });
    return out.join("\n").trim();
  } catch {
    return content;
  }
}
