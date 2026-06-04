import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Container, Row, Col, Card, Form, Button, Badge,
} from "react-bootstrap";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { plChord, plDay, plSong } from "../../utils/pluralize";
import EmptyState from "../../components/EmptyState";
import EntityAvatar from "../../components/EntityAvatar";
import PageHeader from "../../components/PageHeader";
import SkeletonCard from "../../components/SkeletonCard";
import heroImg from "../../assets/music-note.svg";
import { usePageTitle } from "../../hooks/usePageTitle";
import styles from "./Home.module.css";

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
  const nextThreshold = LEVEL_THRESHOLDS[user.level] ?? null;
  const toNext = nextThreshold != null ? Math.max(0, nextThreshold - user.xp) : null;
  return (
    <div className={`${styles.statsWidget} mb-4`}>
      <div className="d-flex align-items-center gap-3 mb-3">
        <EntityAvatar imageUrl={user.imageUrl} size={54} />
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-semibold fs-5">Cześć, {user.username}!</span>
            <span className={styles.levelBadge}>Poziom {user.level}</span>
          </div>
          <div className="text-muted small">{user.levelLabel}</div>
        </div>
        <div className="text-end" style={{ whiteSpace: "nowrap" }}>
          <div className="fw-bold">{user.xp} XP</div>
          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
            {toNext != null ? `${toNext} XP do awansu` : "Maks. poziom"}
          </div>
        </div>
      </div>

      {/* pasek XP */}
      <div className={styles.xpBar}>
        <div className={styles.xpBarFill} style={{ width: `${pct}%` }} />
      </div>

      {/* kafelki statystyk */}
      <Row className="g-2">
        <Col xs={4}>
          <div className={styles.statTile}>
            <div className={styles.statValue}>
              <i className="bi bi-fire text-warning me-1" style={{ fontSize: "1rem" }} />
              {user.currentStreak}
            </div>
            <div className={styles.statLabel}>{plDay(user.currentStreak).split(" ").slice(1).join(" ")}</div>
          </div>
        </Col>
        <Col xs={4}>
          <div className={styles.statTile}>
            <div className={styles.statValue}>
              <i className="bi bi-music-note-beamed me-1" style={{ fontSize: "1rem", color: "var(--frets-accent-light)" }} />
              {user.chordsLearned ?? 0}
            </div>
            <div className={styles.statLabel}>{plChord(user.chordsLearned ?? 0).split(" ").slice(1).join(" ")}</div>
          </div>
        </Col>
        <Col xs={4}>
          <div className={styles.statTile}>
            <div className={styles.statValue}>
              <i className="bi bi-vinyl me-1" style={{ fontSize: "1rem", color: "var(--frets-text-muted)" }} />
              {user.songsAdded ?? 0}
            </div>
            <div className={styles.statLabel}>{plSong(user.songsAdded ?? 0).split(" ").slice(1).join(" ")}</div>
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
    <Card className={`h-100 ${styles.songCard}`}>
      <Card.Body className="d-flex align-items-center gap-3">
        <EntityAvatar imageUrl={song.artistImageUrl} size={46} />
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <Link to={href} className={`stretched-link d-block text-truncate ${styles.songTitle}`}>
            {song.title}
          </Link>
          <div className={`text-truncate ${styles.songArtist}`}>{song.artist}</div>
          <div className="d-flex align-items-center gap-2 mt-2">
            {song.genre && (
              <Badge bg="secondary">
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
        </div>
      </Card.Body>
    </Card>
  );
}

// ─── Strona główna ────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  usePageTitle("Piosenki");

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

      {/* Hero dla niezalogowanych */}
      {!user && (
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>Frets</span>
            <h1 className={styles.heroTitle}>
              Akordy i tabulatury,{" "}
              <span className={styles.heroAccent}>gotowe do grania</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Przeglądaj piosenki, ucz się akordów, nastrój gitarę i śledź swoje
              postępy — wszystko w jednym miejscu.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <Button as={Link} to="/register" variant="primary" size="lg">
                Załóż konto za darmo
              </Button>
              <Button as={Link} to="/chords" variant="outline-primary" size="lg">
                <i className="bi bi-music-note-beamed me-1" />
                Przeglądaj akordy
              </Button>
            </div>
          </div>
          <img src={heroImg} alt="" className={styles.heroImg} />
        </div>
      )}

      {/* Statystyki zalogowanego */}
      {user && <UserStats user={user} />}

      {/* Nagłówek + przycisk */}
      <PageHeader
        title="Piosenki"
        className="mb-3"
        actions={
          user && (
            <Button as={Link} to="/songs/add" variant="primary" size="sm">
              <i className="bi bi-plus-lg me-1" />
              Dodaj piosenkę
            </Button>
          )
        }
      />

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
        <Row className="g-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Col md={6} lg={4} key={i}>
              <SkeletonCard />
            </Col>
          ))}
        </Row>
      ) : songs.length === 0 ? (
        <EmptyState icon="bi-music-note-list" title="Brak piosenek spełniających kryteria.">
          {(search || activeGenre) && (
            <Button variant="outline-secondary" size="sm" onClick={() => {
              setSearch("");
              setActiveGenre("");
              fetchSongs("", "");
            }}>
              Wyczyść filtry
            </Button>
          )}
        </EmptyState>
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
