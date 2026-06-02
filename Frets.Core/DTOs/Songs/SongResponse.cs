namespace Frets.Core.DTOs.Songs;

public record SongResponse(
    Guid Id,
    string Title,
    string Artist,
    string? Genre,
    string Status,
    string AuthorUsername,
    DateTime? SubmittedAt,
    int PositiveVoteWeight = 0,
    int NegativeVoteWeight = 0,
    bool? UserVoteIsPositive = null
);