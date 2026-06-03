import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button, ButtonGroup, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import api from "../../api/client";
import { formatVoteCounts } from "../../components/VotePanel";
import slugify from "../../utils/slugify";
import { normalizeFeedItem } from "../../utils/feedItem";

const FILTERS = [
  { id: "all", label: "Wszystkie" },
  { id: "songs", label: "Nowe piosenki" },
  { id: "changes", label: "Zmiany" },
];

function feedItemPath(item) {
  const artist = item.artistSlug || slugify(item.artist);
  const title = item.titleSlug || slugify(item.title);
  const isApproved = (item.songStatus ?? "").toLowerCase() === "approved";

  if (item.kind === "song") {
    return `/drafts/${artist}/${title}`;
  }

  const type = item.versionType || "chords";
  const base = isApproved ? "/songs" : "/drafts";
  return `${base}/${artist}/${title}/suggestions?type=${type}`;
}

function feedItemKindLabel(item) {
  if (item.kind === "song") return "Nowa piosenka";
  const type = item.versionType === "tab" ? "tabulatura" : "akordy";
  return `Poprawka (${type})`;
}

function Drafts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchFeed = async (searchTerm = "", activeFilter = filter) => {
    setLoading(true);
    setError("");
    try {
      const params = { filter: activeFilter };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.get("/suggestions/feed", { params });
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list.map(normalizeFeedItem).filter(Boolean));
    } catch (err) {
      const status = err.response?.status;
      let message = "Nie udało się pobrać listy.";
      if (status === 404) {
        message = "Brak endpointu /suggestions/feed — zrestartuj API (dotnet run).";
      } else if (typeof err.response?.data === "string") {
        message = err.response.data;
      } else if (err.response?.data?.title) {
        message = err.response.data.title;
      }
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed("", filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFeed(search);
  };

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
  };

  const statusVariant = (status) => {
    const s = (status ?? "").toLowerCase();
    if (s === "pending") return "warning";
    if (s === "approved") return "success";
    if (s === "rejected") return "danger";
    return "secondary";
  };

  const emptyMessage =
    filter === "songs"
      ? "Brak nowych piosenek do przeglądu."
      : filter === "changes"
        ? "Brak poprawek do przeglądu."
        : "Brak opracowań ani poprawek do przeglądu.";

  return (
    <Container className="mt-4">
      <h2 className="mb-1">Opracowania</h2>
      <p className="text-muted mb-3">
        Przeglądaj nowe piosenki czekające na publikację oraz poprawki do istniejących wersji.
      </p>

      <ButtonGroup className="mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "primary" : "outline-primary"}
            onClick={() => handleFilterChange(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </ButtonGroup>

      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col>
            <Form.Control
              type="text"
              placeholder="Szukaj po tytule, artyście lub komentarzu..."
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
      ) : items.length === 0 ? (
        <p className="text-muted">{emptyMessage}</p>
      ) : (
        <Row>
          {items.map((item) => {
            const status = item.kind === "song" ? item.songStatus : item.suggestionStatus;
            const key = item.kind === "song" ? `song-${item.songId}` : `change-${item.suggestionId}`;

            return (
              <Col md={6} lg={4} key={key} className="mb-3">
                <Card className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <Badge bg={item.kind === "song" ? "info" : "secondary"}>
                        {feedItemKindLabel(item)}
                      </Badge>
                      {status && (
                        <Badge bg={statusVariant(status)}>{status}</Badge>
                      )}
                    </div>
                    <Card.Title>
                      <Link to={feedItemPath(item)} className="text-decoration-none">
                        {item.title}
                      </Link>
                    </Card.Title>
                    <Card.Subtitle className="text-muted mb-2">{item.artist}</Card.Subtitle>
                    {item.kind === "change" && item.comment && (
                      <Card.Text className="small text-muted mb-2 text-truncate">
                        {item.comment}
                      </Card.Text>
                    )}
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap mt-auto">
                      <Badge bg="light" text="dark" className="fw-normal">
                        {formatVoteCounts(item.positiveVoteWeight, item.negativeVoteWeight)}
                      </Badge>
                    </div>
                    <small className="text-muted">Autor: {item.authorUsername}</small>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}

export default Drafts;
