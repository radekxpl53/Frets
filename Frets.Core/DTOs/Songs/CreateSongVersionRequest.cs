namespace Frets.Core.DTOs.Songs;

public record CreateSongVersionRequest(
    string VersionType,  // chords | tab
    Guid TuningId,
    string? Key,
    int Capo,
    string Content
);