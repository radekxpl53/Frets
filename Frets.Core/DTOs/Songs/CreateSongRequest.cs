namespace Frets.Core.DTOs.Songs;

public record CreateSongRequest(
    string Title,
    string Artist,
    Guid CategoryId,
    CreateSongVersionRequest? Version
);