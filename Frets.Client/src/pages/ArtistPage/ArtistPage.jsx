import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Card, Col, Container, ListGroup, Row, Spinner } from "react-bootstrap";
import api from "../../api/client";
import EntityAvatar from "../../components/EntityAvatar";
import slugify from "../../utils/slugify";

function ArtistPage() {
  const { slug } = useParams();
  const [artist, setArtist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/artists/${slug}`);
        setArtist(res.data.artist);
        setSongs(res.data.songs ?? []);
      } catch {
        setError("Nie znaleziono artysty.");
        setArtist(null);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !artist) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error || "Nie znaleziono artysty."}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col xs="auto">
              <EntityAvatar imageUrl={artist.imageUrl} size={120} />
            </Col>
            <Col>
              <h2 className="mb-1">{artist.name}</h2>
              <p className="text-muted mb-0">
                {artist.songCount} {artist.songCount === 1 ? "opublikowana piosenka" : "opublikowanych piosenek"}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <h5 className="mb-3">Piosenki</h5>
      {songs.length === 0 ? (
        <p className="text-muted">Brak opublikowanych piosenek tego artysty.</p>
      ) : (
        <ListGroup>
          {songs.map((song) => (
            <ListGroup.Item
              key={song.id}
              action
              as={Link}
              to={`/songs/${slug}/${slugify(song.title)}`}
              className="d-flex justify-content-between align-items-center"
            >
              <span className="fw-medium">{song.title}</span>
              {song.genre && <span className="text-muted small">{song.genre}</span>}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Container>
  );
}

export default ArtistPage;
