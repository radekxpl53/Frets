namespace Frets.Core.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "user";
    public DateTime CreatedAt { get; set; }

    public int Xp { get; set; }
    public int Level { get; set; } = 1;
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateOnly? LastActivityDate { get; set; }

    public ICollection<Song> Songs { get; set; } = [];
    public ICollection<SongVote> SongVotes { get; set; } = [];
    public ICollection<XpEvent> XpEvents { get; set; } = [];
    public ICollection<UserChordProgress> ChordProgress { get; set; } = [];

    public ICollection<VersionSuggestion> VersionSuggestions { get; set; } = [];
    public ICollection<SuggestionVote> SuggestionVotes { get; set; } = [];
}