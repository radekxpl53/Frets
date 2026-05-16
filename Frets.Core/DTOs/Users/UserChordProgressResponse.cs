namespace Frets.Core.DTOs.Users;

public record UserChordProgressResponse(
    Guid ChordId,
    string Key,
    string Suffix,
    string MasteryLevel,
    DateTime FirstSeenAt,
    DateTime? LastPracticed
);