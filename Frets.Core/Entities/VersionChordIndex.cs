namespace Frets.Core.Entities;

public class VersionChordIndex
{
    public Guid VersionId { get; set; }
    public Guid ChordId { get; set; }

    public SongVersion SongVersion { get; set; } = null!;
    public Chord Chord { get; set; } = null!;
}