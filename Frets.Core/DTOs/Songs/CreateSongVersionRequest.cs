namespace Frets.Core.DTOs.Songs;

public record CreateSongVersionRequest(
    string VersionType,  // chords | tab
    string Tuning,
    string? Key,
    int Capo,
    string Content
);