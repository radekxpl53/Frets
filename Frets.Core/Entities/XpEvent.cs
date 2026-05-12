namespace Frets.Core.Entities;

public class XpEvent
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int XpAmount { get; set; }
    public string? Meta { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;
}