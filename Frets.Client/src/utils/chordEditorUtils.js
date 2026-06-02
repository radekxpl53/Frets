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
  return /^[A-H](?:#|b)?(/i.test(cleaned) || /^[A-H](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-H](?:#|b)?)?$/i.test(cleaned);
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
          result += `<span style="color:#0d6efd;font-weight:700">${escapeHtml(token)}</span>`;
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

export function buildChordJsonFromEditorText(chordEditorText, allChords) {
  const chordSet = createChordSet(allChords);
  const parsed = parseChordEditorText(chordEditorText, chordSet);

  const lines = parsed.map((line) => {
    const resolvedChords = line.chords.map((c) => {
      const matched = allChords.find((dbChord) => {
        if (typeof dbChord === "string") return false;
        const name = `${dbChord.key}${dbChord.suffix}`.toLowerCase();
        return name === c.chord.toLowerCase();
      });
      return {
        chord: c.chord,
        chordId: matched ? matched.id : null,
        offset: c.offset,
      };
    });

    return {
      lyrics: line.lyrics,
      chords: resolvedChords,
    };
  });

  return JSON.stringify(
    {
      sections: [
        {
          type: "verse",
          label: "Tekst",
          lines,
        },
      ],
    },
    null,
    2
  );
}

function buildChordLineFromOffsets(chords) {
  if (!chords || chords.length === 0) return "";
  const sorted = [...chords].sort((a, b) => a.offset - b.offset);
  let line = "";
  for (const c of sorted) {
    if (line.length < c.offset) {
      line += " ".repeat(c.offset - line.length);
    }
    line += c.chord;
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
