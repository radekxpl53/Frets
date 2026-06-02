import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import api from "../api/client";

function Home() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSongs = async (searchTerm = "") => {
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const res = await api.get("/songs", { params });
      setSongs(res.data);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSongs(search);
  };

  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/ą/g, "a").replace(/ę/g, "e").replace(/ó/g, "o")
      .replace(/ś/g, "s").replace(/ł/g, "l").replace(/ż/g, "z")
      .replace(/ź/g, "z").replace(/ć/g, "c").replace(/ń/g, "n")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Piosenki</h2>

      <div className="mb-3">
        <Button as={Link} to="/songs/add">
          Dodaj piosenkę
        </Button>
      </div>

      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col>
            <Form.Control
              type="text"
              placeholder="Szukaj po tytule lub artyście..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs="auto">
            <Button type="submit">Szukaj</Button>
          </Col>
        </Row>
      </Form>

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : songs.length === 0 ? (
        <p className="text-muted">Brak piosenek.</p>
      ) : (
        <Row>
          {songs.map((song) => (
            <Col md={6} lg={4} key={song.id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>
                    <Link
                      to={`/songs/${slugify(song.artist)}/${slugify(song.title)}`}
                      className="text-decoration-none"
                    >
                      {song.title}
                    </Link>
                  </Card.Title>
                  <Card.Subtitle className="text-muted">
                    {song.artist}
                  </Card.Subtitle>
                  {song.genre && (
                    <Card.Text className="mt-2">
                      <small className="text-muted">{song.genre}</small>
                    </Card.Text>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Home;