export function normalizeFeedItem(raw) {
  if (!raw) return null;
  return {
    kind: raw.kind ?? raw.Kind ?? "",
    songId: raw.songId ?? raw.SongId,
    title: raw.title ?? raw.Title ?? "",
    artist: raw.artist ?? raw.Artist ?? "",
    artistSlug: raw.artistSlug ?? raw.ArtistSlug ?? "",
    titleSlug: raw.titleSlug ?? raw.TitleSlug ?? "",
    songStatus: raw.songStatus ?? raw.SongStatus ?? "",
    authorUsername: raw.authorUsername ?? raw.AuthorUsername ?? "",
    sortDate: raw.sortDate ?? raw.SortDate,
    positiveVoteWeight: raw.positiveVoteWeight ?? raw.PositiveVoteWeight ?? 0,
    negativeVoteWeight: raw.negativeVoteWeight ?? raw.NegativeVoteWeight ?? 0,
    userVoteIsPositive: raw.userVoteIsPositive ?? raw.UserVoteIsPositive ?? null,
    suggestionId: raw.suggestionId ?? raw.SuggestionId,
    suggestionStatus: raw.suggestionStatus ?? raw.SuggestionStatus,
    comment: raw.comment ?? raw.Comment,
    versionType: raw.versionType ?? raw.VersionType,
  };
}
