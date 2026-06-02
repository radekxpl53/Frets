namespace Frets.Core.Entities;

public class ArtistImage
{
    public Guid ArtistId { get; set; }
    public Guid ImageId { get; set; }

    public Artist Artist { get; set; } = null!;
    public Image Image { get; set; } = null!;
}
