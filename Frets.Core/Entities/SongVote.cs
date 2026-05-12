namespace Frets.Core.Entities;

public class SongVote
{
    public Guid Id { get; set; }
    public bool IsPositive { get; set; }
    public int VoteWeight { get; set; } = 1;
    public DateTime VotedAt { get; set; }

    public Guid SongId { get; set; }
    public Guid UserId { get; set; }

    public Song Song { get; set; } = null!;
    public User User { get; set; } = null!;
}