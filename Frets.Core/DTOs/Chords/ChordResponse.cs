namespace Frets.Core.DTOs.Chords;

public record ChordResponse(
    Guid Id,
    string Key,
    string Suffix
);