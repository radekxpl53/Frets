namespace Frets.Core.DTOs.Songs;

public record CreateSuggestionRequest(
    string Content,
    string? Comment
);