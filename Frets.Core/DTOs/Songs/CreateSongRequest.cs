namespace Frets.Core.DTOs.Songs;

public record CreateSongRequest(
    string Title,
    string Artist,
    string? Genre
);