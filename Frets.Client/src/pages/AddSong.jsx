import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import api from "../api/client";

function AddSong() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [versionType, setVersionType] = useState("chords");
  const [tuning, setTuning] = useState("standard");
  const [songKey, setSongKey] = useState("");
  const [capo, setCapo] = useState(0);
  const [content, setContent] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (content.trim()) {
      try {
        JSON.parse(content);
      } catch {
        setError("Treść nie jest poprawnym formatem JSON.");
        setLoading(false);
        return;
      }
    }

    const payload = {
      title,
      artist,
      genre: genre || null,
      version: content.trim()
        ? {
            versionType,
            tuning,
            key: songKey || null,
            capo: Number(capo),
            content,
          }
        : null,
    };

    try {
      const res = await api.post("/songs", payload);
      
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === "string" ? data : "Nie udało się dodać piosenki.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "700px" }} className="mt-4">
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
              <Form.Label>Gatunek</Form.Label>
              <Form.Control
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="np. Rock (opcjonalnie)"
              />
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
              <Form.Select value={tuning} onChange={(e) => setTuning(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="drop_d">Drop D</option>
                <option value="open_g">Open G</option>
                <option value="open_e">Open E</option>
                <option value="dadgad">DADGAD</option>
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

            <Form.Group className="mb-3">
              <Form.Label>Treść (JSON)</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "13px" }}
                placeholder='{"sections":[...]}'
              />
              <Form.Text className="text-muted">
                Format JSON z sekcjami i akordami. Edytor wizualny dodamy później.
              </Form.Text>
            </Form.Group>

            <Button type="submit" disabled={loading}>
              {loading ? "Dodawanie..." : "Dodaj piosenkę"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AddSong;