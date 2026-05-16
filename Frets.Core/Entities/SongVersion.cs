using Frets.Core.Entities;

public class SongVersion
{
    public Guid Id { get; set; }
    public string VersionType { get; set; } = string.Empty;
    public string Tuning { get; set; } = "standard";
    public string? Key { get; set; }
    public int Capo { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guid SongId { get; set; }

    public Song Song { get; set; } = null!;
    public VersionChords? VersionChords { get; set; }
    public VersionTab? VersionTab { get; set; }
    public ICollection<VersionChordIndex> ChordIndex { get; set; } = [];
}