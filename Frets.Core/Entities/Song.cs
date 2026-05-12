namespace Frets.Core.Entities;

public class Song
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Genre { get; set; }
    public string Status { get; set; } = "draft";
    public DateTime? SubmittedAt { get; set; }
    public DateTime? StatusChangedAt { get; set; }

    public Guid AuthorId { get; set; }
    public Guid? StatusChangedBy { get; set; }

    public Guid ArtistId { get; set; }
    public Artist Artist { get; set; } = null!;
    public string TitleSlug { get; set; } = string.Empty;

    public User Author { get; set; } = null!;
    public User? StatusChangedByUser { get; set; }
    public ICollection<SongVersion> Versions { get; set; } = [];
    public ICollection<SongVote> Votes { get; set; } = [];
}