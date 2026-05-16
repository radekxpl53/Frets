namespace Frets.Core.DTOs.Users;

public record UserProfileResponse(
    Guid Id,
    string Username,
    string Email,
    string Role,
    int Xp,
    int Level,
    string LevelLabel,
    int CurrentStreak,
    int LongestStreak,
    int ChordsLearned,
    int SongsAdded,
    DateTime CreatedAt
);