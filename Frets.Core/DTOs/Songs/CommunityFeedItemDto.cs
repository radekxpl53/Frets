namespace Frets.Core.DTOs.Songs;

public record CommunityFeedItemDto(
    string Kind,
    Guid SongId,
    string Title,
    string Artist,
    string ArtistSlug,
    string TitleSlug,
    string SongStatus,
    string AuthorUsername,
    DateTime SortDate,
    int PositiveVoteWeight,
    int NegativeVoteWeight,
    bool? UserVoteIsPositive,
    Guid? SuggestionId,
    string? SuggestionStatus,
    string? Comment,
    string? VersionType
);
