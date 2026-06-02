namespace Frets.Core.Entities;

public class Image
{
    public Guid Id { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? SystemKey { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ArtistImage> ArtistImages { get; set; } = [];
    public ICollection<UserProfileImage> UserProfileImages { get; set; } = [];
}
