namespace Frets.Core.DTOs.Songs;

public record UpdateSongRequest(
    string? Title,
    string? Genre
);