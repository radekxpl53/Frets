namespace Frets.Core.Entities;

public class Artist
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<Song> Songs { get; set; } = [];
    public ArtistImage? ArtistImage { get; set; }
}