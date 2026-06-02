import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import api from "../api/client";
import { formatVoteCounts } from "../components/VotePanel";
import slugify from "../utils/slugify";
import { getApiError, getSongId } from "../utils/apiError";

function Admin() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const loadSongs = async (status) => {
    setLoading(true);
    setError("");
    try {
      const params = status ? { status } : {};
      const res = await api.get("/admin/songs", { params });
      setSongs(res.data ?? []);
    } catch (err) {
      setError(typeof err.response?.data === "string" ? err.response.data : "Nie udało się pobrać listy piosenek.");
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs(statusFilter);
  }, [statusFilter]);

  const statusVariant = (status) => {
    if (status === "pending") return "warning";
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "secondary";
  };

  const handleAction = async (song, action) => {
    const songId = getSongId(song);
    if (!songId) {
      setError("Brak identyfikatora piosenki.");
      return;
    }

    setMessage("");
    setError("");
    setActionId(songId);
    try {
      await api.post(`/admin/songs/${songId}/${action}`);
      if (action === "approve") {
        setMessage(`Zatwierdzono: ${song.title}`);
        navigate(`/songs/${slugify(song.artist)}/${slugify(song.title)}`);
        return;
      }
      setMessage(action === "reject" ? `Odrzucono: ${song.title}` : `Zaktualizowano: ${song.title}`);
      await loadSongs(statusFilter);
    } catch (err) {
      setError(getApiError(err, "Operacja nie powiodła się."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Panel administratora</h2>

      <Form.Group className="mb-3" style={{ maxWidth: "280px" }}>
        <Form.Label>Filtr statusu</Form.Label>
        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Wszystkie</option>
          <option value="draft">draft</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </Form.Select>
      </Form.Group>

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : songs.length === 0 ? (
        <p className="text-muted">Brak piosenek w tym filtrze.</p>
      ) : (
        <Row>
          {songs.map((song) => (
            <Col md={6} lg={4} key={song.id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title className="fs-6">{song.title}</Card.Title>
                  <Card.Subtitle className="text-muted mb-2">{song.artist}</Card.Subtitle>
                  <div className="d-flex gap-2 mb-2 flex-wrap">
                    <Badge bg={statusVariant(song.status)}>{song.status}</Badge>
                    <Badge bg="light" text="dark" className="fw-normal">
                      {formatVoteCounts(song.positiveVoteWeight, song.negativeVoteWeight)}
                    </Badge>
                  </div>
                  <small className="text-muted d-block mb-3">Autor: {song.authorUsername}</small>
                  <div className="d-flex gap-2 flex-wrap">
                    {(song.status === "draft" || song.status === "pending" || !song.status) && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          disabled={actionId === getSongId(song)}
                          onClick={() => handleAction(song, "approve")}
                        >
                          Zatwierdź
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          disabled={actionId === getSongId(song)}
                          onClick={() => handleAction(song, "reject")}
                        >
                          Odrzuć
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline-primary"
                      as={Link}
                      to={`/drafts/${slugify(song.artist)}/${slugify(song.title)}`}
                    >
                      Otwórz
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Admin;
