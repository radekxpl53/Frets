namespace Frets.Core.Entities;

public class VersionTab
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;

    public Guid VersionId { get; set; }

    public SongVersion SongVersion { get; set; } = null!;
}