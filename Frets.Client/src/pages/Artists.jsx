import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import api from "../api/client";
import EntityAvatar from "../components/EntityAvatar";
import slugify from "../utils/slugify";

function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
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

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Artyści</h2>
      <p className="text-muted mb-4">Przeglądaj artystów i ich opublikowane piosenki w Frets.</p>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : artists.length === 0 ? (
        <p className="text-muted">Brak artystów w bazie.</p>
      ) : (
        <Row>
          {artists.map((artist) => (
            <Col key={artist.id} sm={6} md={4} lg={3} className="mb-4">
              <Card className="h-100 shadow-sm artist-tile">
                <Card.Body className="text-center d-flex flex-column align-items-center position-relative">
                  <EntityAvatar imageUrl={artist.imageUrl} variant="artist" size={88} className="mb-3" />
                  <Card.Title className="fs-6 mb-1">
                    <Link
                      to={`/artists/${artist.slug || slugify(artist.name)}`}
                      className="text-decoration-none stretched-link"
                    >
                      {artist.name}
                    </Link>
                  </Card.Title>
                  <Card.Text className="text-muted small mb-0">
                    {artist.songCount} {artist.songCount === 1 ? "piosenka" : "piosenek"}
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

export default Artists;
