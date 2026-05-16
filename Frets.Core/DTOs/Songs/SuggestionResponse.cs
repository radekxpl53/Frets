namespace Frets.Core.DTOs.Songs;

public record SuggestionResponse(
    Guid Id,
    string Content,
    string Status,
    string? Comment,
    string AuthorUsername,
    DateTime CreatedAt
);