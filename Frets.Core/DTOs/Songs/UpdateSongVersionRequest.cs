namespace Frets.Core.DTOs.Songs;

public record UpdateSongVersionRequest(
    string? Tuning,
    string? Key,
    int? Capo,
    string? Content
);