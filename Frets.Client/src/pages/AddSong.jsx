import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import api from "../api/client";

const DRAFT_KEY = "frets:add-song:draft:v1";
const TAB_TEMPLATE = `e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|----------------|
E|----------------|`;

function AddSong() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [versionType, setVersionType] = useState("chords");
  const [tuningId, setTuningId] = useState("");
  const [songKey, setSongKey] = useState("");
  const [capo, setCapo] = useState(0);
  const [tabContent, setTabContent] = useState("");
  const [chordEditorText, setChordEditorText] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [allChords, setAllChords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tunings, setTunings] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const chordTextareaRef = useRef(null);
  const chordOverlayRef = useRef(null);
  const tabTextareaRef = useRef(null);

  const autoResizeTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const loadMetadata = async () => {
      setMetaLoading(true);
      setError("");
      try {
        const [metaRes, chordsRes] = await Promise.all([
          api.get("/songs/meta"),
          api.get("/chords"),
        ]);

        const sortedCategories = [...(metaRes.data.categories ?? [])].sort((a, b) => {
          if (a.slug === "inne") return 1;
          if (b.slug === "inne") return -1;
          return a.name.localeCompare(b.name, "pl");
        });
        setCategories(sortedCategories);
        setTunings(metaRes.data.tunings ?? []);
        setAllChords((chordsRes.data ?? []).map((chord) => `${chord.key}${chord.suffix}`));

        if (sortedCategories.length > 0) {
          const fallbackCategory =
            sortedCategories.find((c) => c.slug === "inne") ?? sortedCategories[0];
          setCategoryId(fallbackCategory.id);
        }
        if (metaRes.data.tunings?.length > 0) {
          const defaultTuning =
            metaRes.data.tunings.find((t) => t.code === "standard") ??
            metaRes.data.tunings.find((t) => t.name?.toLowerCase() === "standard") ??
            metaRes.data.tunings[0];
          setTuningId(defaultTuning.id);
        }
      } catch {
        setError("Nie udało się pobrać kategorii, strojów lub akordów.");
      } finally {
        setMetaLoading(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setTitle(draft.title ?? "");
      setArtist(draft.artist ?? "");
      setVersionType(draft.versionType ?? "chords");
      setSongKey(draft.songKey ?? "");
      setCapo(draft.capo ?? 0);
      setTabContent(draft.tabContent ?? "");
      setChordEditorText(draft.chordEditorText ?? "");
    } catch {
      // Ignore broken drafts.
    }
  }, []);

  useEffect(() => {
    const draft = {
      title,
      artist,
      versionType,
      songKey,
      capo,
      tabContent,
      chordEditorText,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, artist, versionType, songKey, capo, tabContent, chordEditorText]);

  useEffect(() => {
    autoResizeTextarea(chordTextareaRef.current);
  }, [chordEditorText, versionType]);

  useEffect(() => {
    autoResizeTextarea(tabTextareaRef.current);
  }, [tabContent, versionType]);

  const chordSet = useMemo(
    () => new Set(allChords.map((chord) => chord.toLowerCase())),
    [allChords]
  );

  const isLikelyChordToken = (token) => {
    if (!token) return false;
    const cleaned = token.trim().replace(/[()[\]{},.;:!?'"`]/g, "");
    if (!cleaned) return false;
    if (chordSet.has(cleaned.toLowerCase())) return true;
    return /^[A-H](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-H](?:#|b)?)?$/i.test(cleaned);
  };

  const parsedChordEditor = useMemo(() => {
    const lines = chordEditorText.split("\n");
    const parsed = [];

    const isChordToken = (token) => isLikelyChordToken(token);
    const splitToTokens = (line) =>
      line
        .trim()
        .split(/\s+/)
        .map((token) => token.replace(/[()[\]{},.;:!?'"`]/g, ""))
        .filter(Boolean);

    const getChordTokens = (line) => {
      const tokens = splitToTokens(line);
      return tokens.filter((token) => isChordToken(token));
    };

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
  }, [chordEditorText, chordSet]);

  const chordEditorStats = useMemo(() => {
    const lines = chordEditorText.split("\n");
    let chordLines = 0;
    let mixedLines = 0;

    for (const line of lines) {
      const tokens = line
        .trim()
        .split(/\s+/)
        .map((token) => token.replace(/[()[\]{},.;:!?'"`]/g, ""))
        .filter(Boolean);

      if (tokens.length === 0) continue;
      const chordCount = tokens.filter((token) => isLikelyChordToken(token)).length;
      if (chordCount === tokens.length) chordLines += 1;
      else if (chordCount > 0) mixedLines += 1;
    }

    return {
      totalLines: lines.length,
      chordLines,
      mixedLines,
    };
  }, [chordEditorText, chordSet]);

  const hasMixedChordLines = chordEditorStats.mixedLines > 0;

  const chordAutocompleteState = useMemo(() => {
    if (versionType !== "chords") return { token: "", tokenStart: -1, suggestions: [] };
    const safeCursor = Math.max(0, Math.min(cursorPos, chordEditorText.length));
    const left = chordEditorText.slice(0, safeCursor);
    const tokenMatch = left.match(/(^|\s)([A-Ha-h][^\s]*)$/);
    if (!tokenMatch) return { token: "", tokenStart: -1, suggestions: [] };
    const token = tokenMatch[2].trim();
    if (!token) return { token: "", tokenStart: -1, suggestions: [] };

    const generatedBasic = ["A", "Am", "B", "Bm", "C", "Cm", "D", "Dm", "E", "Em", "F", "Fm", "G", "Gm"];
    const source = Array.from(new Set([...allChords, ...generatedBasic]));
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
  }, [allChords, chordEditorText, cursorPos, versionType]);

  const chordAutocomplete = chordAutocompleteState.suggestions;

  const applyChordSuggestion = (suggestion) => {
    if (!chordTextareaRef.current) return;
    const el = chordTextareaRef.current;
    const end = el.selectionEnd ?? cursorPos;
    const tokenStart = chordAutocompleteState.tokenStart;
    if (tokenStart < 0) return;
    const right = chordEditorText.slice(end);
    const nextText = `${chordEditorText.slice(0, tokenStart)}${suggestion}${right}`;
    setChordEditorText(nextText);

    const nextPos = tokenStart + suggestion.length;
    setCursorPos(nextPos);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const insertSectionHeader = (label) => {
    const el = chordTextareaRef.current;
    if (!el) {
      setChordEditorText((prev) => `${prev}\n[${label}]`.trim());
      return;
    }
    const start = el.selectionStart ?? chordEditorText.length;
    const end = el.selectionEnd ?? start;
    const before = chordEditorText.slice(0, start);
    const after = chordEditorText.slice(end);
    const prefix = before.endsWith("\n") || before.length === 0 ? "" : "\n";
    const insertion = `${prefix}[${label}]\n`;
    const nextText = `${before}${insertion}${after}`;
    setChordEditorText(nextText);
    const nextPos = before.length + insertion.length;
    setCursorPos(nextPos);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle("");
    setArtist("");
    setSongKey("");
    setCapo(0);
    setTabContent("");
    setChordEditorText("");
    setError("");
  };

  const insertIntoTab = (textToInsert) => {
    const el = tabTextareaRef.current;
    if (!el) {
      setTabContent((prev) => `${prev}${textToInsert}`);
      return;
    }
    const start = el.selectionStart ?? tabContent.length;
    const end = el.selectionEnd ?? start;
    const next = `${tabContent.slice(0, start)}${textToInsert}${tabContent.slice(end)}`;
    const nextPos = start + textToInsert.length;
    setTabContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const insertTabMeasure = () => insertIntoTab("|----------------|");

  const loadTabTemplate = () => {
    setTabContent(TAB_TEMPLATE);
    requestAnimationFrame(() => {
      tabTextareaRef.current?.focus();
    });
  };

  const escapeHtml = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const highlightedEditorHtml = useMemo(() => {
    const regex = /(\S+)/g;
    return chordEditorText
      .split("\n")
      .map((line) => {
        const lineTokens = line
          .trim()
          .split(/\s+/)
          .map((token) => token.replace(/[()[\]{},.;:!?'"`]/g, ""))
          .filter(Boolean);
        const isPureChordLine =
          lineTokens.length > 0 && lineTokens.every((token) => isLikelyChordToken(token));

        let result = "";
        let lastIndex = 0;
        for (const match of line.matchAll(regex)) {
          const token = match[0];
          const start = match.index ?? 0;
          const end = start + token.length;
          result += escapeHtml(line.slice(lastIndex, start));
          if (isPureChordLine && isLikelyChordToken(token)) {
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
  }, [chordEditorText, chordSet]);

  const buildChordJsonFromEditor = () => {
    const lines = parsedChordEditor.map((line) => ({
      lyrics: line.lyrics,
      chords: line.chords,
    }));

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const content = versionType === "chords" ? buildChordJsonFromEditor() : tabContent;

    if (versionType === "chords" && !chordEditorText.trim()) {
      setError("Wpisz treść piosenki lub linie z akordami.");
      setLoading(false);
      return;
    }

    const payload = {
      title,
      artist,
      categoryId,
      version: content.trim()
        ? {
            versionType,
            tuningId,
            key: songKey || null,
            capo: Number(capo),
            content,
          }
        : null,
    };

    try {
      await api.post("/songs", payload);
      localStorage.removeItem(DRAFT_KEY);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === "string" ? data : "Nie udało się dodać piosenki.");
    } finally {
      setLoading(false);
    }
  };

  if (metaLoading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container style={{ maxWidth: "980px" }} className="mt-4">
      <Card>
        <Card.Body>
          <h3 className="mb-4">Dodaj piosenkę</h3>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Tytuł</Form.Label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Artysta</Form.Label>
              <Form.Control
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Kategoria</Form.Label>
              <Form.Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <hr />
            <h5 className="mb-3">Wersja</h5>

            <Form.Group className="mb-3">
              <Form.Label>Typ</Form.Label>
              <Form.Select
                value={versionType}
                onChange={(e) => setVersionType(e.target.value)}
              >
                <option value="chords">Akordy</option>
                <option value="tab">Tabulatura</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Strój</Form.Label>
              <Form.Select value={tuningId} onChange={(e) => setTuningId(e.target.value)} required>
                {tunings.map((tuning) => (
                  <option key={tuning.id} value={tuning.id}>
                    {tuning.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tonacja</Form.Label>
              <Form.Control
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                placeholder="np. C, Am (opcjonalnie)"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Kapodaster</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={capo}
                onChange={(e) => setCapo(e.target.value)}
              />
            </Form.Group>

            {versionType === "chords" ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Treść i akordy</Form.Label>
                  <div className="mb-2 d-flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Zwrotka")}>
                      + Zwrotka
                    </Button>
                    <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Refren")}>
                      + Refren
                    </Button>
                    <Button size="sm" variant="outline-secondary" type="button" onClick={() => insertSectionHeader("Bridge")}>
                      + Bridge
                    </Button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <Form.Control
                      ref={chordTextareaRef}
                      as="textarea"
                      rows={12}
                      value={chordEditorText}
                      onChange={(e) => {
                        setChordEditorText(e.target.value);
                        setCursorPos(e.target.selectionStart ?? 0);
                      autoResizeTextarea(e.target);
                        if (chordOverlayRef.current) {
                          chordOverlayRef.current.scrollTop = e.target.scrollTop;
                        }
                      }}
                      onClick={(e) => setCursorPos(e.target.selectionStart ?? 0)}
                      onKeyUp={(e) => setCursorPos(e.target.selectionStart ?? 0)}
                      onScroll={(e) => {
                        if (chordOverlayRef.current) {
                          chordOverlayRef.current.scrollTop = e.target.scrollTop;
                          chordOverlayRef.current.scrollLeft = e.target.scrollLeft;
                        }
                      }}
                      style={{
                        fontFamily: "monospace",
                        position: "relative",
                        background: "transparent",
                        color: "transparent",
                        caretColor: "#212529",
                        zIndex: 2,
                        resize: "none",
                        overflow: "hidden",
                        minHeight: "280px",
                      }}
                      placeholder={"Przykład:\nAm   F   C   G\nTo jest moja linia tekstu\n\nC   G\nNastępna linia"}
                      required
                    />
                    <div
                      ref={chordOverlayRef}
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "0.375rem 0.75rem",
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        pointerEvents: "none",
                        border: "1px solid #ced4da",
                        borderRadius: "0.375rem",
                        backgroundColor: "#fff",
                        lineHeight: "1.5",
                      }}
                      dangerouslySetInnerHTML={{ __html: `${highlightedEditorHtml || "&nbsp;"}\n` }}
                    />
                  </div>
                  {chordAutocomplete.length > 0 && (
                    <div className="border rounded mt-2 p-2 bg-light">
                      <div className="small text-muted mb-1">
                        Podpowiedzi akordów (kliknij, aby wstawić)
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {chordAutocomplete.map((suggestion) => (
                          <Button
                            key={suggestion}
                            type="button"
                            size="sm"
                            variant="outline-primary"
                            onClick={() => applyChordSuggestion(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasMixedChordLines && (
                    <Alert variant="warning" className="mt-2 mb-0 py-2">
                      Wykryto linie mieszane (tekst + akordy). Takie linie są traktowane jako zwykły tekst.
                    </Alert>
                  )}
                  <Form.Text className="text-muted">
                    Jeśli linia zawiera rozpoznane akordy, traktujemy ją jako linię akordów dla następnej linii tekstu.
                  </Form.Text>
                </Form.Group>
              </>
            ) : (
              <>
                <Form.Group className="mb-2">
                  <Form.Label>Edytor tabulatury</Form.Label>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button type="button" size="sm" variant="outline-secondary" onClick={loadTabTemplate}>
                      Szablon 6 strun
                    </Button>
                    <Button type="button" size="sm" variant="outline-secondary" onClick={insertTabMeasure}>
                      Wstaw takt
                    </Button>
                    <Button type="button" size="sm" variant="outline-secondary" onClick={() => insertIntoTab("-")}>
                      Wstaw "-"
                    </Button>
                    <Button type="button" size="sm" variant="outline-secondary" onClick={() => insertIntoTab("\n")}>
                      Nowa linia
                    </Button>
                  </div>
                </Form.Group>
                <Card className="mb-3 border-0" style={{ background: "#f8f9fb" }}>
                  <Card.Body className="p-3">
                    <Form.Control
                      ref={tabTextareaRef}
                      as="textarea"
                      value={tabContent}
                      onChange={(e) => {
                        setTabContent(e.target.value);
                        autoResizeTextarea(e.target);
                      }}
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                        fontSize: "14px",
                        lineHeight: "1.45",
                        borderColor: "#cfd6e4",
                        background: "#ffffff",
                        resize: "none",
                        overflow: "hidden",
                        minHeight: "240px",
                      }}
                      placeholder={TAB_TEMPLATE}
                      required
                    />
                    <div className="small text-muted mt-2">
                      Pisz ręcznie albo klikaj skróty. Najlepiej 1 takt na linię dla czytelności.
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}

            <div
              className="mt-4 d-flex gap-2 justify-content-end align-items-center"
              style={{
                paddingTop: "10px",
              }}
            >
              <Button type="button" variant="outline-danger" onClick={clearDraft} disabled={loading}>
                Wyczyść
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Dodawanie..." : "Dodaj piosenkę"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AddSong;