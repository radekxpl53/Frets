namespace Frets.Core.Entities;

public class UserChordProgress
{
    public Guid Id { get; set; }
    public string MasteryLevel { get; set; } = "new";
    public DateTime FirstSeenAt { get; set; }
    public DateTime? LastPracticed { get; set; }

    public Guid UserId { get; set; }
    public Guid ChordId { get; set; }

    public User User { get; set; } = null!;
    public Chord Chord { get; set; } = null!;
}