import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Container, Row, Col, Card, Form, Button, Spinner, Badge,
} from "react-bootstrap";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { plChord, plDay, plSong } from "../utils/pluralize";

// ─── Progi XP dla 10 poziomów (z zał. projektu: 0–5000) ─────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2400, 3300, 5000];

function xpProgress(xp, level) {
  const from = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const to   = LEVEL_THRESHOLDS[level]     ?? 5000;
  return Math.min(100, Math.round(((xp - from) / (to - from)) * 100));
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ę/g, "e").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ł/g, "l").replace(/ż/g, "z")
    .replace(/ź/g, "z").replace(/ć/g, "c").replace(/ń/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Widget statystyk zalogowanego ────────────────────────────────────────────

function UserStats({ user }) {
  const pct = xpProgress(user.xp, user.level);
  return (
    <div className="border rounded-3 p-3 mb-4 bg-light">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <div>
          <span className="fw-semibold">{user.username}</span>
          <span className="text-muted ms-2" style={{ fontSize: "0.9rem" }}>
            Poziom {user.level} · {user.levelLabel}
          </span>
        </div>
        <span className="text-muted" style={{ fontSize: "0.85rem" }}>
          {user.xp} XP
        </span>
      </div>

      {/* pasek XP */}
      <div
        className="mb-3 rounded-pill overflow-hidden"
        style={{ height: 6, background: "#dee2e6" }}
      >
        <div
          className="h-100 bg-primary rounded-pill"
          style={{ width: `${pct}%`, transition: "width 0.4s ease" }}
        />
      </div>

      {/* kafelki statystyk */}
      <Row className="g-2 text-center">
        <Col xs={4}>
          <div className="border rounded-2 py-2 bg-white">
            <div className="fw-bold">
              <i className="bi bi-fire text-warning me-1" />
              {user.currentStreak}
            </div>
            <small className="text-muted">{plDay(user.currentStreak).split(" ").slice(1).join(" ")}</small>
          </div>
        </Col>
        <Col xs={4}>
          <div className="border rounded-2 py-2 bg-white">
            <div className="fw-bold">
              <i className="bi bi-music-note-beamed text-primary me-1" />
              {user.chordsLearned ?? 0}
            </div>
            <small className="text-muted">{plChord(user.chordsLearned ?? 0).split(" ").slice(1).join(" ")}</small>
          </div>
        </Col>
        <Col xs={4}>
          <div className="border rounded-2 py-2 bg-white">
            <div className="fw-bold">
              <i className="bi bi-vinyl text-secondary me-1" />
              {user.songsAdded ?? 0}
            </div>
            <small className="text-muted">{plSong(user.songsAdded ?? 0).split(" ").slice(1).join(" ")}</small>
          </div>
        </Col>
      </Row>
    </div>
  );
}

// ─── Karta piosenki ───────────────────────────────────────────────────────────

function SongCard({ song }) {
  const href = `/songs/${song.artistSlug ?? slugify(song.artist)}/${slugify(song.title)}`;
  return (
    <Card className="h-100">
      <Card.Body className="d-flex flex-column">
        <Card.Title className="mb-1" style={{ fontSize: "1rem" }}>
          <Link to={href} className="text-decoration-none stretched-link">
            {song.title}
          </Link>
        </Card.Title>
        <Card.Subtitle className="text-muted mb-2" style={{ fontSize: "0.85rem" }}>
          {song.artist}
        </Card.Subtitle>
        <div className="mt-auto d-flex align-items-center gap-2 flex-wrap">
          {song.genre && (
            <Badge bg="light" text="secondary" className="border">
              {song.genre}
            </Badge>
          )}
          {song.positiveVoteWeight > 0 && (
            <span className="text-muted ms-auto" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-hand-thumbs-up me-1" />
              {song.positiveVoteWeight}
            </span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

// ─── Strona główna ────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();

  const [songs,         setSongs]         = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [activeGenre,   setActiveGenre]   = useState("");
  const [playableOnly,  setPlayableOnly]  = useState(false);
  const [playableCount, setPlayableCount] = useState(null);

  // ładowanie kategorii przy starcie
  useEffect(() => {
    api.get("/songs/meta")
      .then((res) => setCategories(res.data.categories ?? []))
      .catch(() => {});
  }, []);

  // pobieranie piosenek
  const fetchSongs = useCallback(async (searchTerm, genre, playable) => {
    setLoading(true);
    try {
      if (playable) {
        const res = await api.get("/users/me/songs");
        setSongs(res.data ?? []);
      } else {
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (genre)      params.genre  = genre;
        const res = await api.get("/songs", { params });
        setSongs(res.data);
      }
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // liczba piosenek do zagrania (tylko dla zalogowanych)
  useEffect(() => {
    if (!user) { setPlayableCount(null); return; }
    api.get("/users/me/songs")
      .then((res) => setPlayableCount(res.data?.length ?? 0))
      .catch(() => setPlayableCount(null));
  }, [user]);

  useEffect(() => {
    fetchSongs("", "", false);
  }, [fetchSongs]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSongs(search, activeGenre, playableOnly);
  };

  const handleGenre = (slug) => {
    setActiveGenre(slug);
    fetchSongs(search, slug, playableOnly);
  };

  const togglePlayable = () => {
    const next = !playableOnly;
    setPlayableOnly(next);
    setActiveGenre("");
    setSearch("");
    fetchSongs("", "", next);
  };

  return (
    <Container className="mt-4">

      {/* Statystyki zalogowanego */}
      {user && <UserStats user={user} />}

      {/* Nagłówek + przycisk */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h2 className="mb-0">Piosenki</h2>
        {user && (
          <Button as={Link} to="/songs/add" variant="primary" size="sm">
            <i className="bi bi-plus-lg me-1" />
            Dodaj piosenkę
          </Button>
        )}
      </div>

      {/* Wyszukiwarka */}
      <Form onSubmit={handleSearch} className="mb-3">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Szukaj po tytule lub artyście…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline-primary" style={{ whiteSpace: "nowrap" }}>
            <i className="bi bi-search me-1" />
            Szukaj
          </Button>
        </div>
      </Form>

      {/* Filtry: "Mogę zagrać" + gatunki */}
      {(categories.length > 0 || (user && playableCount !== null)) && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {user && playableCount !== null && (
            <Button
              size="sm"
              variant={playableOnly ? "success" : "outline-success"}
              onClick={togglePlayable}
              title="Piosenki zawierające tylko Twoje opanowane akordy"
            >
              {`Mogę zagrać${playableCount > 0 ? ` (${playableCount})` : ""}`}
            </Button>
          )}
          {!playableOnly && categories.length > 0 && (
            <>
              <Button
                size="sm"
                variant={activeGenre === "" ? "dark" : "outline-secondary"}
                onClick={() => handleGenre("")}
              >
                Wszystkie
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={activeGenre === cat.slug ? "dark" : "outline-secondary"}
                  onClick={() => handleGenre(cat.slug)}
                >
                  {cat.name}
                </Button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Lista piosenek */}
      {loading ? (
        <div className="text-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : songs.length === 0 ? (
        <div className="text-center text-muted mt-5">
          <i className="bi bi-music-note-list" style={{ fontSize: "2rem" }} />
          <p className="mt-2">Brak piosenek spełniających kryteria.</p>
          {(search || activeGenre) && (
            <Button variant="outline-secondary" size="sm" onClick={() => {
              setSearch("");
              setActiveGenre("");
              fetchSongs("", "");
            }}>
              Wyczyść filtry
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
            {songs.length} {songs.length === 1 ? "piosenka" : "piosenek"}
            {activeGenre && ` · ${categories.find((c) => c.slug === activeGenre)?.name}`}
          </p>
          <Row className="g-3">
            {songs.map((song) => (
              <Col md={6} lg={4} key={song.id}>
                <SongCard song={song} />
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
}
