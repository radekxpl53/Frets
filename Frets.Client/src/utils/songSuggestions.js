import api from "../api/client";

export async function fetchTitleSuggestions(query) {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await api.get("/songs/suggest/titles", { params: { search: q, limit: 10 } });
  return (res.data ?? []).map((title) => ({ title, artist: null }));
}

export async function fetchArtistSuggestions(query) {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await api.get("/artists", { params: { search: q, limit: 10 } });
  return (res.data ?? []).map((artist) => ({ title: null, artist: artist.name }));
}
