import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import api from "../api/client";
import { formatVoteCounts } from "../components/VotePanel";
import slugify from "../utils/slugify";

function Drafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchDrafts = async (searchTerm = "") => {
    setLoading(true);
    setError("");
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const res = await api.get("/songs/drafts", { params });
      setDrafts(res.data ?? []);
    } catch (err) {
      const message =
        typeof err.response?.data === "string"
          ? err.response.data
          : "Nie udało się pobrać szkiców.";
      setError(message);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrafts(search);
  };

  const statusVariant = (status) => {
    if (status === "pending") return "warning";
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "secondary";
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Szkice piosenek</h2>

      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col>
            <Form.Control
              type="text"
              placeholder="Szukaj szkiców po tytule lub artyście..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs="auto">
            <Button type="submit">Szukaj</Button>
          </Col>
        </Row>
      </Form>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : drafts.length === 0 ? (
        <p className="text-muted">Brak szkiców.</p>
      ) : (
        <Row>
          {drafts.map((song) => (
            <Col md={6} lg={4} key={song.id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>
                    <Link
                      to={`/drafts/${slugify(song.artist)}/${slugify(song.title)}`}
                      className="text-decoration-none"
                    >
                      {song.title}
                    </Link>
                  </Card.Title>
                  <Card.Subtitle className="text-muted mb-2">{song.artist}</Card.Subtitle>
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <Badge bg={statusVariant(song.status)}>{song.status}</Badge>
                    <Badge bg="light" text="dark" className="fw-normal">
                      {formatVoteCounts(song.positiveVoteWeight, song.negativeVoteWeight)}
                    </Badge>
                  </div>
                  <small className="text-muted">Autor: {song.authorUsername}</small>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Drafts;
