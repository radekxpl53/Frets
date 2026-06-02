namespace Frets.Core.DTOs.Users;

public record PublicUserProfileResponse(
    string Username,
    string Slug,
    int Level,
    string LevelLabel,
    int CurrentStreak,
    int LongestStreak,
    int ChordsLearned,
    int SongsAdded,
    DateTime CreatedAt,
    string? Bio = null,
    string? ImageUrl = null
);