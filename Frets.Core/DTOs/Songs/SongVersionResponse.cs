namespace Frets.Core.DTOs.Songs;

public record SongVersionResponse(
    Guid Id,
    string Label,
    string VersionType,
    string Tuning,
    string? Key,
    int Capo,
    string Content
);