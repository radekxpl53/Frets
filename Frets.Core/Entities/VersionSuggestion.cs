namespace Frets.Core.Entities;

public class VersionSuggestion
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }

    // Klucze obce
    public Guid VersionId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid? ReviewedBy { get; set; }

    // Nawigacja
    public SongVersion SongVersion { get; set; } = null!;
    public User Author { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
    public ICollection<SuggestionVote> Votes { get; set; } = [];
}