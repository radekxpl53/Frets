import { useEffect, useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Button, Card, Container, Form, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordLyricsEditor from "../components/ChordLyricsEditor";
import VersionContentEditor from "../components/VersionContentEditor";
import { buildChordJsonFromEditorText, buildTabJsonFromAscii } from "../utils/chordEditorUtils";
import slugify from "../utils/slugify";
import SongSuggestField from "../components/SongSuggestField";
import FormField from "../components/FormField";
import { useFormErrors } from "../hooks/useFormErrors";
import { validateRequired } from "../utils/validation";

const DRAFT_KEY = "frets:add-song:draft:v1";

function AddSong() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [youTubeUrl, setYouTubeUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [versionType, setVersionType] = useState("chords");
  const [tuningId, setTuningId] = useState("");
  const [songKey, setSongKey] = useState("");
  const [capo, setCapo] = useState(0);
  const [tabContent, setTabContent] = useState("");
  const [chordEditorText, setChordEditorText] = useState("");
  const [allChords, setAllChords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tunings, setTunings] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // isDirty: formularz ma jakąś treść
  const isDirty = !submitted && (
    title.trim() !== "" || artist.trim() !== "" ||
    chordEditorText.trim() !== "" || tabContent.trim() !== ""
  );

  // Blokada nawigacji wewnątrz SPA
  const blocker = useBlocker(isDirty);

  // Blokada przeładowania / zamknięcia karty
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  const {
    clearErrors,
    setFieldError,
    setFieldErrors,
    getError,
    controlProps,
    applyApiError,
    bindText,
  } = useFormErrors();

  useEffect(() => {
    const loadMetadata = async () => {
      setMetaLoading(true);
      clearErrors();
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
        setAllChords(chordsRes.data ?? []);

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
        setFieldError("categoryId", "Nie udało się pobrać kategorii, strojów lub akordów.");
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
      setYouTubeUrl(draft.youTubeUrl ?? "");
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
      youTubeUrl,
      versionType,
      songKey,
      capo,
      tabContent,
      chordEditorText,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, artist, youTubeUrl, versionType, songKey, capo, tabContent, chordEditorText]);

  const handleSuggestPick = (item, field) => {
    if (field === "title" && item.title) {
      setTitle(item.title);
      return;
    }
    if (field === "artist" && item.artist) {
      setArtist(item.artist);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle("");
    setArtist("");
    setYouTubeUrl("");
    setSongKey("");
    setCapo(0);
    setTabContent("");
    setChordEditorText("");
    clearErrors();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const content =
      versionType === "chords"
        ? buildChordJsonFromEditorText(chordEditorText, allChords)
        : buildTabJsonFromAscii(tabContent);

    const nextErrors = {};
    const titleError = validateRequired(title, "Podaj tytuł piosenki.");
    const artistError = validateRequired(artist, "Podaj wykonawcę.");
    if (titleError) nextErrors.title = titleError;
    if (artistError) nextErrors.artist = artistError;

    if (versionType === "chords" && !chordEditorText.trim()) {
      nextErrors.content = "Wpisz treść piosenki lub linie z akordami.";
    } else if (versionType === "tab" && !tabContent.trim()) {
      nextErrors.content = "Wpisz treść tabulatury.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    const payload = {
      title,
      artist,
      categoryId,
      youTubeUrl: youTubeUrl.trim() || null,
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
      const res = await api.post("/songs", payload);
      localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
      const status = res.data?.status?.toLowerCase();
      const songPath = `${slugify(artist)}/${slugify(title)}`;
      navigate(status === "approved" ? `/songs/${songPath}` : `/drafts/${songPath}`);
    } catch (err) {
      if (!applyApiError(err)) {
        setFieldError("title", "Nie udało się dodać piosenki.");
      }
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

          <Form onSubmit={handleSubmit} noValidate>
            <SongSuggestField
              label="Tytuł"
              field="title"
              value={title}
              onChange={(v) => {
                clearErrors();
                setTitle(v);
              }}
              onPick={handleSuggestPick}
              required
              placeholder="Tytuł"
              error={getError("title")}
            />

            <SongSuggestField
              label="Wykonawca"
              field="artist"
              value={artist}
              onChange={(v) => {
                clearErrors();
                setArtist(v);
              }}
              onPick={handleSuggestPick}
              required
              placeholder="Wykonawca"
              error={getError("artist")}
            />

            <FormField label="Kategoria" error={getError("categoryId")}>
              <Form.Select
                value={categoryId}
                onChange={(e) => {
                  clearErrors();
                  setCategoryId(e.target.value);
                }}
                required
                {...controlProps("categoryId")}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </FormField>

            <FormField label="Link do YouTube (opcjonalnie)" error={getError("youTubeUrl")}>
              <Form.Control
                type="url"
                {...bindText("youTubeUrl", youTubeUrl, setYouTubeUrl)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </FormField>

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
              <Form.Group className="mb-3">
                <Form.Label>Treść i akordy</Form.Label>
                <ChordLyricsEditor
                  value={chordEditorText}
                  onChange={(v) => {
                    clearErrors();
                    setChordEditorText(v);
                  }}
                  allChords={allChords}
                  required
                  isInvalid={Boolean(getError("content"))}
                  error={getError("content")}
                />
              </Form.Group>
            ) : (
              <>
                <Form.Group className="mb-2">
                  <Form.Label>Edytor tabulatury</Form.Label>
                  <VersionContentEditor
                    versionType="tab"
                    value={tabContent}
                    onChange={(v) => {
                      clearErrors();
                      setTabContent(v);
                    }}
                    rows={10}
                    required
                    isInvalid={Boolean(getError("content"))}
                    error={getError("content")}
                  />
                </Form.Group>
                <div className="small text-muted mt-1 mb-3">
                  Pisz ręcznie albo klikaj skróty. Najlepiej 1 takt na linię dla czytelności.
                </div>
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

      {/* Modal: potwierdzenie opuszczenia formularza */}
      <Modal show={blocker.state === "blocked"} onHide={() => blocker.reset()} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Opuścić formularz?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Masz niezapisane zmiany. Jeśli opuścisz tę stronę, dane zostaną utracone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => blocker.reset()}>
            Zostań
          </Button>
          <Button variant="danger" size="sm" onClick={() => blocker.proceed()}>
            Opuść
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AddSong;