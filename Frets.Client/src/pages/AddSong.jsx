import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Container, Form, Spinner } from "react-bootstrap";
import api from "../api/client";
import ChordLyricsEditor from "../components/ChordLyricsEditor";
import VersionContentEditor from "../components/VersionContentEditor";
import { buildChordJsonFromEditorText } from "../utils/chordEditorUtils";

const DRAFT_KEY = "frets:add-song:draft:v1";

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
  const [allChords, setAllChords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tunings, setTunings] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const content =
      versionType === "chords" ? buildChordJsonFromEditorText(chordEditorText, allChords) : tabContent;

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
              <Form.Group className="mb-3">
                <Form.Label>Treść i akordy</Form.Label>
                <ChordLyricsEditor
                  value={chordEditorText}
                  onChange={setChordEditorText}
                  allChords={allChords}
                  required
                />
              </Form.Group>
            ) : (
              <>
                <Form.Group className="mb-2">
                  <Form.Label>Edytor tabulatury</Form.Label>
                  <VersionContentEditor
                    versionType="tab"
                    value={tabContent}
                    onChange={setTabContent}
                    rows={10}
                    required
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
    </Container>
  );
}

export default AddSong;