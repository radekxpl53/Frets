namespace Frets.Core.DTOs.Users;

public record PublicUserProfileResponse(
    string Username,
    int Level,
    string LevelLabel,
    int CurrentStreak,
    int LongestStreak,
    int ChordsLearned,
    int SongsAdded,
    DateTime CreatedAt
);