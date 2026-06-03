import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Alert, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import api from "../api/client";
import EntityAvatar from "../components/EntityAvatar";
import slugify from "../utils/slugify";

export default function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        document.title = "Artyści | Frets";
        const res = await api.get("/artists");
        setArtists(res.data ?? []);
      } catch {
        setError("Nie udało się pobrać listy artystów.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return artists
      .filter((a) => a.songCount > 0)
      .filter((a) =>
        search.trim() === "" ||
        a.name.toLowerCase().includes(search.trim().toLowerCase())
      );
  }, [artists, search]);

  return (
    <Container className="mt-4">
      <h2 className="mb-1">Artyści</h2>
      <p className="text-muted mb-3">
        Przeglądaj artystów i ich opublikowane piosenki.
      </p>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Wyszukiwarka */}
      <Form.Control
        type="search"
        placeholder="Szukaj artysty…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
        style={{ maxWidth: 320 }}
      />

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted">
          {search ? "Brak artystów pasujących do wyszukiwania." : "Brak artystów w bazie."}
        </p>
      ) : (
        <Row>
          {filtered.map((artist) => (
            <Col key={artist.id} sm={6} md={4} lg={3} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body className="text-center d-flex flex-column align-items-center position-relative">
                  <EntityAvatar imageUrl={artist.imageUrl} size={88} className="mb-3" />
                  <Card.Title className="fs-6 mb-1">
                    <Link
                      to={`/artists/${artist.slug || slugify(artist.name)}`}
                      className="text-decoration-none stretched-link"
                    >
                      {artist.name}
                    </Link>
                  </Card.Title>
                  <Card.Text className="text-muted small mb-0">
                    {artist.songCount === 1
                      ? "1 piosenka"
                      : artist.songCount >= 2 && artist.songCount <= 4
                      ? `${artist.songCount} piosenki`
                      : `${artist.songCount} piosenek`}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
